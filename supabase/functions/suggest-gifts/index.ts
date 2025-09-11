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
  const brandScore = expectedBrand ? 
    (t.includes(expectedBrand.toLowerCase()) || hit.brand?.toLowerCase() === expectedBrand.toLowerCase() ? 1 : 0) : 0.5;

  const price = hit.price ?? 0;
  const priceScore = targetPrice ? 
    1 / (1 + Math.abs(price - targetPrice) / Math.max(10, targetPrice * 0.3)) : 0.5;

  // Simple bag-of-words matching
  const kw = queryTokens.filter(k => k.length > 2);
  const kwMatch = kw.length ? 
    kw.reduce((acc, k) => acc + (t.includes(k.toLowerCase()) ? 1 : 0), 0) / kw.length : 0.5;

  return 0.5 * brandScore + 0.3 * priceScore + 0.2 * kwMatch;
}

// Sleep function for retry backoff
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Multi-strategy Amazon search with orchestration
async function searchCanopyAmazonAdvanced(suggestion: GiftSuggestion, canopyApiKey: string): Promise<any> {
  console.log(`🎯 Advanced Canopy search for: "${suggestion.title}"`);
  
  if (!canopyApiKey) {
    console.log('❌ No Canopy API key available');
    return null;
  }

  const targetPrice = suggestion.estimatedPrice;
  const expectedBrand = suggestion.brand;
  const queries = [
    suggestion.canonical_name,
    ...(suggestion.search_queries || []),
    suggestion.brand + ' ' + suggestion.title.split(' ').slice(0, 3).join(' ')
  ].filter(Boolean);

  console.log(`🔍 Search queries: ${JSON.stringify(queries)}`);
  console.log(`🎯 Target price: ${targetPrice}, Expected brand: ${expectedBrand}`);

  // Strategy 1: Exact search
  for (const query of queries.slice(0, 2)) {
    console.log(`🔍 Exact search: "${query}"`);
    const results = await searchCanopyWithRetry(query, canopyApiKey, 'exact');
    if (results.length > 0) {
      const scored = results.map((hit: any) => ({
        ...hit,
        score: scoreHit(hit, expectedBrand, targetPrice, query.split(' '))
      })).sort((a: any, b: any) => b.score - a.score);
      
      console.log(`📊 Top result score: ${scored[0]?.score || 0}`);
      if (scored[0]?.score >= 0.62) {
        console.log(`✅ Exact match found with score ${scored[0].score}`);
        return buildAmazonData(scored[0], 'exact');
      }
    }
  }

  // Strategy 2: Relaxed search (remove color/size descriptors)
  for (const query of queries) {
    const relaxedQuery = query
      .replace(/\b(blanc|noir|rouge|bleu|vert|jaune|rose|doré|argenté|gold|silver|white|black|red|blue|green|yellow)\b/gi, '')
      .replace(/\b(petit|grand|mini|maxi|S|M|L|XL)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (relaxedQuery !== query && relaxedQuery.length > 3) {
      console.log(`🔍 Relaxed search: "${relaxedQuery}"`);
      const results = await searchCanopyWithRetry(relaxedQuery, canopyApiKey, 'relaxed');
      if (results.length > 0) {
        const scored = results.map((hit: any) => ({
          ...hit,
          score: scoreHit(hit, expectedBrand, targetPrice, relaxedQuery.split(' '))
        })).sort((a: any, b: any) => b.score - a.score);
        
        console.log(`📊 Top relaxed result score: ${scored[0]?.score || 0}`);
        if (scored[0]?.score >= 0.62) {
          console.log(`✅ Relaxed match found with score ${scored[0].score}`);
          return buildAmazonData(scored[0], 'relaxed');
        }
      }
    }
  }

  // Strategy 3: English translation for international brands
  if (expectedBrand) {
    const englishQuery = `${expectedBrand} ${suggestion.title.split(' ').slice(1, 4).join(' ')}`;
    console.log(`🔍 English search: "${englishQuery}"`);
    const results = await searchCanopyWithRetry(englishQuery, canopyApiKey, 'english');
    if (results.length > 0) {
      const scored = results.map((hit: any) => ({
        ...hit,
        score: scoreHit(hit, expectedBrand, targetPrice, englishQuery.split(' '))
      })).sort((a: any, b: any) => b.score - a.score);
      
      console.log(`📊 Top English result score: ${scored[0]?.score || 0}`);
      if (scored[0]?.score >= 0.58) { // Slightly lower threshold for English
        console.log(`✅ English match found with score ${scored[0].score}`);
        return buildAmazonData(scored[0], 'relaxed');
      }
    }
  }

  console.log(`⚠️ No good match found, falling back to search URL`);
  return buildFallbackAmazonData(suggestion);
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
  return {
    asin,
    rating: hit.rating,
    reviewCount: hit.review_count,
    availability: hit.availability,
    prime: hit.prime,
    actualPrice: hit.price,
    imageUrl: hit.image_url,
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
    const { personId, eventType, budget, additionalContext }: GiftSuggestionRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get person details from database
    const { data: person, error: personError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .single();

    if (personError || !person) {
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
    console.error('Error in suggest-gifts function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Une erreur inattendue est survenue',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});