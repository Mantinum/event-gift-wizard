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
  min_price?: number;
  max_price?: number;
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

// Helpers to align suggestions with interests
const normalize = (s: string) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const INTEREST_CATEGORY_MAP: Record<string, string[]> = {
  beaute: ['Beauté', 'Bien-être', 'Cosmétiques', 'Parfum'],
  decoration: ['Décoration', 'Maison', 'Design', 'Luminaires'],
  deco: ['Décoration', 'Maison', 'Design', 'Luminaires'],
  mode: ['Mode', 'Accessoires', 'Maroquinerie', 'Vêtements'],
  bijou: ['Bijoux', 'Joaillerie', 'Montres'],
  bijoux: ['Bijoux', 'Joaillerie', 'Montres'],
  sport: ['Sport', 'Fitness'],
  lecture: ['Lecture', 'Culture', 'Livres'],
  cuisine: ['Cuisine', 'Gastronomie', 'Ustensiles'],
  voyage: ['Voyage', 'Bagages'],
  musique: ['Audio', 'Musique'],
  tech: ['Tech', 'Informatique', 'Gadgets'],
  art: ['Art', 'Loisirs créatifs'],
};

// Scoring function for Amazon search results
interface Hit {
  title: string;
  brand?: string;
  asin?: string;
  price?: number;
  url?: string;
}

function scoreHit(hit: Hit, expectedBrand?: string, targetPrice?: number, queryTokens: string[] = []): number {
  const t = (hit.title || "").toLowerCase();
  
  // Brand scoring - more generous
  let brandScore = 0.5;
  if (expectedBrand) {
    const brand = expectedBrand.toLowerCase();
    if (t.includes(brand) || hit.brand?.toLowerCase() === brand) {
      brandScore = 1.0;
    } else if (t.includes(brand.substring(0, 4)) && brand.length > 4) {
      brandScore = 0.7; // Partial brand match
    }
  }

  // Price scoring - more forgiving
  let priceScore = 0.5;
  const price = hit.price ?? 0;
  if (targetPrice && price > 0) {
    const priceDiff = Math.abs(price - targetPrice);
    const tolerance = Math.max(20, targetPrice * 0.5); // More generous tolerance
    priceScore = Math.max(0.2, 1 - (priceDiff / tolerance));
  }

  // Keyword scoring - more flexible
  let kwMatch = 0.5;
  const kw = queryTokens.filter(k => k.length > 2);
  if (kw.length > 0) {
    const matches = kw.reduce((acc, k) => {
      const keyword = k.toLowerCase();
      // Exact match or partial match (for longer words)
      if (t.includes(keyword)) return acc + 1;
      if (keyword.length > 4 && t.includes(keyword.substring(0, 4))) return acc + 0.5;
      return acc;
    }, 0);
    kwMatch = matches / kw.length;
  }

  const score = 0.4 * brandScore + 0.3 * priceScore + 0.3 * kwMatch;
  console.log(`📊 Scoring "${hit.title?.substring(0, 30)}": brand=${brandScore.toFixed(2)}, price=${priceScore.toFixed(2)}, keywords=${kwMatch.toFixed(2)} => ${score.toFixed(2)}`);
  
  return score;
}

// Sleep function for retry backoff
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Multi-strategy Amazon search with orchestration (SIMPLIFIED VERSION)
async function searchCanopyAmazonAdvanced(suggestion: GiftSuggestion, canopyApiKey: string): Promise<any> {
  console.log(`🎯 Simplified Canopy search for: "${suggestion.title}"`);
  
  if (!canopyApiKey) {
    console.log('❌ No Canopy API key available');
    return null;
  }

  try {
    const targetPrice = suggestion.estimatedPrice;
    const expectedBrand = suggestion.brand;
    const queries = [
      suggestion.canonical_name || suggestion.title,
      ...(suggestion.search_queries || [suggestion.title]),
      expectedBrand ? expectedBrand + ' ' + suggestion.title.split(' ').slice(0, 3).join(' ') : suggestion.title
    ].filter(Boolean);

    console.log(`🔍 Search queries: ${JSON.stringify(queries.slice(0, 2))}`);

    // Try first query only for now
    const query = queries[0];
    if (query && query.length > 2) {
      console.log(`🔍 Searching: "${query}"`);
      const results = await searchCanopyWithRetry(query, canopyApiKey, 'simple');
      
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} results`);
        
        // Take first result with ASIN
        const resultWithAsin = results.find((hit: any) => hit.asin);
        if (resultWithAsin) {
          console.log(`✅ Found product with ASIN: ${resultWithAsin.asin}`);
          return buildAmazonData(resultWithAsin, 'exact');
        }
        
        // Or take first result
        const firstResult = results[0];
        if (firstResult) {
          console.log(`✅ Using first result: ${firstResult.title?.substring(0, 50)}`);
          return buildAmazonData(firstResult, 'relaxed');
        }
      }
    }

    console.log(`⚠️ No results found, using fallback`);
    return buildFallbackAmazonData(suggestion);
    
  } catch (error) {
    console.error(`❌ Error in searchCanopyAmazonAdvanced: ${error}`);
    return buildFallbackAmazonData(suggestion);
  }
}

// Search with retry logic and fallback to GraphQL
async function searchCanopyWithRetry(query: string, canopyApiKey: string, variant: string): Promise<any[]> {
  const cleanQuery = query.replace(/[^\w\s\-àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]/g, ' ').trim();
  if (cleanQuery.length < 3) return [];

  const searchQuery = encodeURIComponent(cleanQuery);
  const maxRetries = 3;
  const backoffDelays = [200, 500, 1200];

  // Try REST API with retries
  for (let i = 0; i < maxRetries; i++) {
    try {
      const restUrl = `https://rest.canopyapi.co/api/amazon/search?searchTerm=${searchQuery}&domain=amazon.fr&limit=10`;
      console.log(`📡 Canopy REST (${variant}, attempt ${i + 1}): ${restUrl}`);

      const response = await fetch(restUrl, {
        headers: {
          'Authorization': `Bearer ${canopyApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📊 Canopy REST status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        const results = data.results || data.products || [];
        if (results.length > 0) {
          console.log(`✅ REST success: ${results.length} results`);
          return results;
        }
      } else if (response.status === 500 && i < maxRetries - 1) {
        console.log(`⏳ Retrying after ${backoffDelays[i]}ms...`);
        await sleep(backoffDelays[i]);
        continue;
      } else {
        const errorText = await response.text();
        console.log(`❌ REST error: ${errorText}`);
        break;
      }
    } catch (error) {
      console.log(`❌ REST request failed (attempt ${i + 1}): ${error}`);
      if (i < maxRetries - 1) {
        await sleep(backoffDelays[i]);
      }
    }
  }

  // Fallback to GraphQL
  console.log(`🔄 Falling back to Canopy GraphQL for ${variant}`);
  try {
    const graphqlQuery = `
      query SearchAmazon($searchTerm: String!, $domain: String!) {
        amazon_search(searchTerm: $searchTerm, domain: $domain, limit: 10) {
          results {
            title
            asin
            price
            currency
            rating
            review_count
            availability
            prime
            image_url
            url
          }
        }
      }
    `;

    const graphqlResponse = await fetch('https://graphql.canopyapi.co/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${canopyApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: {
          searchTerm: cleanQuery,
          domain: 'amazon.fr'
        }
      })
    });

    console.log(`📊 Canopy GraphQL status: ${graphqlResponse.status}`);

    if (graphqlResponse.ok) {
      const graphqlData = await graphqlResponse.json();
      const results = graphqlData.data?.amazon_search?.results || [];
      console.log(`✅ GraphQL success: ${results.length} results`);
      return results;
    }
  } catch (error) {
    console.error(`❌ GraphQL fallback failed: ${error}`);
  }

  return [];
}

// Build Amazon data object for successful matches
function buildAmazonData(hit: any, matchType: string): any {
  const asin = hit.asin;
  console.log(`🔗 Building Amazon data for ASIN: ${asin}, Match type: ${matchType}`);
  console.log(`📊 Product details: ${hit.title?.substring(0, 50)}..., Price: ${hit.price}`);
  
  return {
    asin,
    rating: hit.rating,
    reviewCount: hit.review_count || hit.reviewCount,
    availability: hit.availability,
    prime: hit.prime || hit.isPrime,
    actualPrice: hit.price || hit.actualPrice,
    imageUrl: hit.image_url || hit.imageUrl || hit.image,
    productUrl: asin ? `https://www.amazon.fr/dp/${asin}` : hit.url,
    addToCartUrl: asin ? `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1` : undefined,
    searchUrl: undefined,
    matchType
  };
}

// Build fallback Amazon data for search-only
function buildFallbackAmazonData(suggestion: GiftSuggestion): any {
  const searchQuery = suggestion.canonical_name || suggestion.title;
  return {
    searchUrl: `https://www.amazon.fr/s?k=${encodeURIComponent(searchQuery)}`,
    matchType: 'search'
  };
}

// Enrich suggestions with advanced Canopy Amazon search
async function enrichWithCanopyAmazon(suggestions: GiftSuggestion[], canopyApiKey: string): Promise<GiftSuggestion[]> {
  console.log(`🔑 CANOPY_API_KEY env var check: ${!!canopyApiKey}`);
  console.log(`📊 Number of suggestions to enrich: ${suggestions.length}`);
  console.log(`🔄 Starting advanced Canopy enrichment process...`);

  if (!canopyApiKey) {
    console.log('❌ No Canopy API key available for enrichment');
    return suggestions;
  }

  const enrichedSuggestions = await Promise.all(
    suggestions.map(async (suggestion) => {
      try {
        console.log(`🔍 Processing suggestion: "${suggestion.title}"`);
        console.log(`📊 Brand: ${suggestion.brand}, Canonical: ${suggestion.canonical_name}`);
        console.log(`🔍 Search queries: ${JSON.stringify(suggestion.search_queries)}`);
        
        const amazonData = await searchCanopyAmazonAdvanced(suggestion, canopyApiKey);
        
        if (amazonData) {
          suggestion.amazonData = amazonData;
          console.log(`✅ Enriched "${suggestion.title}" - Match type: ${amazonData.matchType}, ASIN: ${amazonData.asin || 'N/A'}`);
          
          // Update purchase links based on match type
          if (amazonData.asin) {
            suggestion.purchaseLinks = [
              amazonData.productUrl,
              amazonData.addToCartUrl,
              ...suggestion.purchaseLinks.slice(2) // Keep other non-Amazon links
            ].filter(Boolean);
          } else if (amazonData.searchUrl && !suggestion.purchaseLinks.includes(amazonData.searchUrl)) {
            suggestion.purchaseLinks.push(amazonData.searchUrl);
          }
        } else {
          console.log(`⚠️ No Amazon data found for "${suggestion.title}"`);
        }
      } catch (error) {
        console.error(`❌ Error enriching suggestion "${suggestion.title}":`, error);
      }
      return suggestion;
    })
  );

  console.log(`✅ Advanced Canopy enrichment completed. Suggestions processed: ${enrichedSuggestions.length}`);
  return enrichedSuggestions;
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
    console.log('🚀 Starting suggest-gifts function...');
    
    const requestBody = await req.json();
    console.log('📝 Request body received:', JSON.stringify(requestBody));
    
    const { personId, eventType, budget, additionalContext }: GiftSuggestionRequest = requestBody;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('🔑 Environment check - Supabase URL available:', !!supabaseUrl);
    console.log('🔑 Environment check - Supabase Key available:', !!supabaseKey);
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📝 Person query starting...');
    // Get person details from database
    const { data: person, error: personError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .single();

    console.log('📝 Person query result:', { person: person?.name, error: personError });

    if (personError || !person) {
      console.error('❌ Person not found:', personError);
      throw new Error('Personne non trouvee');
    }

    // Get person's event history for better context
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('person_id', personId)
      .order('date', { ascending: false })
      .limit(5);

    // Prepare context for AI
    const personContext = {
      name: person.name,
      age: calculateAge(person.birthday),
      gender: person.gender || 'Non spécifié',
      interests: person.interests || [],
      relationship: person.relationship,
      preferredCategories: person.preferred_categories || [],
      notes: person.notes || '',
      lastGift: person.last_gift || '',
      recentEvents: events || []
    };

    // Derive allowed categories strictly from interests/preferences
    const rawInterests: string[] = Array.isArray(personContext.interests) ? personContext.interests : [];
    const allowedSet = new Set<string>();
    for (const it of rawInterests) {
      const cats = INTEREST_CATEGORY_MAP[normalize(it)];
      if (cats) cats.forEach((c) => allowedSet.add(c));
    }
    const prefCats: string[] = Array.isArray(personContext.preferredCategories) ? personContext.preferredCategories : [];
    prefCats.forEach((c) => allowedSet.add(c));
    const allowedCategories = Array.from(allowedSet);
    if (allowedCategories.length === 0) {
      // Sensible defaults if no interests mapped
      allowedCategories.push('Mode', 'Bijoux', 'Décoration', 'Beauté');
    }
    console.log('Allowed categories derived from interests:', allowedCategories);

    // Generate AI suggestions using OpenRouter
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

    const systemPrompt = `Tu es un expert FR en cadeaux personnalisés pour le marché français. Ta mission: proposer 3 PRODUITS CONCRETS, avec marque/modèle quand c'est pertinent, achetables en ligne en France.

    RÈGLES STRICTES:
    - CATEGORIES AUTORISÉES UNIQUEMENT: ${allowedCategories.join(', ')} (n'en sors jamais)
    - BUDGET: chaque produit doit coûter <= budget (en EUR). Si au-dessus, choisis une variante/format qui rentre dans le budget.
    - DIVERSITÉ: 3 catégories différentes (mais toutes autorisées).
    - PRÉCISION: évite les intitulés génériques. Préfère des noms précis (ex: "ghd Gold Styler", "Lampe Fatboy Edison Medium").
    - MARCHANDS FR: liens cliquables vers des pages d'achat FR (Amazon.fr, Fnac, Darty, Decathlon, Sephora, etc.) ou sinon un lien Google Shopping.

    FORMAT EXACT (JSON uniquement, pas de texte hors JSON):
    {
      "suggestions": [
        {
          "title": un nom commercial court et attrayant,
          "description": description détaillée du produit (2-3 phrases),
          "estimatedPrice": prix estimé en euros (nombre),
          "confidence": niveau de confiance 1-100 (nombre),
          "reasoning": justification personnalisée basée sur le profil,
          "category": catégorie du produit,
          "alternatives": [liste de 2-3 alternatives similaires],
          "purchaseLinks": [liens d'achat réels vers des sites français comme Sephora, Fnac, etc.],
          "brand": marque du produit (chaîne courte),
          "canonical_name": nom canonique sans adjectifs marketing (marque + modèle),
          "search_queries": [3-5 variantes de recherche optimisées pour Amazon.fr, éviter adjectifs de couleur non essentiels],
          "min_price": prix minimum (estimatedPrice - 20%),
          "max_price": prix maximum (estimatedPrice + 20%)
        }
      ]
    }

        Optimise les suggestions pour des marques disponibles en France et accessible via Amazon.fr ou sites français.
        Assure-toi que les catégories correspondent aux intérêts: ${allowedCategories.join(', ')}.
        
        IMPORTANT pour search_queries: Optimise pour Amazon.fr avec marque + modèle + mot-clé distinctif, 
        évite les adjectifs de style ('blanc', 'doré rose') sauf si indispensables. 
        Inclus une variante en anglais si c'est plus courant sur Amazon.
        
        Réponds uniquement avec un JSON valide contenant un objet "suggestions" avec un array de suggestions.`;

    const userPrompt = `
    PROFIL DE LA PERSONNE :
    - Nom : ${personContext.name}
    - Âge : ${personContext.age} ans
    - Sexe : ${personContext.gender}
    - Relation : ${personContext.relationship}
    - Centres d'intérêt : ${rawInterests.join(', ')}
    - Catégories préférées : ${prefCats.join(', ')}
    - Catégories AUTORISÉES: ${allowedCategories.join(', ')}
    - Notes personnelles : ${personContext.notes}
    - Dernier cadeau offert : ${personContext.lastGift}

    CONTEXTE DE L'ÉVÈNEMENT :
    - Type d'évènement : ${eventType}
    - Budget maximum : ${budget}€
    - Contexte additionnel : ${additionalContext || 'Aucun'}

    HISTORIQUE RÉCENT :
    ${personContext.recentEvents.map(e => `- ${e.title} (${e.date})`).join('\n')}

    Génère 3 PRODUITS CONCRETS dans des CATÉGORIES DIFFÉRENTES parmi les catégories AUTORISÉES ci-dessus et dans le budget de ${budget}€.`;

    console.log('Calling OpenRouter API for gift suggestions...');

    if (!openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY non configurée');
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "model": "deepseek/deepseek-chat",
        "messages": [
          { "role": "system", "content": systemPrompt },
          { "role": "user", "content": userPrompt }
        ],
        "temperature": 0.7,
        "max_tokens": 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error (${response.status}):`, errorText);
      throw new Error(`Erreur API OpenRouter: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenRouter response:', JSON.stringify(data, null, 2));

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Réponse vide de l\'API OpenRouter');
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Erreur parsing JSON:', parseError);
      console.error('Contenu reçu:', content);
      throw new Error('Format de réponse invalide');
    }

    if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
      throw new Error('Format de suggestions invalide');
    }

    let suggestions: GiftSuggestion[] = parsedResponse.suggestions;

    // Enrich suggestions with Canopy Amazon data
    const canopyApiKey = Deno.env.get('CANOPY_API_KEY');
    if (canopyApiKey) {
      suggestions = await enrichWithCanopyAmazon(suggestions, canopyApiKey);
    }

    return new Response(
      JSON.stringify({
        suggestions,
        personName: personContext.name,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error in suggest-gifts function:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack available');
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Une erreur inattendue est survenue',
        success: false,
        debug: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          timestamp: new Date().toISOString()
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});