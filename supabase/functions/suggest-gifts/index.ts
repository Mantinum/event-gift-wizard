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
  canonical_name?: string;
  search_queries?: string[];
  amazonData?: {
    searchUrl?: string;
    matchType?: 'search';
  };
}

interface GiftOutput {
  suggestions: GiftSuggestion[];
}

async function generateGiftsWithGPT5(profile: any): Promise<GiftOutput> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('🤖 Calling GPT-5 with Responses API...');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      reasoning_effort: 'minimal',
      verbosity: 'low',
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'gift_suggestions',
          schema: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: {
                  type: 'object',
                  required: ['title', 'description', 'estimatedPrice', 'confidence', 'reasoning', 'category', 'alternatives', 'purchaseLinks'],
                  properties: {
                    title: { type: 'string', minLength: 5 },
                    description: { type: 'string', minLength: 20 },
                    estimatedPrice: { type: 'number' },
                    confidence: { type: 'number' },
                    reasoning: { type: 'string', minLength: 10 },
                    category: { type: 'string' },
                    alternatives: { type: 'array', items: { type: 'string' } },
                    purchaseLinks: { type: 'array', items: { type: 'string' } },
                    brand: { type: 'string' },
                    canonical_name: { type: 'string' },
                    search_queries: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            },
            required: ['suggestions'],
            additionalProperties: false
          },
          strict: true
        }
      },
      input: [
        {
          role: 'system',
          content: 'Tu es un expert français en idées cadeaux. Réponds UNIQUEMENT en JSON valide correspondant au schéma fourni. Propose des produits CONCRETS disponibles en France.'
        },
        {
          role: 'user',
          content: `Profil de la personne: ${JSON.stringify(profile)}

Génère 3 suggestions de cadeaux CONCRETS et RÉALISTES pour cette personne :
- Reste dans le budget indiqué
- Adapte aux intérêts et à l'âge de la personne
- Pour les purchaseLinks, utilise des recherches Amazon.fr précises
- Pour search_queries, fournis 3-5 termes optimisés Amazon (marque+modèle, évite les couleurs)
- Assure-toi que estimatedPrice reste dans le budget
- confidence doit être entre 0.7 et 0.9
- reasoning doit expliquer pourquoi ce cadeau convient à cette personne spécifiquement`
        }
      ]
    })
  });

  console.log(`🤖 GPT-5 response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ GPT-5 API error: ${response.status} - ${errorText}`);
    throw new Error(`GPT-5 API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('🤖 GPT-5 response structure:', {
    hasOutput: !!data.output,
    outputLength: data.output?.length || 0
  });

  // Responses API retourne le JSON validé dans data.output[0].content[0].text
  const jsonContent = data.output[0].content[0].text;
  console.log('🤖 Raw JSON content preview:', jsonContent.substring(0, 200));
  
  const giftOutput = JSON.parse(jsonContent) as GiftOutput;
  
  // Enrichir avec amazonData pour compatibilité
  giftOutput.suggestions.forEach(suggestion => {
    if (suggestion.purchaseLinks.length > 0) {
      suggestion.amazonData = {
        searchUrl: suggestion.purchaseLinks[0],
        matchType: 'search'
      };
    }
  });

  return giftOutput;
}

serve(async (req) => {
  console.log('=== GIFT SUGGESTIONS FUNCTION START ===');
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Step 1: Parse request');
    const body = await req.json();
    const { personId, eventType, budget, additionalContext } = body as GiftSuggestionRequest;
    console.log('📊 Request:', { personId, eventType, budget });

    console.log('🔐 Step 2: Setup authentication');
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    console.log('👤 Step 3: Fetch person data');
    const { data: person, error } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .maybeSingle();

    if (error) {
      console.error('❌ DB Error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!person) {
      throw new Error('Person not found');
    }

    console.log('✅ Person found:', person.name);

    // Calculate age
    const birth = new Date(person.birthday);
    const age = new Date().getFullYear() - birth.getFullYear();

    // Build profile for AI
    const profile = {
      name: person.name,
      age: age,
      gender: person.gender,
      relationship: person.relationship,
      interests: person.interests || [],
      notes: person.notes,
      budget: budget,
      eventType: eventType,
      additionalContext: additionalContext
    };

    console.log('🤖 Step 4: Generate suggestions with GPT-5');
    const giftOutput = await generateGiftsWithGPT5(profile);
    
    console.log(`✅ Generated ${giftOutput.suggestions.length} suggestions successfully`);

    return new Response(JSON.stringify({
      suggestions: giftOutput.suggestions,
      personName: person.name,
      eventType,
      budget
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Function error:', error);
    
    return new Response(JSON.stringify({
      error: error?.message || 'Une erreur est survenue',
      suggestions: [],
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error?.name || 'UnknownError'
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});