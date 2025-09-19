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
const ASIN_RES = [
  /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
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

  // Exemples d'ASIN Amazon valides pour inspiration
  const asinExamples = [
    "B08N5WRWNW", "B07FZ8S74R", "B09JQSYQGZ", "B08HLZD9DF", "B0756CYWWD",
    "B08F5P4GYF", "B09G9FPHY6", "B08Z382JNZ", "B087QLRRK8", "B08XB2FL7G",
    "B09KXKPJVY", "B08GKQHSZ4", "B09M7HJHQT", "B08YN7D8WX", "B09NPQSM4L"
  ];

  const prompt = `Génère exactement 3 idées cadeaux parfaites pour ${personData.name}.

${personalInfo}
Événement: ${eventType}
Budget max: ${budget}€

INSTRUCTIONS IMPORTANTES:
- Génère 3 produits concrets qui EXISTENT vraiment sur Amazon (marques connues, modèles réels)
- Utilise des marques populaires comme Nike, Adidas, Apple, Samsung, Sony, Philips, etc.
- Varie les catégories de produits selon ses intérêts
- Respecte absolument le budget et les goûts de la personne
- Pour les ASIN, utilise ce format exact: B + 8 à 9 caractères alphanumériques (ex: B08N5WRWNW)
- Crée des ASIN crédibles qui ressemblent à de vrais ASIN Amazon

EXEMPLES D'ASIN VALIDES: ${asinExamples.slice(0, 5).join(", ")}

Renvoie UNIQUEMENT un JSON avec ce format exact:
{
  "suggestions": [
    {
      "title": "Nom précis du produit avec marque (ex: Nike Air Force 1 '07 Blanc)",
      "description": "Description détaillée expliquant pourquoi c'est parfait pour cette personne",
      "estimatedPrice": prix_en_euros_entier,
      "asin": "B08XXXXXXX",
      "reasoning": "Explication personnalisée basée sur ses intérêts"
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

    console.log(`GPT a généré ${suggestions.length} idées cadeaux`);
    return suggestions.slice(0, 3);
  } catch (error) {
    console.error("Erreur génération GPT:", error);
    // Fallback si GPT échoue
    return [
      {
        title: "Coffret cadeau personnalisé",
        description: `Un coffret soigneusement sélectionné pour ${personData.name}`,
        estimatedPrice: Math.min(budget, 35),
        asin: "B08XYZABC0",
        reasoning: `Cadeau polyvalent adapté à ${personData.name}`
      },
      {
        title: "Accessoire premium de qualité",
        description: `Un accessoire pratique et élégant pour le quotidien`,
        estimatedPrice: Math.min(budget, 25),
        asin: "B09DEFGHI1",
        reasoning: "Produit utile et apprécié au quotidien"
      },
      {
        title: "Article tendance original",
        description: `Un produit original qui fera plaisir à coup sûr`,
        estimatedPrice: Math.min(budget, 20),
        asin: "B07JKLMNO2",
        reasoning: "Cadeau original et surprenant"
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

    const products = allResults
      .map((item: any) => ({
        title: item.title || "",
        asin: extractAsinFromUrl(item.link) || toAsin(item.asin),
        link: item.link,
        price: parseFloat(String(item.price?.value || item.price || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || null,
        rating: item.rating || null,
        reviewCount: item.reviews_count || null,
        imageUrl: item.thumbnail || item.image || null,
      }))
      .filter(p => p.title.length > 5 && isValidAsin(p.asin))
      .filter(p => !p.price || (p.price >= minPrice && p.price <= maxPrice))
      .map(p => ({ ...p, link: `https://www.amazon.fr/dp/${p.asin}` }))
      .slice(0, 5);

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

    const products = results
      .map((item: any) => ({
        title: item.title || "",
        asin: toAsin(item.asin),
        link: item.link,
        price: parseFloat(String(item.price?.value || item.price || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || null,
        rating: item.rating || null,
        reviewCount: item.reviews_count || null,
        imageUrl: item.image || null,
      }))
      .filter(p => p.title.length > 5 && isValidAsin(p.asin))
      .filter(p => !p.price || (p.price >= minPrice && p.price <= maxPrice))
      .map(p => ({ ...p, link: `https://www.amazon.fr/dp/${p.asin}` }))
      .slice(0, 5);

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
    // Par défaut, utiliser l'ASIN généré par GPT pour créer un lien direct
    let enrichedSuggestion = {
      ...suggestion,
      amazonData: {
        asin: suggestion.asin,
        productUrl: withAffiliate(`https://www.amazon.fr/dp/${suggestion.asin}`),
        addToCartUrl: partnerTagActive && partnerTag 
          ? `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${suggestion.asin}&Quantity.1=1&tag=${partnerTag}`
          : null,
        matchType: "gpt_generated"
      }
    };
    
    // Essayer d'enrichir avec des données Amazon réelles (optionnel)
    const searchQuery = suggestion.title.toLowerCase().replace(/[^\w\s]/g, '').slice(0, 50);
    console.log(`🔍 Tentative d'enrichissement pour: "${searchQuery}"`);
    
    let foundProducts: any[] = [];
    
    // Tentative avec SerpAPI si disponible
    if (serpApiKey) {
      try {
        foundProducts = await searchWithSerpApi(searchQuery, serpApiKey, 5, suggestion.estimatedPrice * 3);
        if (foundProducts.length > 0) {
          console.log(`✅ Produit réel trouvé via SerpAPI: ${foundProducts[0].title}`);
        }
      } catch (error) {
        console.log(`⚠️ SerpAPI non disponible pour: ${searchQuery}`);
      }
    }
    
    // Tentative avec RainforestAPI si pas de résultats et disponible
    if (rainforestApiKey && foundProducts.length === 0) {
      try {
        foundProducts = await searchWithRainforest(searchQuery, rainforestApiKey, 5, suggestion.estimatedPrice * 3);
        if (foundProducts.length > 0) {
          console.log(`✅ Produit réel trouvé via RainforestAPI: ${foundProducts[0].title}`);
        }
      } catch (error) {
        console.log(`⚠️ RainforestAPI non disponible pour: ${searchQuery}`);
      }
    }
    
    // Si on a trouvé des produits Amazon réels, utiliser le premier
    if (foundProducts.length > 0) {
      const realProduct = foundProducts[0];
      enrichedSuggestion = {
        ...suggestion,
        title: realProduct.title, // Utiliser le titre réel du produit
        estimatedPrice: Math.round(realProduct.price || suggestion.estimatedPrice),
        amazonData: {
          asin: realProduct.asin,
          rating: realProduct.rating,
          reviewCount: realProduct.reviewCount,
          imageUrl: realProduct.imageUrl,
          productUrl: withAffiliate(realProduct.link), // Lien direct vers la fiche produit
          addToCartUrl: partnerTagActive && partnerTag 
            ? `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${realProduct.asin}&Quantity.1=1&tag=${partnerTag}`
            : null,
          matchType: "api_enhanced"
        }
      };
    } else {
      console.log(`ℹ️ Utilisation du produit GPT généré pour: ${searchQuery}`);
    }
    
    enrichedSuggestions.push(enrichedSuggestion);
  }
  
  console.log(`✅ ${enrichedSuggestions.length} suggestions enrichies avec liens directs`);
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
        suggestion.amazonData?.productUrl || withAffiliate(`https://www.amazon.fr/dp/${suggestion.asin}`)
      ],
      priceInfo: {
        displayPrice: suggestion.estimatedPrice,
        source: suggestion.amazonData?.matchType === "api_enhanced" ? "amazon_api" : "ai_estimate",
        originalEstimate: suggestion.estimatedPrice,
        amazonPrice: suggestion.amazonData?.matchType === "api_enhanced" ? suggestion.estimatedPrice : null
      },
      amazonData: suggestion.amazonData || {
        asin: suggestion.asin,
        productUrl: withAffiliate(`https://www.amazon.fr/dp/${suggestion.asin}`),
        addToCartUrl: partnerTagActive && partnerTag 
          ? `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${suggestion.asin}&Quantity.1=1&tag=${partnerTag}`
          : null,
        matchType: "gpt_generated"
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