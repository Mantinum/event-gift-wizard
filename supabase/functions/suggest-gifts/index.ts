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

// Extract ASIN from Amazon URLs
function extractAsinFromUrl(u?: string): string | null {
  if (!u) return null;
  try {
    const m1 = u.match(/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (m1) return m1[1].toUpperCase();
    const m2 = u.match(/\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (m2) return m2[1].toUpperCase();
    const p = new URL(u).searchParams.get('asin');
    if (p && /^[A-Z0-9]{10}$/i.test(p)) return p.toUpperCase();
  } catch {}
  return null;
}

// Improved Amazon search with cleaned queries and retry logic
async function searchCanopyAmazonAdvanced(suggestion: GiftSuggestion, canopyApiKey: string): Promise<any> {
  console.log(`🎯 IMPROVED: Starting search for: "${suggestion.title}"`);
  
  if (!canopyApiKey) {
    console.log('❌ IMPROVED: No Canopy API key available');
    return buildFallbackAmazonData(suggestion);
  }

  try {
    // 1. Canonical cleaning - remove colors, sizes, marketing fluff
    const rawTitle = suggestion.canonical_name || suggestion.title;
    const canonical = rawTitle
      .replace(/\b(blanc|noir|doré|dorée|rose|marron|rouge|bleu|vert|jaune|argent|argenté|gold|silver|white|black|red|blue|green|yellow|brown)\b/gi, '')
      .replace(/\b(taille\s+\w+|petit|grand|mini|maxi|S|M|L|XL)\b/gi, '')
      .replace(/[(),]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    const searchTerm = canonical || rawTitle;
    console.log(`🧹 IMPROVED: Cleaned query: "${rawTitle}" → "${searchTerm}"`);
    
    // 2. Try enhanced search with retry
    let results = await searchCanopyWithRetryAndFallback(searchTerm, canopyApiKey, 'canonical');
    
    // 3. If no results, try English translation for international brands
    if (results.length === 0 && suggestion.brand) {
      const brand = suggestion.brand.trim();
      let englishQuery = searchTerm;
      if (brand) {
        const re = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
        englishQuery = englishQuery.replace(re, '').trim();
        englishQuery = `${brand} ${englishQuery}`.trim();
      }
      console.log(`🌍 IMPROVED: Trying English fallback: "${englishQuery}"`);
      results = await searchCanopyWithRetryAndFallback(englishQuery, canopyApiKey, 'english');
    }
    
    // 3.5. Try LLM search queries variants
    if (results.length === 0 && Array.isArray(suggestion.search_queries) && suggestion.search_queries.length) {
      for (const alt of suggestion.search_queries.slice(0, 5)) {
        console.log(`🧭 VARIANT: Trying LLM search_query "${alt}"`);
        const r = await searchCanopyWithRetryAndFallback(alt, canopyApiKey, 'llm-variant');
        if (r.length) { results = r; break; }
      }
    }
    
    // 4. If still no results, try just the brand
    if (results.length === 0 && suggestion.brand && suggestion.brand.length > 2) {
      console.log(`🏷️ IMPROVED: Trying brand-only: "${suggestion.brand}"`);
      results = await searchCanopyWithRetryAndFallback(suggestion.brand, canopyApiKey, 'brand-only');
    }
    
    if (results.length > 0) {
      console.log(`✅ IMPROVED: Found ${results.length} total results from Canopy`);
      
      // 5. Enhanced scoring with ASIN extraction from URLs
      const enriched = results.map(r => {
        const asin = r.asin || r.ASIN || r.productId || r.product_id || extractAsinFromUrl(r.url);
        if (asin) r.asin = asin; // normalize
        return r;
      });

      const scored = enriched
        .filter(r => r.asin) // only filter after ASIN extraction
        .map(result => {
          const score = calculateProductScore(result, suggestion);
          return { ...result, score };
        })
        .sort((a, b) => b.score - a.score);
      
      console.log(`📊 IMPROVED: Scored results: ${scored.length}, best score: ${scored[0]?.score || 0}`);
      
      // 6. Prioritize direct links if ASIN available
      const bestMatch = scored[0];
      if (bestMatch?.asin) {
        const asin = bestMatch.asin.toUpperCase();
        console.log(`✅ IMPROVED: Selected product with ASIN: ${asin} (score: ${bestMatch.score})`);
        
        return {
          asin,
          rating: bestMatch.rating,
          reviewCount: bestMatch.review_count || bestMatch.reviewCount,
          availability: bestMatch.availability,
          prime: bestMatch.prime || bestMatch.isPrime,
          actualPrice: bestMatch.price || bestMatch.actualPrice,
          imageUrl: bestMatch.image_url || bestMatch.imageUrl || bestMatch.image,
          productUrl: `https://www.amazon.fr/dp/${asin}`,
          addToCartUrl: `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`,
          searchUrl: undefined,
          matchType: bestMatch.score >= 0.70 ? 'exact' : (bestMatch.score >= 0.35 ? 'relaxed' : 'relaxed')
        };
      }
    } else {
      console.log(`❌ IMPROVED: No results found after all attempts`);
    }

    console.log(`🔍 IMPROVED: FALLBACK_SEARCH for: "${searchTerm}"`);
    return buildFallbackAmazonData(suggestion);
    
  } catch (error) {
    console.error(`❌ IMPROVED: Error in search: ${error}`);
    return buildFallbackAmazonData(suggestion);
  }
}

// Enhanced product scoring
function calculateProductScore(result: any, suggestion: GiftSuggestion): number {
  const title = (result.title || "").toLowerCase();
  const brand = suggestion.brand?.toLowerCase();
  const targetPrice = suggestion.estimatedPrice;
  const productPrice = result.price || 0;
  
  // Brand matching (40% weight)
  let brandScore = 0.5;
  if (brand) {
    if (title.includes(brand)) brandScore = 1.0;
    else if (brand.length > 4 && title.includes(brand.substring(0, 4))) brandScore = 0.7;
  }
  
  // Price proximity (30% weight) - more generous tolerance
  let priceScore = 0.5;
  if (targetPrice && productPrice > 0) {
    const priceDiff = Math.abs(productPrice - targetPrice);
    const tolerance = Math.max(30, targetPrice * 0.6); // 60% tolerance
    priceScore = Math.max(0.2, 1 - (priceDiff / tolerance));
  }
  
  // Title keyword matching (30% weight)
  const keywords = suggestion.title.toLowerCase().split(' ').filter(w => w.length > 3);
  const matches = keywords.filter(keyword => title.includes(keyword)).length;
  const keywordScore = keywords.length > 0 ? matches / keywords.length : 0.5;
  
  const totalScore = 0.4 * brandScore + 0.3 * priceScore + 0.3 * keywordScore;
  
  console.log(`📊 IMPROVED: Scoring "${result.title?.substring(0, 40)}": brand=${brandScore.toFixed(2)} price=${priceScore.toFixed(2)} keywords=${keywordScore.toFixed(2)} => ${totalScore.toFixed(2)}`);
  
  return totalScore;
}

// Enhanced search with retry logic and fallback strategies
async function searchCanopyWithRetryAndFallback(query: string, canopyApiKey: string, variant: string): Promise<any[]> {
  const cleanQuery = query.replace(/[^\w\s\-àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]/g, ' ').trim();
  console.log(`🔍 IMPROVED: ${variant} search for: "${cleanQuery}"`);
  
  if (cleanQuery.length < 3) {
    console.log('❌ IMPROVED: Query too short');
    return [];
  }

  const searchQuery = encodeURIComponent(cleanQuery);
  
  // Enhanced REST API with retry logic and multiple URL variants
  const maxRetries = 2;
  const backoffDelays = [300, 800];
  
  const restUrls = [
    `https://rest.canopyapi.co/api/amazon/search?query=${searchQuery}&domain=amazon.fr&limit=10`,
    `https://rest.canopyapi.co/api/amazon/search?query=${searchQuery}&country=FR&limit=10`,
  ];

  for (const restUrl of restUrls) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📡 IMPROVED: REST attempt ${attempt + 1}: ${restUrl}`);

        const response = await fetch(restUrl, {
          headers: {
            'API-KEY': canopyApiKey,
            'X-API-KEY': canopyApiKey,
            'Content-Type': 'application/json'
          }
        });

        console.log(`📊 IMPROVED: REST status: ${response.status}`);
        
        if (response.ok) {
          const payload = await response.json().catch(() => ({}));
          const results = payload.results ?? payload.products ?? payload.items ?? payload.data?.results ?? payload.data ?? [];
          console.log(`📊 IMPROVED: REST returned ${results.length} results`);
          
          if (results.length > 0) {
            // Log first result structure
            console.log(`🔍 IMPROVED: First result sample:`, {
              title: results[0]?.title?.substring(0, 50),
              asin: results[0]?.asin,
              price: results[0]?.price,
              hasAsin: !!(results[0]?.asin || results[0]?.ASIN || results[0]?.productId)
            });
            return results;
          }
        } else if (response.status >= 500 && attempt < maxRetries) {
          console.log(`⏳ IMPROVED: Server error, retrying in ${backoffDelays[attempt]}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelays[attempt]));
          continue;
        } else {
          const errorText = await response.text();
          console.log(`❌ IMPROVED: REST error: ${response.status} - ${errorText}`);
          break;
        }
      } catch (error) {
        console.log(`❌ IMPROVED: REST request failed (attempt ${attempt + 1}): ${error}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, backoffDelays[attempt]));
        }
      }
    }
  }

  // Fallback to GraphQL
  console.log(`🔄 IMPROVED: Falling back to GraphQL for ${variant}`);
  try {
    // Try primary GraphQL schema first
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

    console.log(`📊 IMPROVED: GraphQL status: ${graphqlResponse.status}`);

    if (graphqlResponse.ok) {
      const graphqlData = await graphqlResponse.json();
      const results = graphqlData.data?.amazon_search?.results || [];
      console.log(`📊 IMPROVED: GraphQL returned ${results.length} results`);
      
      if (results.length > 0) {
        console.log(`🔍 IMPROVED: GraphQL first result:`, {
          title: results[0]?.title?.substring(0, 50),
          asin: results[0]?.asin,
          price: results[0]?.price
        });
        return results;
      }
    } else {
      const errorText = await graphqlResponse.text();
      console.log(`❌ IMPROVED: Primary GraphQL error: ${errorText}`);
    }

    // Try alternative GraphQL schema if primary failed
    console.log(`🔄 IMPROVED: Trying alternative GraphQL schema`);
    const graphqlQueryAlt = `
      query Search($q: String!) {
        amazonSearch(q: $q, country: FR, limit: 10) {
          results { title asin price rating review_count availability prime image_url url }
        }
      }
    `;
    
    const gqlAltResponse = await fetch('https://graphql.canopyapi.co/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${canopyApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: graphqlQueryAlt,
        variables: { q: cleanQuery }
      })
    });
    
    if (gqlAltResponse.ok) {
      const altData = await gqlAltResponse.json();
      const altResults = altData.data?.amazonSearch?.results ?? [];
      console.log(`📊 IMPROVED: Alternative GraphQL returned ${altResults.length} results`);
      if (altResults.length > 0) {
        return altResults;
      }
    } else {
      const altErrorText = await gqlAltResponse.text();
      console.log(`❌ IMPROVED: Alternative GraphQL error: ${altErrorText}`);
    }

  } catch (error) {
    console.error(`❌ IMPROVED: GraphQL fallback failed: ${error}`);
  }

  return [];
}

// Build fallback Amazon data for search-only
function buildFallbackAmazonData(suggestion: GiftSuggestion): any {
  const searchQuery = suggestion.canonical_name || suggestion.title;
  console.log(`🔍 DEBUG: Building fallback search URL for: "${searchQuery}"`);
  
  return {
    searchUrl: `https://www.amazon.fr/s?k=${encodeURIComponent(searchQuery)}`,
    matchType: 'search'
  };
}

// Enrich suggestions with Canopy Amazon search
async function enrichWithCanopyAmazon(suggestions: GiftSuggestion[], canopyApiKey: string): Promise<GiftSuggestion[]> {
  console.log(`🔑 DEBUG: CANOPY_API_KEY available: ${!!canopyApiKey}`);
  console.log(`📊 DEBUG: Processing ${suggestions.length} suggestions`);

  if (!canopyApiKey) {
    console.log('❌ DEBUG: No Canopy API key available for enrichment');
    return suggestions;
  }

  const enrichedSuggestions = await Promise.all(
    suggestions.map(async (suggestion, index) => {
      try {
        console.log(`🔍 DEBUG: Processing suggestion ${index + 1}: "${suggestion.title}"`);
        console.log(`📊 DEBUG: Brand: ${suggestion.brand}, Canonical: ${suggestion.canonical_name}`);
        
        const amazonData = await searchCanopyAmazonAdvanced(suggestion, canopyApiKey);
        
        if (amazonData) {
          suggestion.amazonData = amazonData;
          
          if (amazonData.asin) {
            console.log(`✅ IMPROVED: Enriched "${suggestion.title}" with ASIN: ${amazonData.asin} (${amazonData.matchType})`);
            // Replace purchase links with direct Amazon links
            suggestion.purchaseLinks = [
              amazonData.productUrl,
              amazonData.addToCartUrl,
              ...suggestion.purchaseLinks.filter(link => 
                !link.includes('amazon.fr/s?k=') && 
                !link.includes('amazon.fr/dp/') && 
                !link.includes('amazon.fr/gp/aws/cart')
              )
            ].filter(Boolean);
          } else {
            console.log(`🔍 IMPROVED: Enriched "${suggestion.title}" with search fallback`);
            if (amazonData.searchUrl && !suggestion.purchaseLinks.includes(amazonData.searchUrl)) {
              suggestion.purchaseLinks.push(amazonData.searchUrl);
            }
          }
        } else {
          console.log(`⚠️ IMPROVED: No Amazon data found for "${suggestion.title}"`);
        }
      } catch (error) {
        console.error(`❌ DEBUG: Error enriching suggestion "${suggestion.title}":`, error);
      }
      return suggestion;
    })
  );

  console.log(`✅ DEBUG: Canopy enrichment completed. Suggestions processed: ${enrichedSuggestions.length}`);
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
    console.log('🚀 DEBUG: Starting suggest-gifts function...');
    
    const requestBody = await req.json();
    console.log('📝 DEBUG: Request body received:', JSON.stringify(requestBody));
    
    const { personId, eventType, budget, additionalContext }: GiftSuggestionRequest = requestBody;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('🔑 DEBUG: Environment check - Supabase URL available:', !!supabaseUrl);
    console.log('🔑 DEBUG: Environment check - Supabase Key available:', !!supabaseKey);
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📝 DEBUG: Person query starting...');
    // Get person details from database
    const { data: person, error: personError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .single();

    console.log('📝 DEBUG: Person query result:', { person: person?.name, error: personError });

    if (personError || !person) {
      console.error('❌ DEBUG: Person not found:', personError);
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
    console.log('DEBUG: Allowed categories derived from interests:', allowedCategories);

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

    console.log('DEBUG: Calling OpenRouter API for gift suggestions...');

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
      console.error(`DEBUG: OpenRouter API error (${response.status}):`, errorText);
      throw new Error(`Erreur API OpenRouter: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('DEBUG: OpenRouter response:', JSON.stringify(data, null, 2));

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Réponse vide de l\'API OpenRouter');
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('DEBUG: Erreur parsing JSON:', parseError);
      console.error('DEBUG: Contenu reçu:', content);
      throw new Error('Format de réponse invalide');
    }

    if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
      throw new Error('Format de suggestions invalide');
    }

    let suggestions: GiftSuggestion[] = parsedResponse.suggestions;

    // Enrich suggestions with Canopy Amazon data
    const canopyApiKey = Deno.env.get('CANOPY_API_KEY');
    if (canopyApiKey) {
      console.log('DEBUG: Starting Canopy enrichment...');
      suggestions = await enrichWithCanopyAmazon(suggestions, canopyApiKey);
    } else {
      console.log('DEBUG: No Canopy API key, skipping enrichment');
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
    console.error('❌ DEBUG: Error in suggest-gifts function:', error);
    console.error('❌ DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack available');
    console.error('❌ DEBUG: Error message:', error instanceof Error ? error.message : String(error));
    
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