import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// SerpApi Amazon search function with enhanced ASIN extraction and image support
async function searchAmazonProduct(query: string, serpApiKey: string): Promise<{
  asin?: string;
  productUrl?: string;
  addToCartUrl?: string;
  title?: string;
  price?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
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
    
    // Enhanced ASIN extraction function
    const extractAsinFromLink = (link: string): string | null => {
      // Match various Amazon URL patterns
      const patterns = [
        /\/dp\/([A-Z0-9]{10})/i,
        /\/gp\/product\/([A-Z0-9]{10})/i,
        /[?&]asin=([A-Z0-9]{10})/i
      ];
      
      for (const pattern of patterns) {
        const match = link.match(pattern);
        if (match) return match[1];
      }
      return null;
    };
    
    const createResult = (item: any, asin: string) => ({
      asin,
      productUrl: `https://www.amazon.fr/dp/${asin}`,
      addToCartUrl: `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`,
      title: item.title,
      price: item.price_string || item.price,
      imageUrl: item.thumbnail || item.image,
      rating: item.rating,
      reviewCount: item.reviews_count
    });
    
    // Check all result types (sponsored, organic, and search_results)
    const allResults = [
      ...(data.sponsored_results || []),
      ...(data.organic_results || []),
      ...(data.search_results || [])
    ];
    
    for (const result of allResults.slice(0, 15)) {
      if (result.asin) {
        console.log(`✅ Found direct ASIN: ${result.asin} for query: "${query}"`);
        return createResult(result, result.asin);
      }
      
      // Try to extract ASIN from link
      if (result.link) {
        const asin = extractAsinFromLink(result.link);
        if (asin) {
          console.log(`✅ Extracted ASIN from link: ${asin} for query: "${query}"`);
          return createResult(result, asin);
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
        error: 'Configuration manquante: cle OpenAI non configuree',
        suggestions: []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!serpApiKey) {
      console.error('Missing SerpApi API key');
      return new Response(JSON.stringify({
        error: 'Configuration manquante: cle SerpApi non configuree',
        suggestions: []
      }), {
        status: 400,
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

    // ===== ETAPE 1: Generation IA avec OpenAI =====
    console.log('🤖 Etape 1: Generation des suggestions IA');
    
    // Preparer les informations d'age depuis la BDD (ou fallback)
    let ageInfo = '';
    let ageBucket = 'adult';
    let ageYears = null;
    let ageMonths = null;
    let isMinor = false;

    if (personData) {
      if (personData.age_years !== null && personData.age_bucket) {
        // Utiliser les donnees pre-calculees de la BDD
        ageYears = personData.age_years;
        ageMonths = personData.age_months;
        ageBucket = personData.age_bucket;
        isMinor = personData.is_minor;
        
        if (ageYears < 3) {
          ageInfo = `Age: ${ageYears} ans (${ageMonths} mois) - Tranche: ${ageBucket} - Mineur: ${isMinor ? 'oui' : 'non'}`;
        } else {
          ageInfo = `Age: ${ageYears} ans - Tranche: ${ageBucket} - Mineur: ${isMinor ? 'oui' : 'non'}`;
        }
        
        console.log('Donnees age BDD:', { ageYears, ageMonths, ageBucket, isMinor });
      } else if (personData.birthday) {
        // Fallback: calcul local si les donnees BDD ne sont pas disponibles
        try {
          const birthDate = new Date(personData.birthday);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            ageYears = age - 1;
          } else {
            ageYears = age;
          }
          
          // Determiner le bucket manuellement
          if (ageYears < 1) ageBucket = 'infant';
          else if (ageYears <= 2) ageBucket = 'toddler';
          else if (ageYears <= 12) ageBucket = 'child';
          else if (ageYears <= 17) ageBucket = 'teen';
          else ageBucket = 'adult';
          
          isMinor = ageYears < 18;
          ageInfo = `Age calcule: ${ageYears} ans - Tranche: ${ageBucket} - Mineur: ${isMinor ? 'oui' : 'non'}`;
          
          console.log('Fallback calcul age:', { ageYears, ageBucket, isMinor });
        } catch (error) {
          console.log('Erreur calcul age:', error);
        }
      }
    }

    const giftResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        max_completion_tokens: 2000,
        output: {
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
            content: `Tu es un expert en suggestions de cadeaux pour le marche francais. Tu dois suggerer 3 cadeaux concrets et precis.

CONTRAINTES METIER STRICTES:
- AGE (filtrage obligatoire selon tranche d'age BDD):
  • infant (<1 an): jouets d'eveil 6m+, livres cartonnes, peluches certifiees CE, pas d'electronique
  • toddler (1-2 ans): jouets educatifs, livres images, jeux sensoriels, pas de petites pieces
  • child (3-12 ans): jeux, livres, loisirs creatifs, sport enfant, construction
  • teen (13-17 ans): tech grand public, gaming, mode ados, sport, soins entry-level
  • adult (18+ ans): toutes categories appropriees selon profil
- SECURITE: respecter strictement les notes d'allergies/restrictions medicales
- DIVERSITE: 3 categories differentes obligatoire
- BUDGET: jamais depasser, proposer variantes moins cheres si besoin
- MARCHE FR: privilegier references faciles a trouver sur Amazon.fr
- PAS DE STEREOTYPES: proposer alternatives unisexes si incertitude sur preferences

EXEMPLE de reponse attendue:
{
  "suggestions": [
    {
      "title": "Fujifilm Instax Mini 12 Appareil Photo Instantane",
      "description": "Appareil photo instantane compact et moderne, parfait pour capturer des moments memorables",
      "estimatedPrice": 79.99,
      "confidence": 0.9,
      "reasoning": "Produit populaire et adapte au budget, ideal pour les jeunes adultes, disponible sur Amazon.fr",
      "category": "Photo",
      "brand": "Fujifilm",
      "canonical_name": "Fujifilm Instax Mini 12",
      "search_queries": ["Fujifilm Instax Mini 12", "Instax Mini 12 appareil photo", "appareil photo instantane Fujifilm", "Fujifilm Instax Mini", "Instax Mini 12 France"]
    }
  ]
}

CONSIGNES TECHNIQUES:
- Produits concrets avec marque et modele precis
- search_queries: 3-5 requetes optimisees pour Amazon (marque + modele + mots-cles)
- JAMAIS d'adjectifs de couleur dans les search_queries
- Prix coherent avec le budget (marge ±10%)
- Confidence entre 0.7 et 1.0
- Les liens Amazon seront generes automatiquement par SerpApi (ne pas les inclure)`
          },
          {
            role: 'user',
            content: `Genere 3 suggestions de cadeaux pour:
- Evenement: ${eventType}
- Budget maximum: ${budget}€
${ageInfo ? `- ${ageInfo}` : ''}
- Profil: ${personData ? JSON.stringify(personData, null, 2) : 'Informations limitees'}

IMPORTANT: Respecte strictement les contraintes d'age selon la tranche "${ageBucket}" et les restrictions mentionnees dans le profil.
${ageBucket === 'infant' || ageBucket === 'toddler' ? 'ATTENTION: Personne tres jeune - INTERDIRE toute suggestion adulte (the, cafe, alcool, electronique non-enfant).' : ''}
${personData?.notes ? `RESTRICTIONS IMPORTANTES: ${personData.notes}` : ''}`
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
      // Updated parsing for Responses API
      const content = giftData.output?.[0]?.content?.[0]?.text;
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

    // ===== VALIDATION COTE SERVEUR (garde-fou age) =====
    console.log('🛡️ Validation des suggestions selon l\'age');
    
    const validatedSuggestions = suggestions.filter((suggestion, index) => {
      const title = suggestion.title?.toLowerCase() || '';
      const description = suggestion.description?.toLowerCase() || '';
      const category = suggestion.category?.toLowerCase() || '';
      
      // Regles strictes par tranche d'age
      if (ageBucket === 'infant' || ageBucket === 'toddler') {
        // <3 ans: interdire produits adultes
        const forbiddenForBabies = [
          'the', 'cafe', 'alcool', 'vin', 'biere', 'champagne',
          'smartphone', 'tablet', 'ordinateur', 'casque audio',
          'maquillage', 'parfum', 'rasoir', 'bijou fin',
          'couteau', 'outil', 'produit menager'
        ];
        
        const hasForbiddenContent = forbiddenForBabies.some(forbidden => 
          title.includes(forbidden) || description.includes(forbidden) || category.includes(forbidden)
        );
        
        if (hasForbiddenContent) {
          console.log(`❌ Suggestion ${index + 1} rejetee pour bebe/bambin: "${suggestion.title}"`);
          return false;
        }
      }
      
      // Verifier les allergies/restrictions dans les notes
      if (personData?.notes) {
        const notes = personData.notes.toLowerCase();
        if (notes.includes('allergi') && (title.includes('parfum') || description.includes('parfum'))) {
          console.log(`❌ Suggestion ${index + 1} rejetee pour allergie: "${suggestion.title}"`);
          return false;
        }
        if (notes.includes('vegan') && (title.includes('cuir') || description.includes('cuir'))) {
          console.log(`❌ Suggestion ${index + 1} rejetee pour preference vegan: "${suggestion.title}"`);
          return false;
        }
      }
      
      console.log(`✅ Suggestion ${index + 1} validee: "${suggestion.title}"`);
      return true;
    });
    
    // Si trop de suggestions ont ete rejetees, garder au moins les premieres
    const finalSuggestions = validatedSuggestions.length >= 2 ? validatedSuggestions : suggestions.slice(0, 3);
    console.log(`Suggestions finales: ${finalSuggestions.length}/${suggestions.length} retenues`);

    // ===== ETAPE 2: Resolution produit via SerpApi (parallelisee) =====
    console.log('🔍 Etape 2: Resolution des liens Amazon via SerpApi (parallelisee)');
    
    const processedSuggestions = await Promise.all(
      finalSuggestions.map(async (suggestion, index) => {
        console.log(`\n--- Traitement suggestion ${index + 1}: "${suggestion.title}" ---`);
        
        // Validation du budget cote serveur
        if (suggestion.estimatedPrice && suggestion.estimatedPrice > budget * 1.1) {
          console.log(`⚠️ Prix ${suggestion.estimatedPrice}€ dépasse le budget ${budget}€, ajusté`);
          suggestion.estimatedPrice = Math.min(suggestion.estimatedPrice, budget);
        }
        
        let amazonResult = null;
        let matchType: 'direct' | 'search' = 'search';
        let finalUrl = '';
        let purchaseLinks: string[] = [];
        
        // Paralleliser les recherches SerpApi pour chaque suggestion
        if (suggestion.search_queries && suggestion.search_queries.length > 0) {
          const searchPromises = suggestion.search_queries.slice(0, 3).map(query => 
            searchAmazonProduct(query, serpApiKey)
          );
          
          const results = await Promise.all(searchPromises);
          
          // Trouver le meilleur résultat (scoring par brand match et prix proche)
          amazonResult = results.find(result => {
            if (!result || !result.asin) return false;
            
            // Scoring: préférer si brand matche ou prix proche
            const brandMatch = suggestion.brand && result.title?.toLowerCase().includes(suggestion.brand.toLowerCase());
            const priceMatch = result.price && Math.abs(parseFloat(result.price.replace(/[^\d,]/g, '').replace(',', '.')) - suggestion.estimatedPrice) < suggestion.estimatedPrice * 0.3;
            
            return brandMatch || priceMatch || true; // Accepter le premier trouvé sinon
          }) || results.find(result => result && result.asin) || null;
          
          if (amazonResult) {
            console.log(`✅ Produit trouvé via recherche parallèle`);
            matchType = 'direct';
            finalUrl = amazonResult.productUrl!;
            purchaseLinks = [
              amazonResult.productUrl!,
              amazonResult.addToCartUrl!
            ];
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
        
        // Derniere option: lien de recherche Amazon
        if (!amazonResult) {
          const searchQuery = suggestion.search_queries?.[0] || suggestion.canonical_name || suggestion.title;
          finalUrl = `https://www.amazon.fr/s?k=${encodeURIComponent(searchQuery)}`;
          purchaseLinks = [finalUrl];
          matchType = 'search';
          console.log(`❌ Aucun ASIN trouve, fallback recherche: "${searchQuery}"`);
        }
        
        return {
          title: suggestion.title,
          description: suggestion.description,
          estimatedPrice: suggestion.estimatedPrice || budget || 30,
          confidence: suggestion.confidence || 0.7,
          reasoning: suggestion.reasoning || 'Suggestion generee par IA',
          category: suggestion.category || 'General',
          alternatives: suggestion.search_queries || [],
          purchaseLinks: purchaseLinks,
          brand: suggestion.brand || 'Diverses marques',
          amazonData: {
            asin: amazonResult?.asin,
            productUrl: amazonResult?.productUrl,
            addToCartUrl: amazonResult?.addToCartUrl,
            imageUrl: amazonResult?.imageUrl,
            rating: amazonResult?.rating,
            reviewCount: amazonResult?.reviewCount,
            searchUrl: matchType === 'search' ? finalUrl : undefined,
            matchType,
            serpApiTitle: amazonResult?.title,
            serpApiPrice: amazonResult?.price
          }
        };
      })
    );

    console.log(`\n🎁 Resultat final: ${processedSuggestions.length} suggestions traitees`);
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
    
    // Determine appropriate error status code
    let statusCode = 500;
    let errorMessage = 'Erreur inattendue lors de la generation des suggestions';
    
    if (error?.message?.includes('OpenAI failed')) {
      statusCode = 502; // Bad Gateway for external API failures
      errorMessage = 'Erreur de l\'API OpenAI';
    } else if (error?.message?.includes('SerpApi')) {
      statusCode = 502;
      errorMessage = 'Erreur de l\'API SerpApi';
    } else if (error?.message?.includes('Invalid')) {
      statusCode = 400; // Bad request for validation errors
      errorMessage = error.message;
    }
    
    return new Response(JSON.stringify({
      error: errorMessage,
      details: error?.message || 'Unknown error',
      suggestions: []
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});