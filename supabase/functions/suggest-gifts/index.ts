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

serve(async (req) => {
  console.log('🚀 Edge function started');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Processing POST request');
    const body = await req.json();
    console.log('📊 Request body:', body);
    
    const { personId, eventType, budget, additionalContext } = body as GiftSuggestionRequest;
    
    console.log('🔍 Request parsed:', { personId, eventType, budget, additionalContext });
    
    // Check environment variables
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('🔑 Environment check:', {
      openAI: openAIApiKey ? 'SET' : 'MISSING',
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseKey: supabaseKey ? 'SET' : 'MISSING'
    });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get the Authorization header
    const authHeader = req.headers.get('authorization');
    console.log('🔐 Auth header:', authHeader ? 'PRESENT' : 'MISSING');
    
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    // Initialize Supabase client with user context
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Fetch person data
    console.log(`🔍 Fetching person with ID: ${personId}`);
    const { data: person, error: personError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .maybeSingle();

    console.log('👤 Person query result:', { 
      personFound: !!person, 
      personName: person?.name,
      error: personError?.message 
    });

    if (personError) {
      console.error('❌ Person query error:', personError);
      throw new Error(`Person query failed: ${personError.message}`);
    }

    if (!person) {
      throw new Error('Person not found');
    }

    // Calculate person's age
    const birth = new Date(person.birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    const interests = Array.isArray(person.interests) ? person.interests.join(', ') : '';
    const preferredCategories = Array.isArray(person.preferred_categories) 
      ? person.preferred_categories.join(', ') 
      : '';

    // Build context for AI
    const prompt = `Génère 3 suggestions de cadeaux personnalisées pour ${person.name} (${age} ans, ${person.relationship}).

Intérêts: ${interests || 'Non spécifié'}
Budget: ${budget}€
Événement: ${eventType}

Réponds avec un JSON valide contenant exactement cette structure:
{
  "suggestions": [
    {
      "title": "Nom du produit",
      "description": "Description du produit",
      "estimatedPrice": 25,
      "confidence": 0.8,
      "reasoning": "Pourquoi ce cadeau convient",
      "category": "Catégorie",
      "alternatives": ["Alternative 1", "Alternative 2"],
      "purchaseLinks": ["https://www.amazon.fr/s?k=produit"],
      "brand": "Marque",
      "amazonData": {
        "searchUrl": "https://www.amazon.fr/s?k=produit",
        "matchType": "search"
      }
    }
  ]
}`;

    console.log('🤖 Calling OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en suggestions de cadeaux. Réponds uniquement avec du JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    console.log(`🤖 OpenAI response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('📝 OpenAI response length:', content?.length);
    console.log('📝 Content preview:', content?.substring(0, 100));

    let suggestions;
    try {
      const parsed = JSON.parse(content);
      suggestions = parsed.suggestions || [];
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Raw content:', content);
      throw new Error('Invalid JSON from OpenAI');
    }

    console.log(`✅ Generated ${suggestions.length} suggestions`);

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
    console.error('💥 Function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Une erreur est survenue',
        suggestions: [],
        debug: {
          timestamp: new Date().toISOString(),
          errorType: error?.name || 'UnknownError'
        }
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