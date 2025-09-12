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

    // Generate gift suggestions using OpenAI with strict validation
    const giftResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en suggestions de cadeaux. Tu dois suggérer 3 cadeaux concrets.

RÈGLES STRICTES pour product_url:
- Utilise UNIQUEMENT le format: https://www.amazon.fr/dp/ASIN
- Si tu n'es pas 100% SûR de l'ASIN exact, laisse product_url vide
- Dans ce cas, fournis 3-5 search_queries précises (marque+modèle, PAS d'adjectifs de couleur)

Format JSON obligatoire:
{
  "suggestions": [
    {
      "title": "Nom précis du produit",
      "description": "Description détaillée",
      "estimatedPrice": 29.99,
      "confidence": 0.9,
      "reasoning": "Justification personnalisée",
      "category": "Catégorie",
      "brand": "Marque",
      "canonical_name": "nom-produit-pour-recherche",
      "product_url": "https://www.amazon.fr/dp/ASIN" ou "",
      "search_queries": ["requête 1", "requête 2", "requête 3"]
    }
  ]
}

IMPORTANT: Si incertain sur l'ASIN, préfère search_queries que product_url invalide.`
          },
          {
            role: 'user',
            content: `Génère 3 suggestions de cadeaux pour:
- Événement: ${eventType}
- Budget: ${budget}€
- Personne: ${personData ? JSON.stringify(personData) : 'Informations limitées'}

Sois prudent avec les product_url - utilise seulement si tu connais l'ASIN exact.`
          }
        ]
      })
    });

    if (!giftResponse.ok) {
      const errorText = await giftResponse.text();
      console.error('OpenAI error:', giftResponse.status, errorText);
      throw new Error(`OpenAI failed: ${giftResponse.status}`);
    }

    const giftData = await giftResponse.json();
    let suggestions = [];
    
    try {
      const content = giftData.choices[0].message.content;
      const parsed = JSON.parse(content);
      suggestions = parsed.suggestions || [];
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      throw new Error('Invalid OpenAI response format');
    }

    // Validate and process each suggestion
    const processedSuggestions = await Promise.all(
      suggestions.map(async (suggestion) => {
        let finalUrl = '';
        let purchaseLinks = [];
        
        if (suggestion.product_url) {
          // Validate Amazon URL format
          const asinMatch = suggestion.product_url.match(/https:\/\/www\.amazon\.fr\/dp\/([A-Z0-9]{10})/);
          
          if (asinMatch) {
            const asin = asinMatch[1];
            console.log(`Validating ASIN: ${asin}`);
            
            try {
              // Validate ASIN with HEAD request
              const validationResponse = await fetch(`https://www.amazon.fr/dp/${asin}`, {
                method: 'HEAD',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; bot)'
                }
              });
              
              if (validationResponse.status === 200 || validationResponse.status === 301 || validationResponse.status === 302) {
                finalUrl = `https://www.amazon.fr/dp/${asin}`;
                purchaseLinks = [
                  finalUrl,
                  `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1` // Add to cart
                ];
                console.log(`ASIN ${asin} validated successfully`);
              } else {
                console.log(`ASIN ${asin} validation failed: ${validationResponse.status}`);
              }
            } catch (error) {
              console.log(`ASIN validation error: ${error.message}`);
            }
          }
        }
        
        // Fallback to search if no valid URL
        if (!finalUrl) {
          const searchQuery = suggestion.search_queries?.[0] || suggestion.canonical_name || suggestion.title;
          finalUrl = `https://www.amazon.fr/s?k=${encodeURIComponent(searchQuery)}`;
          purchaseLinks = [finalUrl];
        }
        
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
            searchUrl: finalUrl,
            matchType: finalUrl.includes('/dp/') ? 'direct' : 'search',
            asin: finalUrl.includes('/dp/') ? finalUrl.split('/dp/')[1] : null
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