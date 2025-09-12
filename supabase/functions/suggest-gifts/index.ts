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
  console.log('=== EDGE FUNCTION START ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Returning CORS response');
    return new Response(null, { headers: corsHeaders });
  }

  let step = 'INIT';
  try {
    step = 'PARSE_BODY';
    console.log('📥 Step: PARSE_BODY');
    const body = await req.json();
    console.log('📊 Request body received:', JSON.stringify(body));
    
    step = 'EXTRACT_PARAMS';
    console.log('📥 Step: EXTRACT_PARAMS');
    const { personId, eventType, budget, additionalContext } = body as GiftSuggestionRequest;
    console.log('🔍 Params extracted:', { personId, eventType, budget, additionalContext });
    
    step = 'CHECK_ENV';
    console.log('📥 Step: CHECK_ENV');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('🔑 Environment variables:', {
      openAI: openAIApiKey ? `SET (${openAIApiKey.substring(0, 10)}...)` : 'MISSING',
      supabaseUrl: supabaseUrl ? `SET (${supabaseUrl})` : 'MISSING',
      supabaseKey: supabaseKey ? `SET (${supabaseKey.substring(0, 10)}...)` : 'MISSING'
    });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }
    if (!supabaseKey) {
      throw new Error('Supabase key not configured');
    }

    step = 'CHECK_AUTH';
    console.log('📥 Step: CHECK_AUTH');
    const authHeader = req.headers.get('authorization');
    console.log('🔐 Auth header:', authHeader ? `PRESENT (${authHeader.substring(0, 20)}...)` : 'MISSING');
    
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    step = 'INIT_SUPABASE';
    console.log('📥 Step: INIT_SUPABASE');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    console.log('✅ Supabase client created');

    step = 'FETCH_PERSON';
    console.log('📥 Step: FETCH_PERSON');
    console.log(`🔍 Querying person with ID: ${personId}`);
    
    const { data: person, error: personError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .maybeSingle();

    console.log('👤 Person query completed');
    console.log('👤 Person data:', person ? `Found: ${person.name}` : 'Not found');
    console.log('👤 Person error:', personError ? JSON.stringify(personError) : 'None');

    if (personError) {
      throw new Error(`Person query failed: ${JSON.stringify(personError)}`);
    }

    if (!person) {
      throw new Error(`Person with ID ${personId} not found`);
    }

    step = 'CALCULATE_AGE';
    console.log('📥 Step: CALCULATE_AGE');
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

    step = 'BUILD_PROMPT';
    console.log('📥 Step: BUILD_PROMPT');
    const prompt = `Tu es un expert en cadeaux personnalisés. Génère 3 suggestions de cadeaux pour cette personne :

**Profil :**
- Nom : ${person.name}
- Âge : ${age} ans
- Genre : ${person.gender || 'Non spécifié'}
- Relation : ${person.relationship}
- Intérêts : ${interests || 'Non spécifié'}
- Notes : ${person.notes || 'Aucune'}
- Budget : ${budget}€
- Événement : ${eventType}
- Contexte : ${additionalContext || 'Aucun'}

**Instructions importantes :**
1. Adapte chaque suggestion au profil et aux intérêts de la personne
2. Reste dans le budget indiqué
3. Propose des produits réels et populaires
4. Pour chaque suggestion, utilise un terme de recherche simple (ex: "casque bluetooth", "livre cuisine", "plante verte")

Réponds UNIQUEMENT avec ce JSON exact (sans texte supplémentaire) :
{
  "suggestions": [
    {
      "title": "Nom précis du produit",
      "description": "Description détaillée en 2-3 phrases",
      "estimatedPrice": prix_en_nombre,
      "confidence": 0.85,
      "reasoning": "Explication personnalisée basée sur les intérêts de ${person.name}",
      "category": "Catégorie",
      "alternatives": ["Alternative 1", "Alternative 2"],
      "purchaseLinks": ["https://www.amazon.fr/s?k=terme_de_recherche"],
      "brand": "Marque si applicable",
      "amazonData": {
        "searchUrl": "https://www.amazon.fr/s?k=terme_de_recherche",
        "matchType": "search"
      }
    }
  ]
}`;

    step = 'CALL_OPENAI';
    console.log('📥 Step: CALL_OPENAI');
    console.log('🤖 Calling OpenAI with prompt length:', prompt.length);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 3000,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en suggestions de cadeaux personnalisés. Réponds uniquement avec du JSON valide, sans texte avant ou après.'
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

    step = 'PARSE_OPENAI_RESPONSE';
    console.log('📥 Step: PARSE_OPENAI_RESPONSE');
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('📝 OpenAI response length:', content?.length);
    console.log('📝 Content preview:', content?.substring(0, 150));

    let suggestions;
    try {
      // Clean the content in case there's extra text
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/, '').replace(/```$/, '');
      }
      
      const parsed = JSON.parse(cleanContent);
      suggestions = parsed.suggestions || [];
      
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error('No suggestions in OpenAI response');
      }
      
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Raw content:', content);
      throw new Error(`Invalid JSON from OpenAI: ${parseError.message}`);
    }

    console.log(`✅ Successfully parsed ${suggestions.length} suggestions`);

    step = 'SUCCESS_RESPONSE';
    console.log('📥 Step: SUCCESS_RESPONSE');
    
    const result = {
      suggestions,
      personName: person.name,
      eventType,
      budget
    };
    
    console.log('✅ Returning success response with real suggestions');
    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('💥 ERROR at step:', step);
    console.error('💥 Error type:', error?.constructor?.name);
    console.error('💥 Error message:', error?.message);
    console.error('💥 Error stack:', error?.stack);
    
    const errorResponse = { 
      success: false,
      error: error?.message || 'Unknown error occurred',
      step: step,
      suggestions: [],
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error?.constructor?.name || 'UnknownError',
        step: step
      }
    };
    
    console.log('❌ Returning error response:', JSON.stringify(errorResponse));
    
    return new Response(
      JSON.stringify(errorResponse),
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