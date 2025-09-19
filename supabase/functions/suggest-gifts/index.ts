// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

/* =========================
   CORS & UTILS
========================= */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin",
};

function jsonResponse(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function withTimeoutFetch(url: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(t));
}

/* =========================
   AFFILIATION & ASIN
========================= */
const partnerTag = Deno.env.get("AMZ_PARTNER_TAG") || "";
const partnerTagActive = (Deno.env.get("AMZ_PARTNER_TAG_ACTIVE") || "false").toLowerCase() === "true";

function appendQuery(url: string, key: string, value: string) {
  const u = new URL(url);
  if (value) u.searchParams.set(key, value);
  return u.toString();
}

function withAffiliate(url: string) {
  return partnerTagActive && partnerTag ? appendQuery(url, "tag", partnerTag) : url;
}

const toAsin = (a?: string) => (a || "").toUpperCase().trim();

function toSearchKeywords(raw: string) {
  if (!raw) return "";
  // 1) enlève seulement les diacritiques (é→e) sans casser les mots
  let s = raw.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  // 2) garde lettres/chiffres/espaces/-
  s = s.replace(/[^\p{L}\p{N}\s-]/gu, " ");
  // 3) espaces propres
  return s.replace(/\s+/g, " ").trim();
}

const ASIN_RES = [
  /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/aw\/d\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/offer-listing\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /[?&]ASIN=([A-Z0-9]{10})(?:[&#]|$)/i,
];
const isValidAsin = (a?: string) => /^[A-Z0-9]{10}$/.test(toAsin(a));

function extractAsinFromUrl(url?: string) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.pathname.includes("/slredirect/") || u.pathname.includes("/gp/redirect")) {
      const target = u.searchParams.get("url");
      if (target) url = decodeURIComponent(target);
    }
  } catch { /* ignore */ }
  for (const re of ASIN_RES) {
    const m = url!.match(re);
    if (m) return toAsin(m[1]);
  }
  return null;
}

/* =========================
   GPT GIFT GENERATION
========================= */
async function generateGiftIdeasWithGPT(personData: any, eventType: string, budget: number, openAIKey: string) {
  const personalInfo = personData.notes 
    ? `Notes: "${personData.notes}"`
    : `Âge: ${personData.age_years || "?"} | Intérêts: ${(personData.interests || []).join(", ") || "N/A"} | Relation: ${personData.relationship || "N/A"}`;

  // Au lieu d'utiliser des ASIN qui peuvent ne plus être valides,
  // nous utiliserons une approche de recherche Amazon pour générer des liens fiables

  const prompt = `Génère exactement 3 idées cadeaux parfaites pour ${personData.name}.

${personalInfo}
Événement: ${eventType}
Budget max: ${budget}€

INSTRUCTIONS IMPORTANTES:
- Génère 3 produits concrets avec marques et modèles réels (Nike, Adidas, Apple, Samsung, etc.)
- Varie les catégories selon ses intérêts : Sport, Tech, Lifestyle, Beauty, Home
- Respecte le budget et les goûts de la personne
- NE GÉNÈRE PAS D'ASIN - laisse le champ "asin" vide, il sera rempli automatiquement
- Focus sur des produits populaires et disponibles sur Amazon France

Renvoie UNIQUEMENT un JSON avec ce format exact:
{
  "suggestions": [
    {
      "title": "Nom précis du produit avec marque (ex: Nike Air Max 90 Blanc/Noir)",
      "description": "Description détaillée expliquant pourquoi c'est parfait pour cette personne",
      "estimatedPrice": prix_en_euros_entier,
      "category": "sport|tech|lifestyle|beauty|home",
      "reasoning": "Explication personnalisée basée sur ses intérêts",
      "searchKeywords": "mots clés pour recherche Amazon"
    }
  ]
}`;

  try {
    const response = await withTimeoutFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Tu es un expert en idées cadeaux personnalisées. Tu renvoies UNIQUEMENT du JSON valide." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1200,
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    }, 15000);

    if (!response.ok) {
      console.error("Erreur OpenAI génération:", response.status);
      throw new Error("Erreur API OpenAI");
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content?.trim() || "";
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();

    const parsed = JSON.parse(content);
    const suggestions = parsed.suggestions || [];

    // Générer des URLs de recherche fiables plutôt que des ASIN potentiellement invalides
    const enrichedSuggestions = suggestions.map((suggestion: any) => {
      const searchKeywords = suggestion.searchKeywords || suggestion.title;
      const cleanKeywords = toSearchKeywords(searchKeywords);
      
      return {
        ...suggestion,
        amazonUrl: `https://www.amazon.fr/s?k=${encodeURIComponent(cleanKeywords)}&ref=sr_st_relevancerank`,
        searchUrl: `https://www.amazon.fr/s?k=${encodeURIComponent(cleanKeywords)}`
      };
    });

    console.log(`Idées cadeaux générées par GPT: ${enrichedSuggestions.length} (ASIN ajoutés lors de l'enrichissement)`);
    return enrichedSuggestions.slice(0, 3);
  } catch (error) {
    console.error("Erreur génération GPT:", error);
    // Fallback avec recherches fiables
    return [
      {
        title: "Coffret cadeau personnalisé",
        description: `Un coffret soigneusement sélectionné pour ${personData.name}`,
        estimatedPrice: Math.min(budget, 35),
        category: "lifestyle",
        reasoning: `Cadeau polyvalent adapté à ${personData.name}`,
        amazonUrl: `https://www.amazon.fr/s?k=coffret+cadeau+personnalise&ref=sr_st_relevancerank`,
        searchKeywords: "coffret cadeau personnalisé"
      },
      {
        title: "Accessoire premium de qualité", 
        description: `Un accessoire pratique et élégant pour le quotidien`,
        estimatedPrice: Math.min(budget, 25),
        category: "home",
        reasoning: "Produit utile et apprécié au quotidien",
        amazonUrl: `https://www.amazon.fr/s?k=accessoire+premium+qualite&ref=sr_st_relevancerank`,
        searchKeywords: "accessoire premium qualité"
      },
      {
        title: "Article tendance original",
        description: `Un produit original qui fera plaisir à coup sûr`,
        estimatedPrice: Math.min(budget, 20),
        category: "tech", 
        reasoning: "Cadeau original et surprenant",
        amazonUrl: `https://www.amazon.fr/s?k=article+tendance+original&ref=sr_st_relevancerank`,
        searchKeywords: "article tendance original"
      }
    ];
  }
}
/* =========================
   SERPAPI SEARCH
========================= */
async function searchWithSerpApi(query: string, serpApiKey: string, minPrice: number, maxPrice: number) {
  const params = new URLSearchParams({
    engine: "amazon",
    amazon_domain: "amazon.fr",
    language: "fr_FR",
    k: query,
    low_price: String(minPrice),
    high_price: String(maxPrice),
    api_key: serpApiKey,
  });

  const url = `https://serpapi.com/search.json?${params}`;
  console.log(`🔍 Recherche SerpAPI: ${query} (${minPrice}-${maxPrice}€)`);

  try {
    const res = await withTimeoutFetch(url, {}, 10000);
    if (!res.ok) {
      console.error(`❌ SerpAPI HTTP error ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (data.error) {
      console.error("❌ SerpAPI API error:", data.error);
      return [];
    }

    const allResults = [
      ...(data.product_results || []),
      ...(data.organic_results || []),
    ];

    console.log(`✅ SerpAPI: ${allResults.length} résultats bruts`);

    const seen = new Set<string>();
    let products = allResults
      .map((item: any) => ({
        title: item.title || "",
        asin: extractAsinFromUrl(item.link) || toAsin(item.asin),
        link: item.link, // Utiliser le lien original de l'API
        originalLink: item.link,
        price: parseFloat(String(item.price?.value || item.price || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || null,
        rating: item.rating || null,
        reviewCount: item.reviews_count || null,
        imageUrl: item.thumbnail || item.image || null,
      }))
      .filter(p => p.title.length > 5 && p.link && p.link.includes('amazon'))
      .filter(p => {
        if (p.asin && isValidAsin(p.asin)) {
          if (seen.has(p.asin)) return false;
          seen.add(p.asin);
        }
        return true;
      })
      .filter(p => !p.price || (p.price >= minPrice && p.price <= maxPrice))
      .slice(0, 20);

    // 1) tri: ASIN d'abord, puis meilleure note/nb avis si dispo
    products.sort((a: any, b: any) => {
      const aa = isValidAsin(a.asin) ? 1 : 0;
      const bb = isValidAsin(b.asin) ? 1 : 0;
      if (bb !== aa) return bb - aa; // ASIN en premier
      const ar = a.rating ?? 0, br = b.rating ?? 0;
      const ac = a.reviewCount ?? 0, bc = b.reviewCount ?? 0;
      if (br !== ar) return br - ar;
      return bc - ac;
    });

    // 2) compresse à 5 items utiles
    products = products.slice(0, 5);

    console.log(`✅ SerpAPI: ${products.length} produits valides filtrés`);
    return products;
  } catch (error) {
    console.error("❌ Erreur SerpAPI:", error);
    return [];
  }
}

/* =========================
   RAINFOREST SEARCH
========================= */
async function searchWithRainforest(query: string, rainforestApiKey: string, minPrice: number, maxPrice: number) {
  const url = `https://api.rainforestapi.com/request?api_key=${rainforestApiKey}&type=search&amazon_domain=amazon.fr&search_term=${encodeURIComponent(query)}`;
  console.log(`🔍 Recherche Rainforest: ${query} (${minPrice}-${maxPrice}€)`);

  try {
    const res = await withTimeoutFetch(url, {}, 10000);
    if (!res.ok) {
      console.error(`❌ Rainforest HTTP error ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (data.request_info?.success === false) {
      console.error("❌ Rainforest API error:", data.request_info?.message);
      return [];
    }

    const results = data.search_results || [];
    console.log(`✅ Rainforest: ${results.length} résultats bruts`);

    const seen = new Set<string>();
    let products = results
      .map((item: any) => ({
        title: item.title || "",
        asin: toAsin(item.asin),
        link: item.link, // Utiliser le lien original de l'API
        originalLink: item.link,
        price: parseFloat(String(item.price?.value || item.price || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || null,
        rating: item.rating || null,
        reviewCount: item.reviews_count || null,
        imageUrl: item.image || null,
      }))
      .filter(p => p.title.length > 5 && p.link && p.link.includes('amazon'))
      .filter(p => {
        if (p.asin && isValidAsin(p.asin)) {
          if (seen.has(p.asin)) return false;
          seen.add(p.asin);
        }
        return true;
      })
      .filter(p => !p.price || (p.price >= minPrice && p.price <= maxPrice))
      .slice(0, 20);

    // 1) tri: ASIN d'abord, puis meilleure note/nb avis si dispo
    products.sort((a: any, b: any) => {
      const aa = isValidAsin(a.asin) ? 1 : 0;
      const bb = isValidAsin(b.asin) ? 1 : 0;
      if (bb !== aa) return bb - aa; // ASIN en premier
      const ar = a.rating ?? 0, br = b.rating ?? 0;
      const ac = a.reviewCount ?? 0, bc = b.reviewCount ?? 0;
      if (br !== ar) return br - ar;
      return bc - ac;
    });

    // 2) compresse à 5 items utiles
    products = products.slice(0, 5);

    console.log(`✅ Rainforest: ${products.length} produits valides filtrés`);
    return products;
  } catch (error) {
    console.error("❌ Erreur Rainforest:", error);
    return [];
  }
}

/* =========================
   ENHANCED PRODUCT SEARCH
========================= */
async function enrichWithAmazonData(gptSuggestions: any[], serpApiKey?: string, rainforestApiKey?: string) {
  console.log(`🔍 Enrichissement de ${gptSuggestions.length} suggestions GPT`);
  
  const enrichedSuggestions = [];
  
  for (const suggestion of gptSuggestions) {
    // Créer des liens de recherche fiables plutôt que des ASIN potentiellement cassés
    const searchKeywords = suggestion.searchKeywords || suggestion.title;
    const cleanKeywords = toSearchKeywords(searchKeywords);
    const amazonSearchUrl = `https://www.amazon.fr/s?k=${encodeURIComponent(cleanKeywords)}&ref=sr_st_relevancerank`;
    
    let enrichedSuggestion = {
      ...suggestion,
      amazonData: {
        searchUrl: amazonSearchUrl,
        productUrl: suggestion.amazonUrl || amazonSearchUrl,
        addToCartUrl: null, // Pas possible sans ASIN spécifique
        matchType: "search"
      }
    };
    
      // Essayer d'enrichir avec des données Amazon spécifiques (optionnel)
      if (serpApiKey || rainforestApiKey) {
        const searchQuery = toSearchKeywords((suggestion.searchKeywords || suggestion.title)).toLowerCase();
        console.log(`🔍 Tentative d'enrichissement spécifique pour: "${searchQuery}"`);
        
        let foundProducts: any[] = [];
        
        // Gestion prix souples
        const est = Number.isFinite(suggestion.estimatedPrice) && suggestion.estimatedPrice > 0 ? suggestion.estimatedPrice : 30;
        const minP = Math.max(5, Math.floor(est * 0.4));
        const maxP = Math.max(minP + 10, Math.floor(est * 3.5));
        
        // Tentative avec SerpAPI si disponible
        if (serpApiKey) {
          try {
            foundProducts = await searchWithSerpApi(searchQuery, serpApiKey, minP, maxP);
            if (foundProducts.length > 0) {
              console.log(`✅ Produit spécifique trouvé via SerpAPI: ${foundProducts[0].title}`);
            }
          } catch (error) {
            console.log(`⚠️ SerpAPI non disponible pour: ${searchQuery}`);
          }
        }
        
        // Tentative avec RainforestAPI si pas de résultats et disponible
        if (rainforestApiKey && foundProducts.length === 0) {
          try {
            foundProducts = await searchWithRainforest(searchQuery, rainforestApiKey, minP, maxP);
            if (foundProducts.length > 0) {
              console.log(`✅ Produit spécifique trouvé via RainforestAPI: ${foundProducts[0].title}`);
            }
          } catch (error) {
            console.log(`⚠️ RainforestAPI non disponible pour: ${searchQuery}`);
          }
        }
      
      // Si on a trouvé des produits Amazon spécifiques, utiliser le premier
      if (foundProducts.length > 0) {
        const withAsin = foundProducts.find(p => isValidAsin(p.asin));
        const viaLinkAsin = foundProducts.find(p => extractAsinFromUrl(p.link || p.originalLink));
        const realProduct = withAsin || viaLinkAsin || foundProducts[0];

        // Si on a trouvé un ASIN via le 2e passage, renseigne-le
        if (!realProduct.asin) {
          const linkAsin = extractAsinFromUrl(realProduct.link || realProduct.originalLink);
          if (linkAsin) realProduct.asin = linkAsin;
        }
        
        console.log(`✅ Produit trouvé: "${realProduct.title}" - Lien: ${realProduct.link}`);
        
        // Construire le lien direct vers le produit
        let productUrl = amazonSearchUrl; // fallback par défaut
        
        if (realProduct.asin && isValidAsin(realProduct.asin)) {
          // Si on a un ASIN valide, créer un lien direct vers le produit
          productUrl = `https://www.amazon.fr/dp/${toAsin(realProduct.asin)}`;
        } else if (realProduct.originalLink || realProduct.link) {
          // Sinon utiliser le lien de l'API
          productUrl = realProduct.originalLink || realProduct.link;
        }
        
        enrichedSuggestion = {
          ...suggestion,
          title: realProduct.title, // Utiliser le titre réel du produit
          estimatedPrice: Math.round(realProduct.price || suggestion.estimatedPrice),
          amazonData: {
            asin: realProduct.asin,
            rating: realProduct.rating,
            reviewCount: realProduct.reviewCount,
            imageUrl: realProduct.imageUrl,
            productUrl: withAffiliate(productUrl), // Lien direct vers le produit ou fallback
            searchUrl: amazonSearchUrl,
            addToCartUrl: realProduct.asin && isValidAsin(realProduct.asin) && partnerTagActive && partnerTag
              ? `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${realProduct.asin}&Quantity.1=1&tag=${partnerTag}`
              : null,
            matchType: realProduct.asin && isValidAsin(realProduct.asin) ? "exact" : "api_link"
          }
        };
      } else {
        console.log(`⚠️ Aucun produit spécifique trouvé pour: "${searchQuery}"`);
      }
    }
    
    enrichedSuggestions.push(enrichedSuggestion);
  }
  
  console.log(`✅ ${enrichedSuggestions.length} suggestions enrichies avec liens fiables`);
  return enrichedSuggestions;
}

/* =========================
   EDGE FUNCTION
========================= */
Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method === "GET") return jsonResponse({ ok: true, timestamp: new Date().toISOString() });
    if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

    const body = await req.json();
    const { personId, eventType, budget } = body || {};
    
    if (!personId || typeof eventType !== "string" || typeof budget !== "number") {
      return jsonResponse({ success: false, error: "Paramètres manquants ou invalides" }, 400);
    }

    console.log(`🎁 Génération d'idées cadeaux pour personne ${personId}, événement: ${eventType}, budget: ${budget}€`);

    // Variables d'environnement
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    const serpApiKey = Deno.env.get("SERPAPI_API_KEY");
    const rainforestApiKey = Deno.env.get("RAINFOREST_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!openAIKey) return jsonResponse({ success: false, error: "Clé OpenAI manquante" }, 500);
    if (!supabaseUrl || !supabaseAnon || !supabaseService) return jsonResponse({ success: false, error: "Configuration Supabase incomplète" }, 500);

    // Authentification
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Authentification requise" }, 401);

    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return jsonResponse({ success: false, error: "Authentification échouée" }, 401);

    // Client Supabase avec service role
    const supabase = createClient(supabaseUrl, supabaseService, { auth: { persistSession: false } });

    // Vérification des limites d'usage
    const { data: usageResult, error: usageError } = await supabase.rpc("check_and_increment_ai_usage", { p_user_id: user.id });
    if (usageError) return jsonResponse({ success: false, error: "Erreur vérification usage" }, 500);
    if (!usageResult.allowed) {
      return jsonResponse({
        success: false,
        error: "Limite quotidienne dépassée",
        details: { limit: usageResult.limit, remaining: usageResult.remaining, resetTime: usageResult.reset_time },
      }, 429);
    }

    // Récupération des données de la personne
    const { data: personData, error: personError } = await supabase
      .from("persons")
      .select("id, name, age_years, interests, notes, relationship")
      .eq("id", personId)
      .single();

    if (personError || !personData) {
      return jsonResponse({ success: false, error: "Personne non trouvée" }, 404);
    }

    console.log(`👤 Données personne: ${personData.name}, intérêts: ${(personData.interests || []).join(", ")}`);

    // Étape 1: Génération d'idées cadeaux par GPT
    console.log("🤖 Génération d'idées cadeaux par GPT...");
    const gptSuggestions = await generateGiftIdeasWithGPT(personData, eventType, budget, openAIKey);
    
    if (gptSuggestions.length === 0) {
      return jsonResponse({ 
        success: false, 
        error: "Impossible de générer des idées cadeaux" 
      }, 500);
    }

    // Étape 2: Enrichissement avec données Amazon réelles (optionnel)
    console.log("🔍 Enrichissement avec données Amazon...");
    const enrichedSuggestions = await enrichWithAmazonData(gptSuggestions, serpApiKey, rainforestApiKey);

    // Formatage final des suggestions
    const finalSuggestions = enrichedSuggestions.map((suggestion: any) => ({
      title: suggestion.title,
      description: suggestion.description,
      estimatedPrice: suggestion.estimatedPrice,
      confidence: 0.9,
      reasoning: suggestion.reasoning,
      category: "Produit Amazon",
      alternatives: [],
      purchaseLinks: [
        // Utiliser productUrl en priorité pour les liens directs, sinon searchUrl
        withAffiliate(
          suggestion.amazonData?.productUrl
          || suggestion.amazonData?.searchUrl
          || `https://www.amazon.fr/s?k=${encodeURIComponent(toSearchKeywords(suggestion.title))}&ref=sr_st_relevancerank`
        )
      ],
      priceInfo: {
        displayPrice: suggestion.estimatedPrice,
        source: suggestion.amazonData?.matchType === "exact" ? "amazon_price" : "ai_estimate",
        originalEstimate: suggestion.estimatedPrice,
        amazonPrice: suggestion.amazonData?.matchType === "exact" ? suggestion.estimatedPrice : null
      },
      amazonData: suggestion.amazonData || {
        searchUrl: `https://www.amazon.fr/s?k=${encodeURIComponent(toSearchKeywords(suggestion.title))}&ref=sr_st_relevancerank`,
        productUrl: `https://www.amazon.fr/s?k=${encodeURIComponent(toSearchKeywords(suggestion.title))}&ref=sr_st_relevancerank`,
        addToCartUrl: null,
        matchType: "search"
      }
    }));

    console.log(`✅ ${finalSuggestions.length} suggestions finales générées`);
    
    return jsonResponse({
      success: true,
      suggestions: finalSuggestions,
      personName: personData.name,
      message: `${finalSuggestions.length} idées cadeaux générées pour ${personData.name}`
    });

  } catch (error: any) {
    console.error("❌ Erreur générale:", error);
    return jsonResponse({
      success: false,
      error: "Erreur interne du serveur",
      details: error?.message
    }, 500);
  }
});