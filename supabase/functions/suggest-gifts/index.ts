import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Vary': 'Origin',
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

// Normalisation RainforestAPI selon approche simplifiée
function normalizeRainforestItem(item: any) {
  const asinField = toAsin(item.asin);
  const asinFromLink = extractAsinFromUrl(item.link);
  const asin = isValidAsin(asinFromLink) ? asinFromLink : asinField;

  // 1) si link contient /dp/, garde-le
  const direct = item.link && item.link.includes('/dp/') ? item.link : null;
  // 2) sinon, si ASIN valide => /dp/ASIN
  const dp = !direct && isValidAsin(asin) ? `https://www.amazon.fr/dp/${asin}` : null;
  // 3) sinon, fallback recherche
  const title = item.title || '';
  const search = `https://www.amazon.fr/s?k=${encodeURIComponent(title.replace(/[^\w\s-]/g, ' ').trim())}`;

  const price = parseFloat(String(item.price?.value ?? item.price ?? '')
    .replace(/[^\d.,]/g, '')
    .replace(',', '.')) || undefined;

  return {
    title,
    asin,
    link: withAffiliate(direct || dp || search),
    searchUrl: withAffiliate(search),
    price,
    rating: item.rating,
    reviewCount: item.reviews_count,
    imageUrl: item.image,
    snippet: item.snippet,
    description: item.snippet,
    displayDescription: item.snippet || null
  };
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
    console.log(`🔑 RainforestAPI Key length: ${rainforestApiKey.length} chars`);
    
    const searchUrl = `https://api.rainforestapi.com/request?api_key=${rainforestApiKey}&type=search&amazon_domain=amazon.fr&search_term=${encodeURIComponent(query)}&min_price=${minPrice}&max_price=${maxPrice}`;
    console.log(`📡 RainforestAPI Request URL: ${searchUrl.replace(rainforestApiKey, 'HIDDEN')}`);
    
    const response = await withTimeoutFetch(searchUrl, {}, 6000);
    console.log(`📡 RainforestAPI Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`❌ RainforestAPI HTTP error: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    console.log(`📊 RainforestAPI Response data keys:`, Object.keys(data));
    
    if (data.request_info?.success === false) {
      console.error('❌ RainforestAPI API error:', data.request_info?.message);
      return [];
    }

    const products = (data.search_results || [])
      .filter((item: any) => item.asin) // Garder seulement ceux avec ASIN
      .map(normalizeRainforestItem)
      .filter(item => {
        // Ne garder que les produits avec lien /dp/ OU ASIN valide
        return (item.link && item.link.includes('/dp/')) || isValidAsin(item.asin);
      })
      .filter(item => {
        // Filtrer par prix si disponible
        if (!item.price) return true;
        return item.price >= minPrice && item.price <= maxPrice;
      })
      .slice(0, 5); // Max 5 produits par requête
    
    console.log(`📦 RainforestAPI - Products found for "${query}": ${products.length}`);
    return products;
  } catch (error) {
    console.error(`❌ Erreur RainforestAPI lors de la recherche Amazon pour "${query}":`, error);
    return [];
  }
}

// Timeout wrapper for fetch requests with proper AbortController
function withTimeoutFetch(url: string, init: RequestInit = {}, ms = 6000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  
  return fetch(url, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timeout));
}

// Normalisation SerpAPI selon approche simplifiée
function normalizeSerpApiItem(item: any) {
  const asinField = toAsin(item.asin);
  const asinFromLink = extractAsinFromUrl(item.link);
  const asin = isValidAsin(asinFromLink) ? asinFromLink : asinField;

  // 1) si link contient /dp/, garde-le
  const direct = item.link && item.link.includes('/dp/') ? item.link : null;
  // 2) sinon, si ASIN valide => /dp/ASIN
  const dp = !direct && isValidAsin(asin) ? `https://www.amazon.fr/dp/${asin}` : null;
  // 3) sinon, fallback recherche
  const title = item.title || '';
  const search = `https://www.amazon.fr/s?k=${encodeURIComponent(title.replace(/[^\w\s-]/g, ' ').trim())}`;

  return {
    title,
    asin,
    link: withAffiliate(direct || dp || search),
    searchUrl: withAffiliate(search),
    price: item.price ? parseFloat(String(item.price).replace(/[^\d,]/g, '').replace(',', '.')) : undefined,
    rating: item.rating,
    reviewCount: item.reviews_count,
    imageUrl: item.thumbnail,
    snippet: item.snippet,
    description: item.description,
    displayDescription: item.snippet || item.description || null
  };
}

// Recherche de produits Amazon avec SerpApi et fallback RainforestAPI
async function searchAmazonProducts(query: string, serpApiKey: string | undefined, minPrice: number, maxPrice: number, rainforestApiKey?: string) {
  let products: any[] = [];
  
  // Essayer SerpAPI en premier si disponible
  if (serpApiKey) {
    try {
      console.log(`🔍 Recherche Amazon (SerpAPI): "${query}" (${minPrice}€-${maxPrice}€)`);
      console.log(`🔑 SerpAPI Key length: ${serpApiKey.length} chars`);
      
      const params = new URLSearchParams({
        engine: 'amazon',
        amazon_domain: 'amazon.fr',
        language: 'fr_FR',
        k: query,
        low_price: minPrice.toString(),
        high_price: maxPrice.toString(),
        api_key: serpApiKey,
      });
      
      const searchUrl = `https://serpapi.com/search.json?${params}`;
      console.log(`📡 SerpAPI Request URL: ${searchUrl.replace(serpApiKey, 'HIDDEN')}`);
      
      const response = await withTimeoutFetch(searchUrl, {}, 6000);
      console.log(`📡 SerpAPI Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📊 SerpAPI Response data keys:`, Object.keys(data));
        
        if (data.error) {
          console.error('❌ SerpAPI API Error:', data.error);
          throw new Error(`SerpAPI Error: ${data.error}`);
        }
        
        if (!data.error) {
          const results = data.organic_results || [];
          console.log(`📦 SerpAPI Raw results count: ${results.length}`);
          
          products = results
            .filter((item: any) => item.asin) // Garder seulement ceux avec ASIN
            .map(normalizeSerpApiItem)
            .filter(item => {
              // Ne garder que les produits avec lien /dp/ OU ASIN valide
              return (item.link && item.link.includes('/dp/')) || isValidAsin(item.asin);
            })
            .filter(item => {
              // Filtrer par prix si disponible
              if (!item.price) return true;
              return item.price >= minPrice && item.price <= maxPrice;
            })
            .slice(0, 5);
          
          console.log(`✅ SerpAPI - ${products.length} produits trouvés pour "${query}"`);
          
          console.log(`✅ SerpAPI - ${products.length} produits normalisés pour "${query}"`);
          
          if (products.length > 0) {
            return products;
          } else {
            console.warn(`⚠️ SerpAPI - 0 produits après normalisation pour "${query}"`);
          }
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ SerpAPI HTTP error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error(`❌ SerpAPI exception for "${query}":`, error);
      console.error(`   Error type: ${error?.name}`);
      console.error(`   Error message: ${error?.message}`);
    }
  }
  
  // Fallback vers RainforestAPI si SerpAPI a échoué ou n'est pas disponible
  if (rainforestApiKey && products.length === 0) {
    console.log(`🌧️ Tentative RainforestAPI pour "${query}" après échec SerpAPI`);
    products = await searchAmazonProductsRainforest(query, minPrice, maxPrice, rainforestApiKey);
  } else if (!rainforestApiKey && products.length === 0) {
    console.warn(`⚠️ RainforestAPI non disponible et SerpAPI a échoué pour "${query}"`);
  }
  
  console.log(`🎯 Final products count for "${query}": ${products.length}`);
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
const ASIN_RES = [
  /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /[?&]ASIN=([A-Z0-9]{10})(?:[&#]|$)/i,
];
const isValidAsin = (a?: string) => /^[A-Z0-9]{10}$/.test(toAsin(a));

function extractAsinFromUrl(url?: string) {
  if (!url) return null;
  for (const re of ASIN_RES) {
    const m = url.match(re);
    if (m) return toAsin(m[1]);
  }
  return null;
}

// Vérification optionnelle des liens DP côté serveur
const VERIFY_DP = (Deno.env.get('VERIFY_DP') || 'false').toLowerCase() === 'true';

async function dpLooksValid(url: string, ms = 800) {
  const c = new AbortController(); 
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: c.signal });
    return r.status >= 200 && r.status < 400;
  } catch { return false; } 
  finally { clearTimeout(t); }
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

Deno.serve(async (req) => {
  console.log('🚀 Function started successfully');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Health check for debugging
  if (req.method === 'GET') {
    console.log('✅ Health check request');
    return new Response(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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
    console.log('- OpenAI Key available:', !!openAIKey, openAIKey ? `(${openAIKey.length} chars)` : '');
    console.log('- SerpApi Key available:', !!serpApiKey, serpApiKey ? `(${serpApiKey.length} chars)` : '');
    console.log('- RainforestAPI Key available:', !!rainforestApiKey, rainforestApiKey ? `(${rainforestApiKey.length} chars)` : '');
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

    // Log API availability but don't fail - allow fallback
    if (!serpApiKey && !rainforestApiKey) {
      console.warn('⚠️ Aucune clé API de recherche disponible - mode fallback uniquement');
      console.warn('   - SERPAPI_API_KEY:', serpApiKey ? 'SET' : 'MISSING');
      console.warn('   - RAINFOREST_API_KEY:', rainforestApiKey ? 'SET' : 'MISSING');
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
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
      },
      auth: { persistSession: false }
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
    
    // Chercher des produits réels sur Amazon pour chaque requête avec parallélisation
    const availableProducts = [];
    
    console.log('🔍 Vérification des clés API:', { 
      serpApiKey: !!serpApiKey, 
      rainforestApiKey: !!rainforestApiKey,
      serpLength: serpApiKey?.length || 0,
      rainforestLength: rainforestApiKey?.length || 0
    });
    
    if (serpApiKey || rainforestApiKey) {
      console.log('✅ Au moins une clé API disponible, début recherche...');
      // Limite à 4 requêtes max, concurrence 2, timeout strict
      const queries = searchQueries.slice(0, 4);
      const startTime = Date.now();
      const MAX_WALL_MS = 15000; // 15s mur global

      const searchTasks = queries.map(query => async () => {
        if (Date.now() - startTime > MAX_WALL_MS) throw new Error('global-timeout');
        try {
          console.log(`🔍 Recherche parallèle pour "${query}"`);
          const results = await searchAmazonProducts(query, serpApiKey, minBudget, maxBudget, rainforestApiKey);
          console.log(`📦 Résultats bruts pour "${query}":`, results?.length || 0);
          if (results && results.length > 0) {
            console.log(`✅ ${results.length} produits trouvés pour "${query}"`);
            const limitedResults = results.slice(0, 3); // Max 3 produits par requête
            console.log(`📋 Échantillon des résultats:`, limitedResults.slice(0, 1).map(r => ({
              title: r.title?.substring(0, 50),
              asin: r.asin,
              link: r.link?.substring(0, 50),
              price: r.price
            })));
            return limitedResults;
          }
          console.log(`❌ Aucun produit trouvé pour "${query}"`);
          return [];
        } catch (error) {
          console.error(`❌ Erreur recherche "${query}":`, error);
          return [];
        }
      });

      // Exécution avec plafond de concurrence
      async function runLimited(funcs: Array<() => Promise<any[]>>, limit = 2) {
        const out: any[] = [];
        let i = 0;
        const runners = Array.from({ length: Math.min(limit, funcs.length) }, async function run() {
          while (i < funcs.length && Date.now() - startTime < MAX_WALL_MS) {
            const idx = i++;
            const res = await funcs[idx]();
            out.push(...(res || []));
          }
        });
        await Promise.allSettled(runners);
        return out;
      }

      const allResults = await runLimited(searchTasks, 2);
      availableProducts.push(...allResults);
      console.log(`📦 Total après parallélisation: ${availableProducts.length}`);
    } else {
      console.log('❌ Aucune clé API disponible pour la recherche');
    }
    
    console.log(`📦 Total produits disponibles: ${availableProducts.length}`);
    
    // Debug détaillé des produits avant filtrage
    if (availableProducts.length > 0) {
      console.log('🔍 Échantillon de produits bruts avant filtrage:');
      availableProducts.slice(0, 3).forEach((p, i) => {
        console.log(`  [${i}] Title: ${p.title?.substring(0, 60)}...`);
        console.log(`      ASIN: ${p.asin} (valid: ${isValidAsin(p.asin)})`);
        console.log(`      Link: ${p.link?.substring(0, 80)}... (has /dp/: ${p.link?.includes('/dp/')})`);
        console.log(`      Price: ${p.price}`);
      });
    }
    
    // ⚠️ Filtre global : aucun produit sans dp ni ASIN valide ne passe dans le pool
    const sanitized = availableProducts.filter(p => {
      const hasValidLink = p.link && p.link.includes('/dp/');
      const hasValidAsin = isValidAsin(p.asin);
      const isValid = hasValidLink || hasValidAsin;
      
      if (!isValid) {
        console.log(`❌ Produit rejeté: ${p.title?.substring(0, 40)} - Link: ${hasValidLink ? '✅' : '❌'}, ASIN: ${hasValidAsin ? '✅' : '❌'}`);
      }
      
      return isValid;
    });
    console.log(`🧹 Produits après nettoyage: ${sanitized.length}`);
    
    // Debug des produits après filtrage
    if (sanitized.length > 0) {
      console.log('✅ Échantillon de produits après filtrage:');
      sanitized.slice(0, 2).forEach((p, i) => {
        console.log(`  [${i}] Title: ${p.title?.substring(0, 60)}...`);
        console.log(`      ASIN: ${p.asin}, Link: ${p.link?.substring(0, 80)}...`);
      });
    } else {
      console.log('❌ Aucun produit valide après filtrage');
    }
    
    // Limiter drastiquement les produits pour éviter limite tokens
    const selectedProducts = diversifyProducts(sanitized, 4);
    console.log(`🎯 Produits sélectionnés après diversification: ${selectedProducts.length}`);
    
    if (selectedProducts.length === 0) {
      console.warn('⚠️ Aucun produit trouvé via les APIs de recherche : passage en mode fallback');
      console.log('🔍 Détail du pipeline:');
      console.log(`  - Requêtes générées: ${searchQueries.length}`);
      console.log(`  - Produits bruts trouvés: ${availableProducts.length}`);
      console.log(`  - Produits après filtrage: ${sanitized.length}`);
      console.log(`  - Produits finaux: ${selectedProducts.length}`);
      
      // Si aucun produit trouvé, utiliser la logique de fallback directement
      return generateFallbackSuggestions(personData, eventType, budget);
    }

    // 🎯 Étape 2: Indexation des produits pour retrouver les liens directs
    const allPool = [...availableProducts, ...selectedProducts];
    const byAsin = new Map(
      allPool
        .filter(p => isValidAsin(p.asin))
        .map(p => [toAsin(p.asin), p])
    );
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

    // Fonction pour appeler OpenAI Chat Completions avec timeout
    async function callChatCompletions(model: string, maxTokens = 1200, userPrompt = prompt) {
      return withTimeoutFetch('https://api.openai.com/v1/chat/completions', {
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
      }, 10000); // 10s timeout pour OpenAI
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
        
        // Si le pool est petit (< 6 produits), on est moins strict
        if (selectedProducts.length < 6) {
          console.log(`⚠️ Pool réduit (${selectedProducts.length} produits), on garde "${s.title}" avec recherche`);
          return s; // On garde la suggestion même si ASIN non trouvé
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

      // Créer une map des produits du pool avec ASIN normalisés (seulement ASINs valides) en dehors du map
      const byAsin = new Map(selectedProducts.filter(p => isValidAsin(p.asin)).map(p => [toAsin(p.asin), p]));

      // Convert reconciled suggestions to final format - Using for...of to handle async properly
      const finalSuggestions: any[] = [];
      for (const suggestion of reconciled.slice(0, 3)) {
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
          
          // Vêtements et accessoires
          if (lowerTitle.includes('t-shirt') || lowerTitle.includes('maillot') || lowerTitle.includes('chemise')) {
            return `Un vêtement confortable et stylé pour ${name}. Parfait pour son style personnel et ses activités quotidiennes.`;
          }
          
          if (lowerTitle.includes('casquette') || lowerTitle.includes('chapeau') || lowerTitle.includes('bonnet')) {
            return `Un accessoire de mode pratique pour ${name}. Idéal pour la protéger du soleil ou compléter son look avec style.`;
          }
          
          // Tech et gadgets
          if (lowerTitle.includes('écouteurs') || lowerTitle.includes('casque') || lowerTitle.includes('audio')) {
            return `Un équipement audio de qualité pour ${name}. Parfait pour profiter de sa musique préférée avec un son cristallin.`;
          }
          
          if (lowerTitle.includes('montre') || lowerTitle.includes('bracelet') && lowerTitle.includes('connect')) {
            return `Un accessoire connecté moderne pour ${name}. Alliant style et technologie pour l'accompagner au quotidien.`;
          }
          
          // Cuisine et maison
          if (lowerTitle.includes('couteau') || lowerTitle.includes('ustensile') || lowerTitle.includes('cuisine')) {
            return `Un ustensile de cuisine pratique pour ${name}. Idéal pour préparer de délicieux repas avec facilité et plaisir.`;
          }
          
          if (lowerTitle.includes('planche') && lowerTitle.includes('découper')) {
            return `Une planche à découper de qualité pour ${name}. Un accessoire indispensable pour une cuisine bien équipée.`;
          }
          
          // Livres et culture
          if (lowerTitle.includes('livre') || lowerTitle.includes('roman') || lowerTitle.includes('guide')) {
            return `Une lecture captivante pour ${name}. Ce livre saura l'enrichir et lui offrir de beaux moments de détente.`;
          }
          
          // PRIORITÉ 3: Correspondance avec les centres d'intérêt
          const matchingInterests = interests.filter((interest: string) => 
            lowerTitle.includes(interest.toLowerCase()) || 
            interest.toLowerCase().includes(lowerTitle.split(' ')[0]) ||
            (interest.toLowerCase() === 'sport' && (lowerTitle.includes('fitness') || lowerTitle.includes('exercice'))) ||
            (interest.toLowerCase() === 'voyage' && (lowerTitle.includes('sac') || lowerTitle.includes('bagage'))) ||
            (interest.toLowerCase() === 'lecture' && lowerTitle.includes('livre'))
          );
          
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
        const resolveAmazonLinksFromPool = async (asin: string, byAsin: Map<string, any>, title: string) => {
          const product = byAsin.get(toAsin(asin));
          
          // 1) Si on a un lien source déjà en /dp/, on le garde
          let base = product?.link && product.link.includes('/dp/') ? product.link : null;
          
          // 2) Sinon on forge /dp/{asin} SEULEMENT si le produit est dans byAsin (ASIN validé)
          if (!base && product && isValidAsin(asin)) {
            base = `https://www.amazon.fr/dp/${toAsin(asin)}`;
          }
          
          // 3) Vérification optionnelle côté serveur
          if (VERIFY_DP && base) {
            const ok = await dpLooksValid(base);
            if (!ok) {
              console.log(`⚠️ Lien DP invalide détecté: ${base} → fallback search`);
              base = null; // On jette le dp douteux → fallback search
            }
          }
          
          // 4) Fallback recherche si jamais
          const encodedTitle = encodeURIComponent(title.replace(/[^\w\s-]/g, ' ').trim());
          const search = `https://www.amazon.fr/s?k=${encodedTitle}`;
          
          console.log(`🔗 Résolution pour "${title}": pool=${!!product}, direct=${!!base}, ASIN=${asin}`);
          
          return { 
            primary: base || search, 
            search, 
            isDirectLink: !!base 
          };
        };

        const amazonLinks = await resolveAmazonLinksFromPool(suggestion.asin, byAsin, suggestion.title);
        
        finalSuggestions.push({
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
        });
      }
      suggestions = finalSuggestions;
      
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

// Fonction de fallback simplifiée qui utilise les APIs ou génère des suggestions génériques
async function generateFallbackSuggestions(personData: any, eventType: string, budget: number) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  console.log('🎯 Génération fallback pour:', { 
    name: personData.name, 
    interests: personData.interests, 
    age: personData.age_years,
    budget 
  });

  // Essayer une dernière fois avec les APIs sur des requêtes très génériques
  const serpApiKey = Deno.env.get('SERPAPI_API_KEY');
  const rainforestApiKey = Deno.env.get('RAINFOREST_API_KEY');
  
  if (serpApiKey || rainforestApiKey) {
    console.log('🔄 Tentative fallback avec APIs externes...');
    
    // Créer des requêtes très simples basées sur les intérêts
    const interests = personData.interests || [];
    const fallbackQueries = [];
    
    if (interests.includes('Sport')) fallbackQueries.push('cadeau sport');
    if (interests.includes('Tech')) fallbackQueries.push('gadget tech');
    if (interests.includes('Cuisine')) fallbackQueries.push('accessoire cuisine');
    if (interests.includes('Lecture')) fallbackQueries.push('livre cadeau');
    
    // Queries génériques si pas d'intérêts
    if (fallbackQueries.length === 0) {
      fallbackQueries.push('cadeau original', 'idée cadeau', 'accessoire pratique');
    }
    
    const minPrice = Math.round(budget * 0.4);
    const maxPrice = budget;
    
    let allProducts: any[] = [];
    
    // Essayer quelques requêtes simples
    for (const query of fallbackQueries.slice(0, 2)) {
      try {
        const products = await searchAmazonProducts(query, serpApiKey, minPrice, maxPrice, rainforestApiKey);
        allProducts.push(...products);
        
        if (allProducts.length >= 3) break; // On s'arrête si on a assez de produits
      } catch (error) {
        console.warn(`⚠️ Fallback query "${query}" failed:`, error);
      }
    }
    
    // Si on a trouvé des produits via les APIs, les retourner
    if (allProducts.length > 0) {
      console.log(`✅ Fallback API a trouvé ${allProducts.length} produits`);
      
      const selectedProducts = diversifyProducts(allProducts, 3);
      const suggestions = selectedProducts.map((product: any, index: number) => ({
        title: product.title,
        description: product.displayDescription || `${product.title.substring(0, 100)}...`,
        estimatedPrice: Math.round(product.price || (budget * 0.7)),
        confidence: 0.7 - (index * 0.1),
        reasoning: `Suggestion trouvée pour ${personData.name} correspondant à ses intérêts.`,
        category: 'Suggestion API',
        alternatives: [`Recherche similaire: ${product.title.split(' ').slice(0, 2).join(' ')}`],
        purchaseLinks: [product.link],
        priceInfo: {
          displayPrice: Math.round(product.price || (budget * 0.7)),
          source: 'api_fallback',
          originalEstimate: Math.round(product.price || (budget * 0.7)),
          amazonPrice: product.price
        },
        amazonData: {
          asin: product.asin,
          productUrl: product.link,
          addToCartUrl: product.asin && isValidAsin(product.asin) ? 
            withAffiliate(`https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${product.asin}&Quantity.1=1`) : null,
          searchUrl: product.searchUrl || withAffiliate(`https://www.amazon.fr/s?k=${encodeURIComponent(product.title)}`),
          matchType: product.asin && isValidAsin(product.asin) ? 'api_match' : 'search'
        }
      }));
      
      return new Response(JSON.stringify({
        success: true,
        suggestions,
        personName: personData.name,
        metadata: {
          totalSuggestions: suggestions.length,
          fallbackMode: true,
          reason: 'Suggestions trouvées via APIs en mode fallback'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Si vraiment aucune API ne fonctionne, générer des suggestions génériques mais intelligentes
  console.log('⚠️ Aucune API disponible - génération de suggestions spécifiques basées sur le profil');
  
  const interests = personData.interests || [];
  const age = personData.age_years || 30;
  const name = personData.name || 'cette personne';
  
  // Suggestions intelligentes basées sur le profil et l'événement
  const smartSuggestions = [];
  
  // Suggestions basées sur les intérêts avec des titres spécifiques
  if (interests.includes('Sport')) {
    smartSuggestions.push({
      title: age > 50 ? 'Tapis de Yoga ou Matériel Fitness Doux' : 'Équipement Sport et Fitness',
      description: `Un équipement sportif adapté à ${name}, parfait pour maintenir sa forme et sa santé.`,
      category: 'Sport & Fitness',
      keywords: 'tapis yoga accessoire sport fitness équipement'
    });
  }
  
  if (interests.includes('Tech')) {
    smartSuggestions.push({
      title: budget > 100 ? 'Gadget Tech Premium' : 'Accessoire High-Tech Pratique',
      description: `Un gadget technologique innovant qui facilitera le quotidien de ${name}.`,
      category: 'Technologie',
      keywords: 'accessoire tech gadget connecté smartphone'
    });
  }
  
  if (interests.includes('Lecture')) {
    smartSuggestions.push({
      title: 'Livre Bestseller ou Accessoire Lecture',
      description: `Un livre captivant ou un accessoire pour améliorer l'expérience de lecture de ${name}.`,
      category: 'Culture & Lecture',
      keywords: 'livre bestseller lampe lecture marque-page'
    });
  }
  
  if (interests.includes('Cuisine')) {
    smartSuggestions.push({
      title: budget > 80 ? 'Ustensile de Cuisine Professionnel' : 'Accessoire Cuisine Pratique',
      description: `Un ustensile de qualité pour enrichir les talents culinaires de ${name}.`,
      category: 'Cuisine & Gastronomie',
      keywords: 'ustensile cuisine couteau planche balance'
    });
  }
  
  if (interests.includes('Jardinage')) {
    smartSuggestions.push({
      title: 'Kit Jardinage ou Plante d\'Intérieur',
      description: `Des outils ou plantes pour nourrir la passion jardinage de ${name}.`,
      category: 'Jardinage & Nature',
      keywords: 'kit jardinage plante outils jardin'
    });
  }
  
  if (interests.includes('Art') || interests.includes('Artisanat')) {
    smartSuggestions.push({
      title: 'Kit Créatif ou Matériel Artistique',
      description: `Du matériel artistique de qualité pour exprimer la créativité de ${name}.`,
      category: 'Art & Créativité',
      keywords: 'kit créatif pinceaux carnet art'
    });
  }
  
  // Suggestions basées sur l'âge si pas assez d'intérêts
  if (smartSuggestions.length < 2) {
    if (age > 60) {
      smartSuggestions.push({
        title: 'Produit Bien-être et Confort',
        description: `Un produit pensé pour le confort et le bien-être de ${name}.`,
        category: 'Bien-être',
        keywords: 'bien-être confort relaxation senior'
      });
    } else if (age > 30) {
      smartSuggestions.push({
        title: 'Accessoire Maison et Décoration',
        description: `Un objet élégant pour embellir l'intérieur de ${name}.`,
        category: 'Maison & Décoration',
        keywords: 'décoration maison accessoire design'
      });
    } else {
      smartSuggestions.push({
        title: 'Cadeau Tendance et Moderne',
        description: `Un cadeau dans l'air du temps qui plaira à ${name}.`,
        category: 'Tendance',
        keywords: 'cadeau moderne tendance jeune'
      });
    }
  }
  
  // Suggestions basées sur l'événement
  if (eventType === 'birthday') {
    smartSuggestions.push({
      title: `Cadeau d'Anniversaire Personnalisé`,
      description: `Un cadeau spécialement choisi pour célébrer l'anniversaire de ${name}.`,
      category: 'Anniversaire',
      keywords: 'cadeau anniversaire personnalisé célébration'
    });
  } else if (eventType === 'wedding') {
    smartSuggestions.push({
      title: 'Cadeau de Mariage Élégant',
      description: `Un présent raffiné pour célébrer cette occasion spéciale avec ${name}.`,
      category: 'Mariage',
      keywords: 'cadeau mariage élégant décoration couple'
    });
  }
  
  // Compléter avec des suggestions universelles si nécessaire
  if (smartSuggestions.length < 3) {
    const universalSuggestions = [
      {
        title: 'Coffret Cadeau Gourmand',
        description: `Une sélection de produits gourmands pour faire plaisir à ${name}.`,
        category: 'Gastronomie',
        keywords: 'coffret gourmand produits terroir'
      },
      {
        title: 'Bougie Parfumée de Luxe',
        description: `Une bougie artisanale aux senteurs raffinées pour ${name}.`,
        category: 'Bien-être',
        keywords: 'bougie parfumée luxe ambiance'
      },
      {
        title: 'Plante d\'Intérieur Décorative',
        description: `Une belle plante pour apporter de la vie dans l'espace de ${name}.`,
        category: 'Nature',
        keywords: 'plante intérieur décorative nature'
      }
    ];
    
    smartSuggestions.push(...universalSuggestions.slice(0, 3 - smartSuggestions.length));
  }
  
  // Créer les suggestions finales avec liens de recherche optimisés
  const finalSuggestions = smartSuggestions.slice(0, 3).map((suggestion, index) => {
    const targetPrice = Math.round(budget * (0.6 + Math.random() * 0.3)); // Entre 60% et 90% du budget
    const searchQuery = `${suggestion.keywords} cadeau -déguisement -costume`.replace(/[^\w\s-]/g, ' ').trim();
    const searchUrl = withAffiliate(`https://www.amazon.fr/s?k=${encodeURIComponent(searchQuery)}&rh=p_36%3A${Math.round(budget*0.3)}00-${budget}00`);
    
    return {
      title: suggestion.title,
      description: suggestion.description,
      estimatedPrice: targetPrice,
      confidence: 0.7 - (index * 0.1), // Confiance raisonnable car basé sur profil
      reasoning: `${suggestion.description} Cette suggestion est basée sur le profil de ${name} et recherchera les meilleures options disponibles.`,
      category: suggestion.category,
      alternatives: [`Recherche optimisée: ${suggestion.keywords.split(' ').slice(0, 3).join(' ')}`],
      purchaseLinks: [searchUrl],
      priceInfo: {
        displayPrice: targetPrice,
        source: 'estimated',
        originalEstimate: targetPrice,
        amazonPrice: null
      },
      amazonData: {
        asin: null,
        productUrl: searchUrl,
        addToCartUrl: null,
        searchUrl: searchUrl,
        matchType: 'smart_search'
      }
    };
  });

  console.log('✅ Suggestions intelligentes générées (mode fallback):', finalSuggestions.map(s => ({ 
    title: s.title, 
    price: s.estimatedPrice,
    category: s.category 
  })));

  return new Response(JSON.stringify({
    success: true,
    suggestions: finalSuggestions,
    personName: personData.name,
    metadata: {
      totalSuggestions: finalSuggestions.length,
      fallbackMode: true,
      reason: 'APIs indisponibles - suggestions intelligentes avec recherches optimisées'
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}