import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GiftSuggestionRequest {
  personId: string;
  eventType: string;
  budget: number;
  additionalContext?: string;
}

interface GiftSuggestion {
  title: string;
  description: string;
  estimatedPrice: number;
  confidence: number;
  reasoning: string;
  category: string;
  alternatives: string[];
  purchaseLinks: string[];
  brand?: string;
  amazonData?: {
    asin?: string;
    rating?: number;
    reviewCount?: number;
    availability?: string;
    prime?: boolean;
    actualPrice?: number;
    imageUrl?: string;
    productUrl?: string;
    addToCartUrl?: string;
    searchUrl?: string;
    matchType?: 'exact' | 'relaxed' | 'search';
  };
}

// Generate gift suggestions with OpenAI
async function generateGiftSuggestions(prompt: string): Promise<GiftSuggestion[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('🤖 Generating gift suggestions with OpenAI...');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        max_completion_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en cadeaux qui génère des suggestions personnalisées avec des liens Amazon directs.

IMPORTANT: Pour chaque suggestion, tu DOIS fournir des liens Amazon France fonctionnels :
- Un lien produit direct (format: https://www.amazon.fr/dp/ASIN)
- Un lien "Ajouter au panier" (format: https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=ASIN&Quantity.1=1)

Utilise des ASINs Amazon France réels existants correspondant aux produits suggérés.

Réponds UNIQUEMENT avec un JSON valide contenant un array "suggestions" avec cette structure exacte :
{
  "suggestions": [
    {
      "title": "Nom exact du produit",
      "description": "Description détaillée du produit et pourquoi c'est un bon choix",
      "estimatedPrice": 45,
      "confidence": 0.85,
      "reasoning": "Explication personnalisée basée sur le profil de la personne",
      "category": "Catégorie du produit",
      "alternatives": ["Alternative 1", "Alternative 2"],
      "purchaseLinks": [
        "https://www.amazon.fr/dp/ASIN_REEL",
        "https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=ASIN_REEL&Quantity.1=1"
      ],
      "brand": "Nom de la marque",
      "amazonData": {
        "asin": "ASIN_REEL",
        "productUrl": "https://www.amazon.fr/dp/ASIN_REEL",
        "addToCartUrl": "https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=ASIN_REEL&Quantity.1=1",
        "matchType": "exact"
      }
    }
  ]
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('🤖 OpenAI response received, parsing JSON...');
    
    try {
      const parsed = JSON.parse(content);
      return parsed.suggestions || [];
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }
    
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

// Calculate age from birthday
function calculateAge(birthday: string): number {
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personId, eventType, budget, additionalContext } = await req.json() as GiftSuggestionRequest;
    
    console.log('🔍 Request received:', { personId, eventType, budget, additionalContext });
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    console.log('🔗 Supabase config:', { 
      url: supabaseUrl ? 'SET' : 'MISSING', 
      key: supabaseKey ? 'SET' : 'MISSING' 
    });
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch person data
    console.log(`🔍 Fetching person with ID: ${personId}`);
    const { data: person, error: personError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .single();

    console.log('📊 Person query result:', { person, error: personError });

    if (personError) {
      console.error('❌ Error fetching person:', personError);
      throw new Error(`Person query failed: ${personError.message}`);
    }

    if (!person) {
      console.error('❌ Person is null');
      throw new Error('Person not found');
    }

    console.log(`🎁 Generating suggestions for ${person.name}, event: ${eventType}, budget: €${budget}`);

    // Calculate person's age
    const age = calculateAge(person.birthday);
    const interests = Array.isArray(person.interests) ? person.interests.join(', ') : '';
    const preferredCategories = Array.isArray(person.preferred_categories) 
      ? person.preferred_categories.join(', ') 
      : '';

    // Build context for AI
    const prompt = `Génère 3 suggestions de cadeaux pour cette personne :

**Profil de la personne :**
- Nom : ${person.name}
- Âge : ${age} ans
- Genre : ${person.gender || 'Non spécifié'}
- Relation : ${person.relationship}
- Intérêts : ${interests || 'Non spécifié'}
- Catégories préférées : ${preferredCategories || 'Non spécifié'}
- Notes personnelles : ${person.notes || 'Aucune'}
- Dernier cadeau offert : ${person.last_gift || 'Aucun'}

**Contexte du cadeau :**
- Type d'événement : ${eventType}
- Budget : ${budget}€
- Contexte supplémentaire : ${additionalContext || 'Aucun'}

Génère des suggestions personnalisées et originales avec des liens Amazon France directs fonctionnels.`;

    // Generate suggestions with OpenAI
    const suggestions = await generateGiftSuggestions(prompt);
    
    if (!suggestions || suggestions.length === 0) {
      throw new Error('No suggestions generated');
    }

    console.log(`✅ Generated ${suggestions.length} suggestions for ${person.name}`);

    return new Response(
      JSON.stringify({
        suggestions,
        personName: person.name,
        eventType,
        budget
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in suggest-gifts function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Une erreur inattendue est survenue',
        suggestions: []
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});