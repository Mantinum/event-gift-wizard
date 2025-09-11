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

// Simplified Amazon search with detailed debugging
async function searchCanopyAmazonAdvanced(suggestion: GiftSuggestion, canopyApiKey: string): Promise<any> {
  console.log(`🎯 DEBUG: Starting search for: "${suggestion.title}"`);
  
  if (!canopyApiKey) {
    console.log('❌ DEBUG: No Canopy API key available');
    return buildFallbackAmazonData(suggestion);
  }

  try {
    // Use canonical name or title
    const searchTerm = suggestion.canonical_name || suggestion.title;
    console.log(`🔍 DEBUG: Search term: "${searchTerm}"`);
    
    const results = await searchCanopyWithDebug(searchTerm, canopyApiKey);
    
    if (results.length > 0) {
      console.log(`✅ DEBUG: Found ${results.length} results from Canopy`);
      
      // Log all results to see structure
      results.forEach((result, index) => {
        console.log(`🔍 DEBUG: Result ${index + 1}:`, {
          title: result?.title?.substring(0, 60),
          asin: result?.asin,
          ASIN: result?.ASIN,
          productId: result?.productId,
          product_id: result?.product_id,
          id: result?.id,
          url: result?.url,
          price: result?.price,
          hasAnyId: !!(result?.asin || result?.ASIN || result?.productId || result?.product_id)
        });
      });
      
      // Look for any result with an ASIN-like field
      const resultWithAsin = results.find((hit: any) => 
        hit?.asin || hit?.ASIN || hit?.productId || hit?.product_id
      );
      
      if (resultWithAsin) {
        // Normalize ASIN field
        const asin = resultWithAsin.asin || resultWithAsin.ASIN || resultWithAsin.productId || resultWithAsin.product_id;
        console.log(`✅ DEBUG: Found ASIN: ${asin}`);
        
        return {
          asin,
          rating: resultWithAsin.rating,
          reviewCount: resultWithAsin.review_count || resultWithAsin.reviewCount,
          availability: resultWithAsin.availability,
          prime: resultWithAsin.prime || resultWithAsin.isPrime,
          actualPrice: resultWithAsin.price || resultWithAsin.actualPrice,
          imageUrl: resultWithAsin.image_url || resultWithAsin.imageUrl || resultWithAsin.image,
          productUrl: `https://www.amazon.fr/dp/${asin}`,
          addToCartUrl: `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`,
          searchUrl: undefined,
          matchType: 'exact'
        };
      } else {
        console.log(`⚠️ DEBUG: No ASIN found in any result, using fallback`);
        return buildFallbackAmazonData(suggestion);
      }
    } else {
      console.log(`⚠️ DEBUG: No results from Canopy, using fallback`);
      return buildFallbackAmazonData(suggestion);
    }
    
  } catch (error) {
    console.error(`❌ DEBUG: Error in searchCanopyAmazonAdvanced: ${error}`);
    return buildFallbackAmazonData(suggestion);
  }
}

// Search with detailed debugging
async function searchCanopyWithDebug(query: string, canopyApiKey: string): Promise<any[]> {
  const cleanQuery = query.replace(/[^\w\s\-àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]/g, ' ').trim();
  console.log(`🔍 DEBUG: Cleaned query: "${cleanQuery}"`);
  
  if (cleanQuery.length < 3) {
    console.log('❌ DEBUG: Query too short');
    return [];
  }

  const searchQuery = encodeURIComponent(cleanQuery);
  
  // Try REST API first with detailed logging
  try {
    const restUrl = `https://rest.canopyapi.co/api/amazon/search?searchTerm=${searchQuery}&domain=amazon.fr&limit=10`;
    console.log(`📡 DEBUG: Canopy REST URL: ${restUrl}`);

    const response = await fetch(restUrl, {
      headers: {
        'Authorization': `Bearer ${canopyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 DEBUG: REST response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`🔍 DEBUG: Full REST response:`, JSON.stringify(data, null, 2));
      
      const results = data.results || data.products || data.items || data.data || [];
      console.log(`📊 DEBUG: Results array length: ${results.length}`);
      
      if (results.length > 0) {
        console.log(`🔍 DEBUG: First result full structure:`, JSON.stringify(results[0], null, 2));
        return results;
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ DEBUG: REST error: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ DEBUG: REST request failed: ${error}`);
  }

  // Fallback to GraphQL with detailed logging
  console.log(`🔄 DEBUG: Falling back to GraphQL`);
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

    console.log(`📊 DEBUG: GraphQL response status: ${graphqlResponse.status}`);

    if (graphqlResponse.ok) {
      const graphqlData = await graphqlResponse.json();
      console.log(`🔍 DEBUG: Full GraphQL response:`, JSON.stringify(graphqlData, null, 2));
      
      const results = graphqlData.data?.amazon_search?.results || [];
      console.log(`📊 DEBUG: GraphQL results length: ${results.length}`);
      
      if (results.length > 0) {
        console.log(`🔍 DEBUG: GraphQL first result:`, JSON.stringify(results[0], null, 2));
        return results;
      }
    }
  } catch (error) {
    console.error(`❌ DEBUG: GraphQL fallback failed: ${error}`);
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
          console.log(`✅ DEBUG: Enriched "${suggestion.title}" - Match type: ${amazonData.matchType}, ASIN: ${amazonData.asin || 'N/A'}`);
          
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
          console.log(`⚠️ DEBUG: No Amazon data found for "${suggestion.title}"`);
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