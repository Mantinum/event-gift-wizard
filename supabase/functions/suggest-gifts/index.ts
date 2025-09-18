import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Nouvelles fonctions utilitaires pour l'approche basée sur les vrais produits Amazon

function generateTargetedSearchQueries(personData: any, eventType: string, budget: number): string[] {
  const queries = [];
  const interests = personData.interests || [];
  const notes = personData.notes || '';
  const age = personData.age_years || 0;
  const timestamp = Date.now();
  
  // Ajouter de la randomisation avec des variantes de requêtes
  const randomVariants = [
    ['nouveau', 'moderne', 'tendance'],
    ['original', 'unique', 'créatif'],
    ['pratique', 'utile', 'fonctionnel'],
    ['premium', 'qualité', 'haut de gamme']
  ];
  
  const getRandomVariant = () => {
    const category = randomVariants[Math.floor(Math.random() * randomVariants.length)];
    return category[Math.floor(Math.random() * category.length)];
  };
  
  // Queries basées sur les centres d'intérêt avec randomisation
  if (interests.includes('Tech')) {
    const variants = budget > 80 
      ? [`gadget technologique ${getRandomVariant()}`, `accessoire high tech ${getRandomVariant()}`]
      : [`accessoire tech ${getRandomVariant()}`, `gadget connecté ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  }
  
  if (interests.includes('Sport')) {
    const variants = [`équipement sport ${getRandomVariant()}`, `accessoire fitness ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  }
  
  if (interests.includes('Lecture')) {
    const variants = [`livre ${getRandomVariant()} 2025`, `accessoire lecture ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  }
  
  if (interests.includes('Cuisine')) {
    const variants = [`ustensile cuisine ${getRandomVariant()}`, `accessoire gourmand ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  }
  
  if (interests.includes('Jardinage')) {
    const variants = [`kit jardinage ${getRandomVariant()}`, `plante cadeau ${getRandomVariant()}`, `outil jardin ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5).slice(0, 2));
  }
  
  if (interests.includes('Artisanat')) {
    const variants = [`kit créatif DIY ${getRandomVariant()}`, `matériel artisanat ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  }
  
  if (interests.includes('Mode')) {
    const variants = [`accessoire mode ${getRandomVariant()}`, `bijou ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  }
  
  if (interests.includes('Enfance') || interests.includes('Bébé')) {
    const variants = [`jouet éveil bébé ${getRandomVariant()}`, `livre enfant ${getRandomVariant()}`, `vêtement bébé ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5).slice(0, 2));
  }
  
  // Queries basées sur les notes avec randomisation
  if (notes.toLowerCase().includes('nature')) {
    const variants = [`produit écologique ${getRandomVariant()}`, `accessoire nature ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  }
  
  if (notes.toLowerCase().includes('musique')) {
    const variants = [`accessoire musique ${getRandomVariant()}`, `instrument débutant ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  }
  
  // Queries basées sur l'âge avec randomisation
  if (age > 60) {
    const variants = [`cadeau senior ${getRandomVariant()}`, `accessoire bien-être ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  } else if (age > 30) {
    const variants = [`cadeau adulte ${getRandomVariant()}`, `accessoire maison ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  } else if (age > 15) {
    const variants = [`cadeau jeune adulte ${getRandomVariant()}`, `accessoire ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  }
  
  // Queries basées sur l'événement avec randomisation
  if (eventType === 'birthday') {
    const variants = [`cadeau anniversaire ${getRandomVariant()}`, `idée cadeau personnalisé ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  }
  
  if (eventType === 'wedding') {
    const variants = [`cadeau mariage ${getRandomVariant()}`, `décoration maison ${getRandomVariant()}`];
    queries.push(...variants.sort(() => Math.random() - 0.5));
  }
  
  // Queries génériques de fallback avec randomisation
  if (queries.length < 3) {
    const fallbackVariants = [
      `cadeau ${getRandomVariant()} ${timestamp % 1000}`, 
      `idée cadeau ${getRandomVariant()}`, 
      `accessoire ${getRandomVariant()}`
    ];
    queries.push(...fallbackVariants.sort(() => Math.random() - 0.5));
  }
  
  // Mélanger toutes les requêtes et ajouter un élément de temps pour garantir la variété
  const finalQueries = queries
    .map(q => `${q} ${Math.random() > 0.7 ? getRandomVariant() : ''}`.trim())
    .sort(() => Math.random() - 0.5)
    .slice(0, 8); // Max 8 requêtes
    
  console.log('🎲 Requêtes randomisées générées:', finalQueries);
  return finalQueries;
}

// Recherche de produits Amazon avec RainforestAPI
async function searchAmazonProductsRainforest(
  query: string, 
  minPrice: number, 
  maxPrice: number, 
  rainforestApiKey: string
): Promise<any[]> {
  try {
    console.log(`🌧️ RainforestAPI - Recherche Amazon: "${query}" (${minPrice}€-${maxPrice}€)`);
    
    const searchUrl = `https://api.rainforestapi.com/request?api_key=${rainforestApiKey}&type=search&amazon_domain=amazon.fr&search_term=${encodeURIComponent(query)}&min_price=${minPrice}&max_price=${maxPrice}`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      console.error(`❌ RainforestAPI error: ${response.status} - ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    if (data.request_info?.success === false) {
      console.error('❌ RainforestAPI error:', data.request_info?.message);
      return [];
    }

    const products = (data.search_results || [])
      .filter((item: any) => {
        if (!item.asin) return false;
        // Filter by price if available
        if (!item.price) return true;
        const price = parseFloat(String(item.price?.value || item.price || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
        return Number.isFinite(price) ? (price >= minPrice && price <= maxPrice) : true;
      })
      .map((item: any) => {
        const asinFromField = toAsin(item.asin);
        const asinFromLink = extractAsinFromUrl(item.link);
        const asin = isValidAsin(asinFromLink) ? asinFromLink : asinFromField;
        
        // Prioriser les liens directs DP quand possible avec validation ASIN
        const directLink = item.link && item.link.includes('/dp/')
          ? item.link
          : (isValidAsin(asin) ? `https://www.amazon.fr/dp/${asin}` : undefined);
        
        return {
          title: item.title,
          price: parseFloat(String(item.price?.value || item.price || '0').replace(/[^\d.,]/g, '').replace(',', '.')),
          asin,
          rating: item.rating,
          reviewCount: item.reviews_count,
          imageUrl: item.image,
          link: directLink ?? item.link ?? null, // Garder DP si possible
          snippet: item.snippet,
          description: item.snippet,
          displayDescription: item.snippet || null
        };
      })
      .slice(0, 5); // Max 5 produits par requête
    
    console.log(`📦 RainforestAPI - Products found for "${query}": ${products.length}`);
    return products;
  } catch (error) {
    console.error(`❌ Erreur RainforestAPI lors de la recherche Amazon pour "${query}":`, error);
    return [];
  }
}

// Recherche de produits Amazon avec SerpApi et fallback RainforestAPI
async function searchAmazonProducts(query: string, serpApiKey: string | undefined, minPrice: number, maxPrice: number, rainforestApiKey?: string) {
  let products: any[] = [];
  
  // Essayer SerpAPI en premier si disponible
  if (serpApiKey) {
    try {
      console.log(`🔍 Recherche Amazon (SerpAPI): "${query}" (${minPrice}€-${maxPrice}€)`);
      
      const params = new URLSearchParams({
        engine: 'amazon',
        amazon_domain: 'amazon.fr',
        language: 'fr_FR',
        k: query,
        low_price: minPrice.toString(),
        high_price: maxPrice.toString(),
        api_key: serpApiKey,
      });
      
      const response = await fetch(`https://serpapi.com/search.json?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (!data.error) {
          const results = data.organic_results || [];
          
          products = results
            .filter((item: any) => {
              if (!item.asin) return false;
              if (!item.price) return true;
              const price = parseFloat(String(item.price).replace(/[^\d,]/g, '').replace(',', '.'));
              return Number.isFinite(price) ? (price >= minPrice && price <= maxPrice) : true;
            })
            .map((item: any) => {
              const asinFromField = toAsin(item.asin);
              const asinFromLink = extractAsinFromUrl(item.link);
              const asin = isValidAsin(asinFromLink) ? asinFromLink : asinFromField;
              
              // Prioriser les liens directs DP quand possible avec validation ASIN
              const directLink = item.link && item.link.includes('/dp/')
                ? item.link
                : (isValidAsin(asin) ? `https://www.amazon.fr/dp/${asin}` : undefined);
              
              return {
                title: item.title,
                price: parseFloat(String(item.price || '0').replace(/[^\d,]/g, '').replace(',', '.')),
                asin,
                rating: item.rating,
                reviewCount: item.reviews_count,
                imageUrl: item.thumbnail,
                link: directLink ?? item.link ?? null, // Garder DP si possible
                snippet: item.snippet,
                description: item.description,
                displayDescription: item.snippet || item.description || null
              };
            })
            .slice(0, 5);
          
          console.log(`✅ SerpAPI - ${products.length} produits trouvés pour "${query}"`);
          
          if (products.length > 0) {
            return products;
          }
        } else {
          console.warn(`⚠️ SerpAPI error: ${data.error}, trying RainforestAPI...`);
        }
      } else {
        console.warn(`⚠️ SerpAPI HTTP error: ${response.status}, trying RainforestAPI...`);
      }
    } catch (error) {
      console.warn(`⚠️ SerpAPI exception: ${error}, trying RainforestAPI...`);
    }
  }
  
  // Fallback vers RainforestAPI si SerpAPI a échoué ou n'est pas disponible
  if (rainforestApiKey && products.length === 0) {
    products = await searchAmazonProductsRainforest(query, minPrice, maxPrice, rainforestApiKey);
  }
  
  return products;
}

function diversifyProducts(products: any[], maxProducts: number) {
  // Supprimer les doublons par ASIN
  const uniqueProducts = products.filter((product, index, self) => 
    index === self.findIndex(p => p.asin === product.asin)
  );
  
  // Trier par pertinence (prix médian et note élevée)
  uniqueProducts.sort((a, b) => {
    const scoreA = (a.rating || 3) * (a.reviewCount || 1);
    const scoreB = (b.rating || 3) * (b.reviewCount || 1);
    return scoreB - scoreA;
  });
  
  return uniqueProducts.slice(0, maxProducts);
}

// Helper functions for affiliate links and ASIN validation
const partnerTag = Deno.env.get('AMZ_PARTNER_TAG') || '';
const partnerTagActive = (Deno.env.get('AMZ_PARTNER_TAG_ACTIVE') || 'false').toLowerCase() === 'true';

function appendQuery(url: string, key: string, value: string) {
  const u = new URL(url);
  if (value) u.searchParams.set(key, value);
  return u.toString();
}

function withAffiliate(url: string) {
  return (partnerTagActive && partnerTag) ? appendQuery(url, 'tag', partnerTag) : url;
}

// Helpers robustes pour ASIN
const toAsin = (a?: string) => (a || '').toUpperCase().trim();
const ASIN_RE = /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i;
const isValidAsin = (a?: string) => /^[A-Z0-9]{10}$/.test(toAsin(a));

function extractAsinFromUrl(url?: string) {
  if (!url) return null;
  const m = url.match(ASIN_RE);
  return m ? toAsin(m[1]) : null;
}
const normalizeTitle = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Fonction de similarité pour fuzzy matching
function similarity(a: string, b: string) {
  const A = new Set(normalizeTitle(a).split(' ').filter(x => x.length > 1));
  const B = new Set(normalizeTitle(b).split(' ').filter(x => x.length > 1));
  const inter = [...A].filter(x => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni ? inter / uni : 0;
}

function bestPoolMatchByTitle(title: string, pool: any[], threshold = 0.45) {
  let best = null, bestScore = 0;
  for (const p of pool) {
    const score = similarity(title, p.title || '');
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return bestScore >= threshold ? best : null;
}

serve(async (req) => {
  console.log('🚀 Function started successfully');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Force POST method
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed',
      method: req.method
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('📥 Processing request...');
  // Redact Authorization in logs
  const safeHeaders = Object.fromEntries(
    [...req.headers.entries()].map(([k,v]) => k.toLowerCase()==='authorization' ? [k,'REDACTED'] : [k,v])
  );
  console.log('🔑 Headers:', safeHeaders);
    
    // 2. Parse body with try/catch
    let body: any = {};
    try {
      const requestText = await req.text();
      console.log('📥 Raw request body:', requestText);
      console.log('📥 Content-Type:', req.headers.get('content-type'));
      
      if (!requestText) {
        console.log('❌ Empty request body');
        return new Response(JSON.stringify({
          success: false,
          error: 'Empty request body'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      body = JSON.parse(requestText);
      console.log('✅ Parsed body:', body);
    } catch (parseError) {
      console.log('❌ Invalid JSON body:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON body - ' + (parseError as Error).message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { personId, eventType, budget, additionalContext } = body;
    
    // 3. Validate required parameters
    if (!personId || typeof eventType !== 'string' || typeof budget !== 'number') {
      console.log('❌ Missing or invalid parameters:', { personId, eventType, budget });
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing or invalid parameters',
        details: { personId, eventType, budget }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // 4. Check environment variables
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const serpApiKey = Deno.env.get('SERPAPI_API_KEY');
    const rainforestApiKey = Deno.env.get('RAINFOREST_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('🔑 Environment check:');
    console.log('- OpenAI Key available:', !!openAIKey);
    console.log('- SerpApi Key available:', !!serpApiKey);
    console.log('- RainforestAPI Key available:', !!rainforestApiKey);
    console.log('- Supabase URL available:', !!supabaseUrl);
    console.log('- Supabase Key available:', !!supabaseKey);
    
    if (!openAIKey) {
      console.log('❌ Missing OpenAI API key');
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration manquante: clé OpenAI non configurée'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!serpApiKey && !rainforestApiKey) {
      console.log('❌ Missing both SerpApi and RainforestAPI keys');
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration manquante: au moins une clé API de recherche (SerpApi ou RainforestAPI) est requise'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Missing Supabase environment variables');
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration manquante: variables Supabase non configurées'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get service role key for database access (bypasses RLS)
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      console.log('❌ Missing Supabase Service Role key');
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration manquante: clé service Supabase non configurée'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('📋 Request data:', { personId, eventType, budget, additionalContext });

    // 5. Check authentication and AI usage limits
    console.log('🔒 Checking authentication and usage limits...');
    
    // With verify_jwt = true, Supabase automatically verifies the JWT
    // and provides the user in the request context
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ No authorization header');
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication requise'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    // Create supabase client for user operations
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    console.log('👤 User:', user?.id);
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication échouée'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    // Check AI usage limits using the database function
    console.log('🎯 Checking AI usage limits for user:', user.id);
    const { data: usageResult, error: usageError } = await supabase
      .rpc('check_and_increment_ai_usage', { p_user_id: user.id });

    console.log('📊 Usage check result:', usageResult);
    console.log('❌ Usage check error:', usageError);

    if (usageError) {
      console.error('❌ Error checking usage limits:', usageError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la vérification des limites d\'utilisation'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!usageResult.allowed) {
      console.log('❌ Usage limit exceeded for user:', user.id);
      return new Response(JSON.stringify({
        success: false,
        error: 'Limite quotidienne dépassée',
        details: {
          limit: usageResult.limit,
          remaining: usageResult.remaining,
          role: usageResult.role,
          resetTime: usageResult.reset_time
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429
      });
    }

    console.log('✅ Usage allowed. Remaining:', usageResult.remaining);

    // Fetch person data from database
    console.log('🔍 Fetching person data for ID:', personId);
    const { data: personData, error: personError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data found

    console.log('📊 Database response - Data:', personData);
    console.log('📊 Database response - Error:', personError);

    if (personError) {
      console.error('❌ Database error:', personError.message, personError.code);
      return new Response(JSON.stringify({
        success: false,
        error: 'DB error',
        details: personError.message,
        code: personError.code
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!personData) {
      console.error('❌ Person not found with ID:', personId);
      return new Response(JSON.stringify({
        success: false,
        error: 'Person not found',
        personId: personId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('👤 Person data:', personData);

    // 🔄 NOUVELLE APPROCHE: D'abord chercher les vrais produits Amazon, puis l'IA choisit parmi eux
    console.log('🔍 Étape 1: Recherche préliminaire de produits Amazon dans le budget');
    
    const maxBudget = budget;
    const minBudget = Math.max(15, Math.round(budget * 0.7)); // Minimum 70% du budget pour éviter les produits trop bas
    
    // Générer des requêtes de recherche ciblées basées sur le profil
    const searchQueries = generateTargetedSearchQueries(personData, eventType, budget);
    console.log('📝 Requêtes de recherche générées:', searchQueries);
    
    // Chercher des produits réels sur Amazon pour chaque requête
    const availableProducts = [];
    
    if (serpApiKey || rainforestApiKey) {
      for (const query of searchQueries.slice(0, 6)) { // Limiter à 6 requêtes max
        try {
          const results = await searchAmazonProducts(query, serpApiKey, minBudget, maxBudget, rainforestApiKey);
          
          if (results && results.length > 0) {
            availableProducts.push(...results.slice(0, 3)); // Max 3 produits par requête
            console.log(`✅ ${results.length} produits trouvés pour "${query}"`);
          }
        } catch (error) {
          console.error(`❌ Erreur recherche "${query}":`, error);
        }
      }
    }
    
    console.log(`📦 Total produits disponibles: ${availableProducts.length}`);
    
    // Limiter drastiquement les produits pour éviter limite tokens
    const selectedProducts = diversifyProducts(availableProducts, 4);
    if (selectedProducts.length === 0) {
      console.warn('⚠️ Aucun produit trouvé via les APIs de recherche : on fera des liens de recherche Amazon taggés');
    }

    // 🎯 Étape 2: Indexation des produits pour retrouver les liens directs
    const allPool = [...availableProducts, ...selectedProducts];
    const byAsin = new Map(allPool.filter(p => p.asin).map(p => [p.asin, p]));
    const byTitle = new Map(allPool.map(p => [normalizeTitle(p.title || ''), p]));
    
    // Build enhanced context with personal notes priority
    const personalNotes = personData.notes || '';
    const contextInfo = personalNotes 
      ? `Notes personnelles: "${personalNotes}"`
      : `Âge: ${personData.age_years || '?'} ans, Intérêts: ${personData.interests?.slice(0,3).join(', ') || 'N/A'}, Relation: ${personData.relationship || 'N/A'}`;

    const prompt = `Sélectionne 3 produits pour ${personData.name}.
${contextInfo}
Événement: ${eventType}, Budget: ${minBudget}-${maxBudget}€

PRODUITS DISPONIBLES:
${selectedProducts.map((p, i) => `${i+1}. ${p.title.substring(0, 50)} - ${p.price}€ (ASIN: ${p.asin})`).join('\n')}

IMPORTANT: Tu DOIS choisir uniquement parmi les PRODUITS DISPONIBLES ci-dessus.
Renvoie l'ASIN exactement tel qu'affiché. N'invente jamais d'ASIN.
${personalNotes ? 'Utilise prioritairement les notes personnelles pour choisir les produits les plus adaptés.' : 'Base-toi sur les centres d\'intérêt et l\'âge pour faire les meilleurs choix.'}

JSON obligatoire:`;

    // JSON schema simplifié pour éviter limite tokens
    const responseSchema = {
      type: "json_schema",
      json_schema: {
        name: "gift_selection",
        strict: true,
        schema: {
          type: "object",
          properties: {
            selections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  selectedTitle: {
                    type: "string"
                  },
                  selectedPrice: {
                    type: "integer"
                  },
                  selectedAsin: {
                    type: "string"
                  },
                  confidence: {
                    type: "number",
                    minimum: 0,
                    maximum: 1
                  }
                },
                required: ["selectedTitle", "selectedPrice", "selectedAsin", "confidence"],
                additionalProperties: false
              },
              minItems: 3,
              maxItems: 3
            }
          },
          required: ["selections"],
          additionalProperties: false
        }
      }
    };

    // Call OpenAI API with forced JSON response
    // Ajouter de la randomisation dans le prompt pour l'IA
    const randomPromptVariation = Math.floor(Math.random() * 3);
    let promptVariation = '';
    
    switch(randomPromptVariation) {
      case 0:
        promptVariation = 'Sois créatif et évite les choix évidents.';
        break;
      case 1:
        promptVariation = 'Privilégie la diversité et l\'originalité dans tes sélections.';
        break;
      case 2:
        promptVariation = 'Explore des options variées et inattendues.';
        break;
    }

    // Fonction pour appeler OpenAI Chat Completions
    async function callChatCompletions(model: string, maxTokens = 1200, userPrompt = prompt) {
      return fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openAIKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: `Sélectionne 3 produits parmi la liste fournie. Tu DOIS choisir uniquement parmi les PRODUITS DISPONIBLES. Renvoie l'ASIN exactement tel qu'affiché. N'invente jamais d'ASIN. Sois concis. Réponds UNIQUEMENT avec un JSON valide sans texte supplémentaire. Format JSON exact: {"suggestions":[{ "title": "...", "price": 0, "asin": "<UN DES ASIN DE LA LISTE>", "confidence": 0.0, "reasoning": "..." }, ...3 au total]}. ${promptVariation}` },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });
    }

    console.log('🤖 Calling OpenAI with GPT-4o-mini (stable model)');
    let modelUsed = 'gpt-4o-mini';
    // Utiliser Chat Completions directement pour plus de stabilité
    let openAIResponse = await callChatCompletions(modelUsed, 1200);

    if (!openAIResponse.ok) {
      // Lis le JSON d'erreur proprement
      let errJson: any = {};
      try { errJson = await openAIResponse.json(); } catch { /* ignore */ }
      const type = errJson?.error?.type;
      const param = errJson?.error?.param;
      const code = errJson?.error?.code;
      const msg  = errJson?.error?.message || (await openAIResponse.text().catch(()=>'')) || 'Unknown error';
      console.error('❌ OpenAI error:', openAIResponse.status, type, code, param, msg);

      // Gestion des erreurs spécifiques
      if (openAIResponse.status === 400 && /context_length|maximum context length|too long/i.test(msg)) {
        console.warn('⚠️ Contexte trop long → compression du prompt et retry');
        // Réduire le prompt en gardant seulement 3 produits
        const shorterProducts = selectedProducts.slice(0, 3);
        const promptShort = `Sélectionne 3 produits pour ${personData.name}.
${contextInfo}
Événement: ${eventType}, Budget: ${minBudget}-${maxBudget}€
PRODUITS:
${shorterProducts.map((p, i) => `${i+1}. ${p.title.substring(0, 40)} (${p.asin})`).join('\n')}
JSON: {"selections":[{ "selectedTitle": "...", "selectedPrice": 0, "selectedAsin": "...", "confidence": 0.0 }, ...3]}`;
        
        openAIResponse = await callChatCompletions(modelUsed, 900, promptShort);
        if (!openAIResponse.ok) {
          const err3 = await openAIResponse.text();
          console.error('❌ Retry après compression a échoué:', openAIResponse.status, err3);
          return new Response(JSON.stringify({
            success: false,
            error: 'OpenAI error after context compression',
            status: openAIResponse.status,
            details: err3
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else {
        // autre erreur : on renvoie l'info utile
        return new Response(JSON.stringify({
          success: false,
          error: 'OpenAI error',
          status: openAIResponse.status,
          details: msg,
          type
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Parse la réponse (endpoints différents)
    let suggestions = [];
    try {
      const openAIData = await openAIResponse.json();
      console.log('✅ OpenAI response received');
      console.log('🧠 model:', openAIData.model || modelUsed);

      // Vérifier si la réponse a été tronquée
      const finishReason = openAIData.choices?.[0]?.finish_reason;
      if (finishReason === 'length') {
        console.warn('⚠️ Troncature détectée → retry avec plus de tokens');
        const retry = await callChatCompletions(modelUsed, 1600, prompt);
        if (retry.ok) {
          const retryData = await retry.json();
          openAIData.choices = retryData.choices;
        }
      }
      
      // Extraction et nettoyage du contenu AI
      let aiContent = openAIData.choices?.[0]?.message?.content ?? '';
      console.log('🧠 AI content length:', aiContent.length);
      console.log('📝 AI content preview:', aiContent.substring(0, 200));
      
      // Validation du contenu AI
      if (!aiContent || aiContent.trim().length === 0) {
        console.error('❌ Réponse AI vide détectée');
        console.error('🔍 Structure OpenAI complète:', JSON.stringify(openAIData, null, 2));
        return new Response(JSON.stringify({
          success: false,
          error: 'Réponse AI vide',
          details: 'L\'IA n\'a généré aucun contenu',
          debug: {
            hasChoices: !!openAIData.choices,
            choicesLength: openAIData.choices?.length || 0,
            finishReason: finishReason,
            model: openAIData.model
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Nettoyage du contenu AI (suppression des markdown fences)
      const cleanedContent = aiContent.trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      
      console.log('🧽 Contenu nettoyé:', cleanedContent.substring(0, 100));
      
      // Parsing JSON sécurisé
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedContent);
      } catch (jsonError) {
        console.error('❌ Erreur parsing JSON:', jsonError);
        console.error('🔍 Contenu original:', aiContent);
        console.error('🔍 Contenu nettoyé:', cleanedContent);
        throw new Error(`Erreur parsing JSON: ${(jsonError as Error).message}`);
      }
      
      // Parser tolérant - accepte "suggestions" ou "selections" 
      const rawSuggestions = Array.isArray(parsedResponse?.suggestions)
        ? parsedResponse.suggestions
        : Array.isArray(parsedResponse?.selections)
          ? parsedResponse.selections
          : [];

      console.log('🎯 Parsed direct suggestions count:', rawSuggestions.length);
      
      // Créer un set des ASINs autorisés (du pool)
      const allowedAsins = new Set(selectedProducts.map(p => toAsin(p.asin)));
      
      // Normaliser et réconcilier les suggestions IA
      const directSuggestions = rawSuggestions.map((raw: any) => ({
        title: raw.title ?? raw.selectedTitle ?? '',
        asin: toAsin(raw.asin ?? raw.selectedAsin ?? ''),
        price: raw.price ?? raw.selectedPrice ?? 0,
        confidence: raw.confidence ?? 0.5,
        reasoning: raw.reasoning ?? ''
      }));
      
      // Remplacement / rejet si ASIN hors pool
      const reconciled = directSuggestions.map(s => {
        if (allowedAsins.has(s.asin)) return s; // OK, ASIN trouvé dans le pool
        
        // Tentative de rattrapage par titre → récupérer un produit du pool
        const match = bestPoolMatchByTitle(s.title, selectedProducts);
        if (match) {
          console.log(`🔄 Réconciliation: "${s.title}" → "${match.title}" (ASIN: ${match.asin})`);
          return { 
            ...s, 
            asin: toAsin(match.asin), 
            title: match.title, 
            price: match.price 
          };
        }
        
        // Rien trouvé → on refuse (évite les dp 404)
        console.warn(`❌ Rejet suggestion: "${s.title}" - ASIN "${s.asin}" hors pool et pas de match par titre`);
        return null;
      }).filter(Boolean);
      
      if (reconciled.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: "Aucune suggestion valide : tous les ASINs sont hors liste"
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      if (reconciled.length < 3) {
        // Compléter avec des produits du pool si pas assez de suggestions
        const usedAsins = new Set(reconciled.map(r => r.asin));
        const remainingProducts = selectedProducts.filter(p => !usedAsins.has(toAsin(p.asin)));
        
        while (reconciled.length < 3 && remainingProducts.length > 0) {
          const randomProduct = remainingProducts.splice(Math.floor(Math.random() * remainingProducts.length), 1)[0];
          reconciled.push({
            title: randomProduct.title,
            asin: toAsin(randomProduct.asin),
            price: randomProduct.price || 0,
            confidence: 0.7,
            reasoning: `Produit sélectionné automatiquement pour ${personData.name} selon son profil.`
          });
        }
      }

      // Convert reconciled suggestions to final format
      suggestions = reconciled.slice(0, 3).map((suggestion: any) => {
        console.log('🔍 Processing suggestion:', {
          title: suggestion.title,
          asin: suggestion.asin,
          price: suggestion.price
        });
        
        // Generate enhanced description based on product title and person profile
        const generateEnhancedDescription = (title: string, reasoning: string, person: any) => {
          console.log('🔍 Génération description enrichie:', { 
            title, 
            reasoning: reasoning?.substring(0, 100)
          });
          
          // PRIORITÉ 1: Utiliser le raisonnement de l'IA s'il est pertinent
          if (reasoning && reasoning.length > 20 && !reasoning.includes('sélectionné pour') && !reasoning.toLowerCase().includes('generic')) {
            console.log('✅ Utilisation raisonnement IA:', reasoning);
            return reasoning;
          }
          
          const interests = person.interests || [];
          const age = person.age_years || 0;
          const name = person.name;
          const lowerTitle = title.toLowerCase();
          
          // PRIORITÉ 2: Détection intelligente du type de produit à partir du titre
          
          // Produits de randonnée/sport outdoor
          if (lowerTitle.includes('sac') && (lowerTitle.includes('dos') || lowerTitle.includes('randonnée') || lowerTitle.includes('camping'))) {
            return `Un sac à dos de qualité pour accompagner ${name} dans ses aventures en plein air. Résistant et pratique, il sera l'allié parfait pour ses escapades sportives et ses voyages.`;
          }
          
          if (lowerTitle.includes('bouteille') && (lowerTitle.includes('eau') || lowerTitle.includes('sport') || lowerTitle.includes('pliable'))) {
            return `Une bouteille d'eau innovante et pratique pour ${name}. Parfaite pour rester hydraté pendant le sport ou les déplacements, elle combine fonctionnalité et durabilité.`;
          }
          
          if (lowerTitle.includes('trousse') && lowerTitle.includes('premiers secours')) {
            return `Une trousse de premiers secours compacte et complète pour ${name}. Indispensable pour la sécurité lors des activités outdoor, voyages ou à la maison.`;
          }
          
          // Équipements fitness/sport
          if (lowerTitle.includes('haltères') || lowerTitle.includes('poids') || lowerTitle.includes('musculation')) {
            return `Un équipement de musculation professionnel pour ${name}. Idéal pour maintenir sa forme physique et développer sa force depuis chez elle.`;
          }
          
          if (lowerTitle.includes('tapis') && (lowerTitle.includes('yoga') || lowerTitle.includes('exercice') || lowerTitle.includes('fitness'))) {
            return `Un tapis d'exercice de qualité pour ${name}. Parfait pour pratiquer le yoga, le pilates ou tout autre exercice au sol dans le confort de son domicile.`;
          }
          
          // Accessoires de voyage
          if (lowerTitle.includes('organisateur') || lowerTitle.includes('organiseur')) {
            return `Un organisateur pratique pour ${name} qui aime les voyages bien préparés. Ce produit l'aidera à garder ses affaires ordonnées et facilement accessibles.`;
          }
          
          if (lowerTitle.includes('valise') || lowerTitle.includes('bagage')) {
            return `Une solution de voyage durable et pratique pour ${name}. Conçue pour accompagner ses aventures avec style et fonctionnalité.`;
          }
          
          // Accessoires bien-être/nature
          if (lowerTitle.includes('huile') && (lowerTitle.includes('essentielle') || lowerTitle.includes('massage') || lowerTitle.includes('aromathérapie'))) {
            return `Un produit de bien-être naturel pour ${name}. Parfait pour créer une atmosphère relaxante et prendre soin de soi au quotidien.`;
          }
          
          if (lowerTitle.includes('diffuseur') || lowerTitle.includes('aromathérapie')) {
            return `Un diffuseur élégant pour ${name} qui apprécie les moments de détente. Il créera une ambiance apaisante et parfumée dans son espace de vie.`;
          }
          
          // Produits technologiques
          if (lowerTitle.includes('montre') && (lowerTitle.includes('sport') || lowerTitle.includes('connectée') || lowerTitle.includes('fitness'))) {
            return `Une montre intelligente pour ${name} qui combine style et fonctionnalités sportives. Parfaite pour suivre ses activités et rester connectée.`;
          }
          
          if (lowerTitle.includes('écouteurs') || lowerTitle.includes('casque')) {
            return `Des écouteurs de qualité pour ${name}. Idéaux pour profiter de sa musique préférée pendant le sport ou les déplacements.`;
          }
          
          // Accessoires de cuisine/maison
          if (lowerTitle.includes('gourde') || lowerTitle.includes('thermos')) {
            return `Une gourde pratique et élégante pour ${name}. Parfaite pour maintenir ses boissons à la bonne température lors de ses activités quotidiennes.`;
          }
          
          if (lowerTitle.includes('lunch box') || lowerTitle.includes('boîte repas')) {
            return `Une boîte repas pratique et écologique pour ${name}. Idéale pour emporter ses repas sains partout où elle va.`;
          }
          
          // PRIORITÉ 3: Analyse basée sur les centres d'intérêt
          const matchingInterests = interests.filter(interest => {
            const lowerInterest = interest.toLowerCase();
            return lowerTitle.includes(lowerInterest) || 
                   (interest === 'Sport' && (lowerTitle.includes('sport') || lowerTitle.includes('fitness') || lowerTitle.includes('entraînement'))) ||
                   (interest === 'Bien-être' && (lowerTitle.includes('relaxation') || lowerTitle.includes('massage') || lowerTitle.includes('zen'))) ||
                   (interest === 'Voyage' && (lowerTitle.includes('voyage') || lowerTitle.includes('sac') || lowerTitle.includes('organisateur'))) ||
                   (interest === 'Nature' && (lowerTitle.includes('nature') || lowerTitle.includes('outdoor') || lowerTitle.includes('camping')));
          });
          
          if (matchingInterests.length > 0) {
            const interest = matchingInterests[0];
            return `Un produit soigneusement choisi pour ${name} qui partage sa passion pour ${interest.toLowerCase()}. Ce cadeau correspond parfaitement à ses goûts et à son style de vie.`;
          }
          
          // PRIORITÉ 4: Extraction d'informations spécifiques du titre
          // Éviter les descriptions génériques sur la marque, se concentrer sur la fonction
          const isSet = lowerTitle.includes('set') || lowerTitle.includes('kit') || lowerTitle.includes('lot de');
          const hasNumber = /\d+/.test(title);
          
          if (isSet && hasNumber) {
            const numbers = title.match(/\d+/g);
            const quantity = numbers ? numbers[0] : '';
            return `Un ensemble complet de ${quantity} pièces pour ${name}. Ce set lui offrira tout le nécessaire pour une expérience riche et variée.`;
          }
          
          // PRIORITÉ 5: Fallback basé sur l'événement - ÉVITER les descriptions génériques
          if (eventType === 'birthday') {
            // Extraire le type de produit du titre plutôt que la marque
            const productKeywords = [
              'accessoire', 'équipement', 'produit', 'article', 'objet', 
              'cadeau', 'ensemble', 'collection', 'kit', 'set'
            ];
            
            let productType = 'cadeau';
            for (const keyword of productKeywords) {
              if (lowerTitle.includes(keyword)) {
                productType = keyword;
                break;
              }
            }
            
            return `Un ${productType} unique et pratique pour l'anniversaire de ${name}. Choisi avec attention pour correspondre à ses goûts et besoins du quotidien.`;
          }
          
          // DERNIER RECOURS: Description contextuelle minimale
          return `Un produit de qualité sélectionné pour ${name}. Ce cadeau saura lui apporter satisfaction grâce à son utilité et son design soigné.`;
        };
        
        // Fonction améliorée de résolution des liens Amazon uniquement depuis le pool
        const resolveAmazonLinksFromPool = (asin: string, byAsin: Map<string, any>, title: string) => {
          const product = byAsin.get(toAsin(asin));
          
          // 1) Si on a un lien source déjà en /dp/, on le garde
          let base = product?.link && product.link.includes('/dp/') ? product.link : null;
          
          // 2) Sinon on forge /dp/{asin} (asin déjà validé du pool)
          if (!base && isValidAsin(asin)) {
            base = `https://www.amazon.fr/dp/${toAsin(asin)}`;
          }
          
          // 3) Fallback recherche si jamais
          const encodedTitle = encodeURIComponent(title.replace(/[^\w\s-]/g, ' ').trim());
          const search = `https://www.amazon.fr/s?k=${encodedTitle}`;
          
          console.log(`🔗 Résolution pour "${title}": pool=true, direct=${!!base}, ASIN=${asin}`);
          
          return { 
            primary: base || search, 
            search, 
            isDirectLink: !!base 
          };
        };

        // Créer une map des produits du pool avec ASIN normalisés
        const byAsin = new Map(selectedProducts.map(p => [toAsin(p.asin), p]));
        const amazonLinks = resolveAmazonLinksFromPool(suggestion.asin, byAsin, suggestion.title);
        
        return {
          title: suggestion.title,
          description: generateEnhancedDescription(suggestion.title, suggestion.reasoning, personData),
          estimatedPrice: suggestion.price,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning || `Produit sélectionné pour ${personData.name} selon son profil.`,
          category: 'Cadeau personnalisé',
          alternatives: [
            `Recherche précise: ${suggestion.title}`,
            `Recherche par marque: ${suggestion.title.split(' ')[0]}`
          ],
          purchaseLinks: [amazonLinks.primary],
          priceInfo: {
            displayPrice: suggestion.price,
            source: 'ai_estimate',
            originalEstimate: suggestion.price,
            amazonPrice: suggestion.price
          },
          amazonData: {
            asin: suggestion.asin,
            productUrl: withAffiliate(amazonLinks.primary),
            addToCartUrl: (partnerTagActive && isValidAsin(suggestion.asin))
              ? `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${suggestion.asin}&Quantity.1=1&tag=${partnerTag}`
              : null, // null si tag inactif
            searchUrl: withAffiliate(amazonLinks.search),
            matchType: amazonLinks.isDirectLink ? 'direct' : 'search'
          }
        };
      });
      
      console.log('✅ Converted selections to suggestions format');
      
      
    } catch (parseError) {
      console.error('❌ Error parsing OpenAI response:', parseError);
      console.error('❌ Parse error details:', (parseError as Error).message);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur de parsing JSON (ne devrait pas arriver avec Structured Outputs)',
        details: (parseError as Error).message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ✅ Avec la nouvelle approche, les suggestions sont déjà enrichies et validées
    console.log('💰 Final budget validation for selected products...');
    
    const finalValidatedSuggestions = suggestions.filter((suggestion: any) => {
      if (suggestion.estimatedPrice > budget) {
        console.log(`❌ Final filter: removing "${suggestion.title}" - Price ${suggestion.estimatedPrice}€ exceeds budget ${budget}€`);
        return false;
      }
      return true;
    });
    
    console.log(`🎁 Final suggestions after validation: ${finalValidatedSuggestions.length}`);
    
    // If no suggestions remain after budget filtering, return an error
    if (finalValidatedSuggestions.length === 0) {
      console.log('❌ No suggestions remain after budget filtering');
      return new Response(JSON.stringify({
        success: false,
        error: `Aucune suggestion trouvée dans le budget de ${budget}€. Essayez d'augmenter le budget ou de modifier les critères.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      suggestions: finalValidatedSuggestions,
      personName: personData.name,
      eventType,
      budget,
      budgetRespected: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ ERROR in edge function:', error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur lors du traitement de la requête',
      details: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});