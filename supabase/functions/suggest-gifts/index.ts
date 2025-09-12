import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== FUNCTION START ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { personId, eventType, budget } = body;
    console.log('Request received:', { personId, eventType, budget });

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI Key available:', !!openAIKey);
    if (!openAIKey) {
      console.error('Missing OpenAI API key');
      return new Response(JSON.stringify({
        error: 'Configuration manquante: clé OpenAI non configurée',
        suggestions: []
      }), {
        status: 200, // Return 200 but with error message
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get person data from Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    let personData = null;
    if (supabaseUrl && supabaseKey && personId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from('persons')
          .select('*')
          .eq('id', personId)
          .single();
        personData = data;
      } catch (error) {
        console.error('Error fetching person data:', error);
      }
    }

    // Validation function for Amazon ASINs
    async function validateAsinUrl(asin: string): Promise<'ok'|'soft'|'ko'> {
      const url = `https://www.amazon.fr/dp/${asin}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      
      try {
        const response = await fetch(url, { 
          method: 'HEAD', 
          redirect: 'manual', 
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' }
        });
        
        if ([200, 301, 302, 303, 307, 308].includes(response.status)) return 'ok';
        if ([403, 503].includes(response.status)) return 'soft'; // Amazon blocking, but tolerate
        return 'ko';
      } catch (error) {
        return 'soft'; // Network/timeout → tolerant
      } finally {
        clearTimeout(timeout);
      }
    }

    // Generate gift suggestions using OpenAI Chat Completions API with JSON schema
    const giftResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 2000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "gift_suggestions",
            strict: true,
            schema: {
              type: "object",
              required: ["suggestions"],
              additionalProperties: false,
              properties: {
                suggestions: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["title", "description", "estimatedPrice", "confidence", "reasoning", "category", "brand", "canonical_name", "search_queries"],
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      estimatedPrice: { type: "number" },
                      confidence: { type: "number" },
                      reasoning: { type: "string" },
                      category: { type: "string" },
                      brand: { type: "string" },
                      canonical_name: { type: "string" },
                      search_queries: { 
                        type: "array", 
                        minItems: 3, 
                        maxItems: 5, 
                        items: { type: "string" } 
                      },
                      // Champs optionnels :
                      asin: { 
                        type: "string", 
                        pattern: "^[A-Z0-9]{10}$" 
                      },
                      product_url: { 
                        type: "string", 
                        pattern: "^https?://(?:www\\.)?amazon\\.fr/(?:dp|gp/product)/[A-Z0-9]{10}(/.*)?$" 
                      }
                    }
                  }
                }
              }
            }
          }
        },
        messages: [
          {
            role: 'system',
            content: `Tu es un expert FR en cadeaux Amazon. Tu dois suggérer 3 cadeaux concrets.

EXEMPLE de réponse attendue:
{
  "suggestions": [
    {
      "title": "Fujifilm Instax Mini 12",
      "description": "Appareil photo instantané compact et moderne",
      "estimatedPrice": 79.99,
      "confidence": 0.9,
      "reasoning": "Compatible avec le profil et budget",
      "category": "Photo",
      "brand": "Fujifilm",
      "canonical_name": "Fujifilm Instax Mini 12",
      "search_queries": ["Fujifilm Instax Mini 12", "Instax Mini 12 appareil photo", "appareil photo instantané Fujifilm"],
      "asin": "B0BXYZ1234",
      "product_url": "https://www.amazon.fr/dp/B0BXYZ1234"
    }
  ]
}

RÈGLES STRICTES:
- Si tu es CERTAIN d'un ASIN, remplis "asin" (même si "product_url" reste absent).
- "product_url" UNIQUEMENT si au format https://www.amazon.fr/dp/ASIN.
- Si tu n'es pas sûr: LAISSE asin/product_url ABSENTS et fournis 3–5 "search_queries" (marque+modèle, sans adjectifs de couleur).
- search_queries: toujours 3-5 requêtes précises et variées

IMPORTANT: Préfère laisser asin/product_url vides + bonnes search_queries qu'un mauvais lien.`
          },
          {
            role: 'user',
            content: `Génère 3 suggestions de cadeaux pour:
- Événement: ${eventType}
- Budget: ${budget}€
- Personne: ${personData ? JSON.stringify(personData) : 'Informations limitées'}

Si tu connais des ASINs Amazon FR précis, remplis le champ asin.`
          }
        ]
      })
    });

    console.log('OpenAI response status:', giftResponse.status);
    if (!giftResponse.ok) {
      const errorText = await giftResponse.text();
      console.error('OpenAI error:', giftResponse.status, errorText);
      throw new Error(`OpenAI failed: ${giftResponse.status} - ${errorText}`);
    }

    const giftData = await giftResponse.json();
    console.log('OpenAI raw response:', JSON.stringify(giftData, null, 2));
    let suggestions = [];
    
    try {
      // Parse Chat Completions API format
      const content = giftData.choices?.[0]?.message?.content;
      console.log('OpenAI content:', content);
      if (!content) {
        throw new Error('No content in OpenAI response');
      }
      const parsed = JSON.parse(content);
      suggestions = parsed.suggestions || [];
      console.log('Parsed suggestions count:', suggestions.length);
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.error('Raw response structure:', Object.keys(giftData));
      throw new Error(`Invalid OpenAI response format: ${error.message}`);
    }

    // Validate and process each suggestion with enhanced ASIN handling
    const processedSuggestions = await Promise.all(
      suggestions.map(async (suggestion) => {
        const asinRe = /https?:\/\/(?:www\.)?amazon\.fr\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?#]|$)/i;
        let matchType: 'direct' | 'direct-unverified' | 'search' = 'search';
        let finalUrl = '';
        let purchaseLinks: string[] = [];
        
        // 1) Try product_url first
        const urlMatch = suggestion.product_url?.match(asinRe);
        if (urlMatch) {
          const asin = urlMatch[1].toUpperCase();
          console.log(`Validating ASIN from URL: ${asin}`);
          const validation = await validateAsinUrl(asin);
          
          if (validation !== 'ko') {
            finalUrl = `https://www.amazon.fr/dp/${asin}`;
            purchaseLinks = [
              finalUrl,
              `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`
            ];
            matchType = validation === 'ok' ? 'direct' : 'direct-unverified';
            console.log(`ASIN ${asin} from URL validated: ${validation}`);
          } else {
            console.log(`ASIN ${asin} from URL validation failed`);
          }
        }
        
        // 2) If no valid URL, try explicit ASIN field
        if (!finalUrl && suggestion.asin && /^[A-Z0-9]{10}$/i.test(suggestion.asin)) {
          const asin = suggestion.asin.toUpperCase();
          console.log(`Validating explicit ASIN: ${asin}`);
          const validation = await validateAsinUrl(asin);
          
          if (validation !== 'ko') {
            finalUrl = `https://www.amazon.fr/dp/${asin}`;
            purchaseLinks = [
              finalUrl,
              `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`
            ];
            matchType = validation === 'ok' ? 'direct' : 'direct-unverified';
            console.log(`Explicit ASIN ${asin} validated: ${validation}`);
          } else {
            console.log(`Explicit ASIN ${asin} validation failed`);
          }
        }
        
        // 3) Fallback to search (try multiple query variants)
        if (!finalUrl) {
          const queries = [...(suggestion.search_queries ?? []), suggestion.canonical_name, suggestion.title]
            .filter(Boolean) as string[];
          // Choose the best query (shortest or most precise)
          const searchQuery = queries.sort((a, b) => a.length - b.length)[0] || 'cadeau';
          
          finalUrl = `https://www.amazon.fr/s?k=${encodeURIComponent(searchQuery)}`;
          purchaseLinks = [finalUrl];
          matchType = 'search';
          console.log(`Falling back to search with query: ${searchQuery}`);
        }
        
        // Extract ASIN from final URL for amazonData
        const finalAsin = finalUrl.includes('/dp/') ? finalUrl.match(/\/dp\/([A-Z0-9]{10})/i)?.[1] : undefined;
        
        return {
          title: suggestion.title,
          description: suggestion.description,
          estimatedPrice: suggestion.estimatedPrice || budget || 30,
          confidence: suggestion.confidence || 0.7,
          reasoning: suggestion.reasoning || 'Suggestion générée par IA',
          category: suggestion.category || 'Général',
          alternatives: suggestion.search_queries || [],
          purchaseLinks: purchaseLinks,
          brand: suggestion.brand || 'Diverses marques',
          amazonData: {
            asin: finalAsin,
            productUrl: finalUrl.includes('/dp/') ? finalUrl : undefined,
            addToCartUrl: finalUrl.includes('/dp/') ? purchaseLinks[1] : undefined,
            searchUrl: !finalUrl.includes('/dp/') ? finalUrl : undefined,
            matchType
          }
        };
      })
    );

    return new Response(JSON.stringify({
      success: true,
      suggestions: processedSuggestions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    
    return new Response(JSON.stringify({
      error: 'Erreur inattendue lors de la génération des suggestions',
      details: error?.message || 'Unknown error',
      suggestions: []
    }), {
      status: 200, // Return 200 but with error in payload
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});