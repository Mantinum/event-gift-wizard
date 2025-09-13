import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SerpApi Amazon search function
async function searchAmazonProduct(query: string, serpApiKey: string): Promise<{
  asin?: string;
  productUrl?: string;
  addToCartUrl?: string;
  title?: string;
  price?: string;
} | null> {
  try {
    console.log(`🔍 SerpApi search for: "${query}"`);
    
    const params = new URLSearchParams({
      engine: 'amazon',
      amazon_domain: 'amazon.fr',
      language: 'fr_FR',
      k: query, // ✅ Correct parameter for Amazon Search API
      api_key: serpApiKey
    });

    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    
    if (!response.ok) {
      console.error(`SerpApi error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // Helper function to extract ASIN from link
    const extractAsinFromLink = (link: string): string | null => {
      const match = link.match(/\/dp\/([A-Z0-9]{10})/i);
      return match ? match[1] : null;
    };
    
    // Check sponsored results first (often best-sellers)
    const sponsoredResults = data.sponsored_results || [];
    for (const result of sponsoredResults.slice(0, 10)) {
      if (result.asin) {
        const asin = result.asin;
        console.log(`✅ Found ASIN in sponsored: ${asin} for query: "${query}"`);
        return {
          asin,
          productUrl: `https://www.amazon.fr/dp/${asin}`,
          addToCartUrl: `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`,
          title: result.title,
          price: result.price_string
        };
      }
      
      // Try to extract ASIN from link if no direct asin
      if (result.link) {
        const asin = extractAsinFromLink(result.link);
        if (asin) {
          console.log(`✅ Extracted ASIN from sponsored link: ${asin} for query: "${query}"`);
          return {
            asin,
            productUrl: `https://www.amazon.fr/dp/${asin}`,
            addToCartUrl: `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`,
            title: result.title,
            price: result.price_string
          };
        }
      }
    }
    
    // Check organic results
    const organicResults = data.organic_results || [];
    for (const result of organicResults.slice(0, 10)) {
      if (result.asin) {
        const asin = result.asin;
        console.log(`✅ Found ASIN in organic: ${asin} for query: "${query}"`);
        return {
          asin,
          productUrl: `https://www.amazon.fr/dp/${asin}`,
          addToCartUrl: `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`,
          title: result.title,
          price: result.price_string
        };
      }
      
      // Try to extract ASIN from link if no direct asin
      if (result.link) {
        const asin = extractAsinFromLink(result.link);
        if (asin) {
          console.log(`✅ Extracted ASIN from organic link: ${asin} for query: "${query}"`);
          return {
            asin,
            productUrl: `https://www.amazon.fr/dp/${asin}`,
            addToCartUrl: `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`,
            title: result.title,
            price: result.price_string
          };
        }
      }
    }
    
    console.log(`❌ No ASIN found for query: "${query}"`);
    return null;
  } catch (error) {
    console.error(`SerpApi search failed for "${query}":`, error);
    return null;
  }
}

serve(async (req) => {
  console.log('=== FUNCTION START ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { personId, eventType, budget } = body;
    console.log('Request received:', { personId, eventType, budget });

    // Check API keys
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const serpApiKey = Deno.env.get('SERPAPI_API_KEY');
    
    console.log('OpenAI Key available:', !!openAIKey);
    console.log('SerpApi Key available:', !!serpApiKey);
    
    if (!openAIKey) {
      console.error('Missing OpenAI API key');
      return new Response(JSON.stringify({
        error: 'Configuration manquante: clé OpenAI non configurée',
        suggestions: []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!serpApiKey) {
      console.error('Missing SerpApi API key');
      return new Response(JSON.stringify({
        error: 'Configuration manquante: clé SerpApi non configurée',
        suggestions: []
      }), {
        status: 200,
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

    // ===== ÉTAPE 1: Génération IA avec OpenAI =====
    console.log('🤖 Étape 1: Génération des suggestions IA');
    
    // Calculer l'âge si date de naissance disponible
    let ageInfo = '';
    if (personData?.birthday) {
      try {
        const birthDate = new Date(personData.birthday);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          ageInfo = `Âge calculé: ${age - 1} ans`;
        } else {
          ageInfo = `Âge calculé: ${age} ans`;
        }
      } catch (error) {
        console.log('Erreur calcul âge:', error);
      }
    }

    const giftResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        max_completion_tokens: 2000,
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
            content: `Tu es un expert en suggestions de cadeaux pour le marché français. Tu dois suggérer 3 cadeaux concrets et précis.

CONTRAINTES MÉTIER STRICTES:
- ÂGE (filtrage obligatoire):
  • <3 ans: jouets d'éveil certifiés CE, pas d'électronique adulte, pas de petites pièces
  • 3-6 ans: jouets éducatifs, livres enfants, jeux créatifs
  • 7-12 ans: jeux, livres, loisirs créatifs, sport enfant
  • 13-17 ans: tech grand public, mode, loisirs ados
  • Adultes: toutes catégories appropriées
- SÉCURITÉ: respecter strictement les notes d'allergies/restrictions médicales
- DIVERSITÉ: 3 catégories différentes obligatoire
- BUDGET: jamais dépasser, proposer variantes moins chères si besoin
- MARCHÉ FR: privilégier références faciles à trouver sur Amazon.fr
- PAS DE STÉRÉOTYPES: proposer alternatives unisexes si incertitude sur préférences

EXEMPLE de réponse attendue:
{
  "suggestions": [
    {
      "title": "Fujifilm Instax Mini 12 Appareil Photo Instantané",
      "description": "Appareil photo instantané compact et moderne, parfait pour capturer des moments mémorables",
      "estimatedPrice": 79.99,
      "confidence": 0.9,
      "reasoning": "Produit populaire et adapté au budget, idéal pour les jeunes adultes, disponible sur Amazon.fr",
      "category": "Photo",
      "brand": "Fujifilm",
      "canonical_name": "Fujifilm Instax Mini 12",
      "search_queries": ["Fujifilm Instax Mini 12", "Instax Mini 12 appareil photo", "appareil photo instantané Fujifilm", "Fujifilm Instax Mini", "Instax Mini 12 France"]
    }
  ]
}

CONSIGNES TECHNIQUES:
- Produits concrets avec marque et modèle précis
- search_queries: 3-5 requêtes optimisées pour Amazon (marque + modèle + mots-clés)
- JAMAIS d'adjectifs de couleur dans les search_queries
- Prix cohérent avec le budget (marge ±10%)
- Confidence entre 0.7 et 1.0
- Les liens Amazon seront générés automatiquement par SerpApi (ne pas les inclure)`
          },
          {
            role: 'user',
            content: `Génère 3 suggestions de cadeaux pour:
- Événement: ${eventType}
- Budget maximum: ${budget}€
${ageInfo ? `- ${ageInfo}` : ''}
- Profil: ${personData ? JSON.stringify(personData, null, 2) : 'Informations limitées'}

IMPORTANT: Respecte strictement les contraintes d'âge et les restrictions mentionnées dans le profil.`
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
    console.log('✅ OpenAI suggestions generated');
    
    let suggestions = [];
    try {
      const content = giftData.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }
      const parsed = JSON.parse(content);
      suggestions = parsed.suggestions || [];
      console.log('Parsed suggestions count:', suggestions.length);
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      throw new Error(`Invalid OpenAI response format: ${error.message}`);
    }

    // ===== ÉTAPE 2: Résolution produit via SerpApi =====
    console.log('🔍 Étape 2: Résolution des liens Amazon via SerpApi');
    
    const processedSuggestions = await Promise.all(
      suggestions.map(async (suggestion, index) => {
        console.log(`\n--- Traitement suggestion ${index + 1}: "${suggestion.title}" ---`);
        
        let amazonResult = null;
        let matchType: 'direct' | 'search' = 'search';
        let finalUrl = '';
        let purchaseLinks: string[] = [];
        
        // Essayer chaque search_query avec SerpApi (jusqu'à 5)
        if (suggestion.search_queries && suggestion.search_queries.length > 0) {
          for (const query of suggestion.search_queries.slice(0, 5)) { // Max 5 tentatives par suggestion
            amazonResult = await searchAmazonProduct(query, serpApiKey);
            if (amazonResult && amazonResult.asin) {
              console.log(`✅ Produit trouvé via SerpApi pour "${query}"`);
              matchType = 'direct';
              finalUrl = amazonResult.productUrl!;
              purchaseLinks = [
                amazonResult.productUrl!,
                amazonResult.addToCartUrl!
              ];
              break;
            }
          }
        }
        
        // Fallback: essayer avec le nom canonique si pas de résultat
        if (!amazonResult && suggestion.canonical_name) {
          console.log(`🔄 Tentative fallback avec: "${suggestion.canonical_name}"`);
          amazonResult = await searchAmazonProduct(suggestion.canonical_name, serpApiKey);
          if (amazonResult && amazonResult.asin) {
            console.log(`✅ Produit trouvé via fallback`);
            matchType = 'direct';
            finalUrl = amazonResult.productUrl!;
            purchaseLinks = [
              amazonResult.productUrl!,
              amazonResult.addToCartUrl!
            ];
          }
        }
        
        // Dernière option: lien de recherche Amazon
        if (!amazonResult) {
          const searchQuery = suggestion.search_queries?.[0] || suggestion.canonical_name || suggestion.title;
          finalUrl = `https://www.amazon.fr/s?k=${encodeURIComponent(searchQuery)}`;
          purchaseLinks = [finalUrl];
          matchType = 'search';
          console.log(`❌ Aucun ASIN trouvé, fallback recherche: "${searchQuery}"`);
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
            asin: amazonResult?.asin,
            productUrl: amazonResult?.productUrl,
            addToCartUrl: amazonResult?.addToCartUrl,
            searchUrl: matchType === 'search' ? finalUrl : undefined,
            matchType,
            serpApiTitle: amazonResult?.title,
            serpApiPrice: amazonResult?.price
          }
        };
      })
    );

    console.log(`\n🎁 Résultat final: ${processedSuggestions.length} suggestions traitées`);
    processedSuggestions.forEach((suggestion, i) => {
      console.log(`${i + 1}. ${suggestion.title} - ${suggestion.amazonData?.matchType === 'direct' ? '✅ Lien direct' : '🔍 Recherche'}`);
    });

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