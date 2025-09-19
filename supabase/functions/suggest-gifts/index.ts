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
   SEARCH QUERIES GENERATION
========================= */
function generateSearchQueries(personData: any, eventType: string, budget: number): string[] {
  const interests: string[] = personData.interests || [];
  const notes = (personData.notes || "").toLowerCase();
  const age = personData.age_years || 0;
  const queries: string[] = [];

  // Requêtes basées sur les intérêts
  if (interests.includes("Sport")) {
    queries.push("tapis yoga premium", "bouteille eau isotherme", "accessoire fitness");
  }
  if (interests.includes("Tech")) {
    queries.push("chargeur sans fil", "écouteurs bluetooth", "accessoire smartphone");
  }
  if (interests.includes("Cuisine")) {
    queries.push("ustensile cuisine premium", "accessoire cuisine", "gadget culinaire");
  }
  if (interests.includes("Lecture")) {
    queries.push("lampe lecture", "support livre", "accessoire lecture");
  }

  // Requêtes basées sur les notes
  if (notes.includes("musique")) queries.push("accessoire musique", "casque audio");
  if (notes.includes("nature")) queries.push("produit écologique", "accessoire randonnée");
  if (notes.includes("voyage")) queries.push("accessoire voyage", "organisateur bagage");

  // Requêtes par âge
  if (age > 60) queries.push("cadeau senior pratique");
  else if (age > 30) queries.push("cadeau adulte élégant");
  else if (age > 15) queries.push("cadeau jeune tendance");

  // Requêtes par type d'événement
  if (eventType === "birthday") queries.push("cadeau anniversaire original");
  if (eventType === "wedding") queries.push("cadeau mariage utile");

  // Fallback si pas d'intérêts spécifiques
  if (queries.length === 0) {
    queries.push("cadeau original", "accessoire pratique", "objet utile");
  }

  return queries.slice(0, 5); // Max 5 requêtes
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
  console.log(`Recherche SerpAPI: ${query} (${minPrice}-${maxPrice}€)`);

  try {
    const res = await withTimeoutFetch(url, {}, 10000);
    if (!res.ok) {
      console.error("SerpAPI HTTP error", res.status);
      return [];
    }

    const data = await res.json();
    if (data.error) {
      console.error("SerpAPI API error:", data.error);
      return [];
    }

    // Combiner product_results et organic_results
    const allResults = [
      ...(data.product_results || []),
      ...(data.organic_results || []),
    ];

    console.log(`SerpAPI retourné ${allResults.length} résultats pour "${query}"`);

    // Normaliser et filtrer pour garder seulement les liens directs
    const products = allResults
      .map((item: any) => ({
        title: item.title || "",
        asin: extractAsinFromUrl(item.link) || toAsin(item.asin),
        link: item.link,
        price: parseFloat(String(item.price?.value || item.price || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || null,
        rating: item.rating || null,
        reviewCount: item.reviews_count || null,
        imageUrl: item.thumbnail || item.image || null,
        snippet: item.snippet || item.description || "",
      }))
      .filter((p: any) => {
        // Garder seulement les produits avec ASIN valide ET lien direct
        const hasValidAsin = isValidAsin(p.asin);
        const hasDirectLink = p.link && (p.link.includes("/dp/") || p.link.includes("/gp/product/"));
        const priceInRange = !p.price || (p.price >= minPrice && p.price <= maxPrice);
        
        return hasValidAsin && hasDirectLink && priceInRange && p.title.length > 0;
      })
      .map((p: any) => ({
        ...p,
        // S'assurer que le lien est au format /dp/ASIN
        link: `https://www.amazon.fr/dp/${p.asin}`,
      }))
      .slice(0, 10); // Max 10 par requête

    console.log(`${products.length} produits valides après filtrage`);
    return products;
  } catch (error) {
    console.error("Erreur SerpAPI:", error);
    return [];
  }
}

/* =========================
   RAINFOREST API SEARCH
========================= */
async function searchWithRainforest(query: string, rainforestApiKey: string, minPrice: number, maxPrice: number) {
  const url = `https://api.rainforestapi.com/request?api_key=${rainforestApiKey}&type=search&amazon_domain=amazon.fr&search_term=${encodeURIComponent(query)}`;
  console.log(`Recherche Rainforest: ${query} (${minPrice}-${maxPrice}€)`);

  try {
    const res = await withTimeoutFetch(url, {}, 10000);
    if (!res.ok) {
      console.error("Rainforest HTTP error", res.status);
      return [];
    }

    const data = await res.json();
    if (data.request_info?.success === false) {
      console.error("Rainforest API error:", data.request_info?.message);
      return [];
    }

    const results = data.search_results || [];
    console.log(`Rainforest retourné ${results.length} résultats pour "${query}"`);

    const products = results
      .map((item: any) => ({
        title: item.title || "",
        asin: toAsin(item.asin),
        link: item.link,
        price: parseFloat(String(item.price?.value || item.price || "0").replace(/[^\d.,]/g, "").replace(",", ".")) || null,
        rating: item.rating || null,
        reviewCount: item.reviews_count || null,
        imageUrl: item.image || null,
        snippet: item.snippet || "",
      }))
      .filter((p: any) => {
        const hasValidAsin = isValidAsin(p.asin);
        const hasDirectLink = p.link && (p.link.includes("/dp/") || p.link.includes("/gp/product/"));
        const priceInRange = !p.price || (p.price >= minPrice && p.price <= maxPrice);
        
        return hasValidAsin && hasDirectLink && priceInRange && p.title.length > 0;
      })
      .map((p: any) => ({
        ...p,
        link: `https://www.amazon.fr/dp/${p.asin}`,
      }))
      .slice(0, 10);

    console.log(`${products.length} produits valides après filtrage`);
    return products;
  } catch (error) {
    console.error("Erreur Rainforest:", error);
    return [];
  }
}

/* =========================
   MAIN SEARCH FUNCTION
========================= */
async function searchAmazonProducts(queries: string[], serpApiKey?: string, rainforestApiKey?: string, minPrice = 10, maxPrice = 100) {
  let allProducts: any[] = [];

  // Essayer SerpAPI en premier
  if (serpApiKey) {
    console.log("Utilisation de SerpAPI");
    for (const query of queries) {
      const products = await searchWithSerpApi(query, serpApiKey, minPrice, maxPrice);
      allProducts.push(...products);
      
      // Si on a assez de produits, on s'arrête
      if (allProducts.length >= 15) break;
    }
  }

  // Si pas assez de résultats, essayer Rainforest
  if (allProducts.length < 10 && rainforestApiKey) {
    console.log("Fallback vers Rainforest API");
    for (const query of queries) {
      const products = await searchWithRainforest(query, rainforestApiKey, minPrice, maxPrice);
      allProducts.push(...products);
      
      if (allProducts.length >= 15) break;
    }
  }

  // Dédupliquer par ASIN et trier par qualité
  const uniqueProducts = allProducts
    .filter((p, i, self) => i === self.findIndex(q => q.asin === p.asin))
    .sort((a, b) => {
      const scoreA = (a.rating || 3) * Math.log(a.reviewCount || 1) + (a.price ? 1 : 0);
      const scoreB = (b.rating || 3) * Math.log(b.reviewCount || 1) + (b.price ? 1 : 0);
      return scoreB - scoreA;
    });

  console.log(`${uniqueProducts.length} produits uniques trouvés`);
  return uniqueProducts;
}

/* =========================
   AI SELECTION
========================= */
async function selectBestProducts(products: any[], personData: any, eventType: string, budget: number, openAIKey: string) {
  if (products.length === 0) return [];

  const personalInfo = personData.notes 
    ? `Notes: "${personData.notes}"`
    : `Âge: ${personData.age_years || "?"} | Intérêts: ${(personData.interests || []).join(", ") || "N/A"} | Relation: ${personData.relationship || "N/A"}`;

  const prompt = `Sélectionne exactement 3 produits Amazon parfaits pour ${personData.name}.

${personalInfo}
Événement: ${eventType}
Budget: ${budget}€

PRODUITS DISPONIBLES:
${products.slice(0, 15).map((p, i) => 
  `${i + 1}. ${p.title} - ${p.price || "Prix non disponible"}€ (ASIN: ${p.asin})`
).join("\n")}

INSTRUCTIONS:
- Choisis EXACTEMENT 3 produits de la liste ci-dessus
- Varie les types de produits
- Respecte le budget et les goûts de la personne
- Renvoie un JSON avec le format exact suivant`;

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
          {
            role: "system",
            content: `Tu renvoies UNIQUEMENT un JSON valide avec ce format exact:
{
  "selections": [
    {
      "asin": "<ASIN exact de la liste>",
      "reasoning": "<Pourquoi ce produit est parfait pour cette personne>"
    }
  ]
}
IMPORTANT: N'invente aucun ASIN, utilise seulement ceux de la liste.`
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    }, 10000);

    if (!response.ok) {
      console.error("Erreur OpenAI:", response.status);
      return products.slice(0, 3); // Fallback: premiers produits
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content?.trim() || "";
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();

    const parsed = JSON.parse(content);
    const selections = parsed.selections || [];

    console.log(`IA a sélectionné ${selections.length} produits`);

    // Mapper les sélections IA aux vrais produits
    const selectedProducts = selections
      .map((sel: any) => {
        const product = products.find(p => p.asin === toAsin(sel.asin));
        if (product) {
          return {
            ...product,
            aiReasoning: sel.reasoning || `Produit sélectionné pour ${personData.name}`
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 3);

    // Si pas assez de sélections IA, compléter avec les meilleurs produits
    while (selectedProducts.length < 3 && products.length > selectedProducts.length) {
      const usedAsins = new Set(selectedProducts.map(p => p.asin));
      const nextProduct = products.find(p => !usedAsins.has(p.asin));
      if (nextProduct) {
        selectedProducts.push({
          ...nextProduct,
          aiReasoning: `Produit recommandé pour ${personData.name}`
        });
      } else {
        break;
      }
    }

    return selectedProducts;
  } catch (error) {
    console.error("Erreur sélection IA:", error);
    return products.slice(0, 3); // Fallback: premiers produits
  }
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

    console.log(`Génération d'idées cadeaux pour personne ${personId}, événement: ${eventType}, budget: ${budget}€`);

    // Variables d'environnement
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    const serpApiKey = Deno.env.get("SERPAPI_API_KEY");
    const rainforestApiKey = Deno.env.get("RAINFOREST_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!openAIKey) return jsonResponse({ success: false, error: "Clé OpenAI manquante" }, 500);
    if (!supabaseUrl || !supabaseAnon || !supabaseService) return jsonResponse({ success: false, error: "Configuration Supabase incomplète" }, 500);
    if (!serpApiKey && !rainforestApiKey) return jsonResponse({ success: false, error: "Aucune API de recherche disponible" }, 500);

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
    const { data: personData, error: personError } = await supabase.from("persons").select("*").eq("id", personId).maybeSingle();
    if (personError) return jsonResponse({ success: false, error: "Erreur base de données", details: personError.message }, 500);
    if (!personData) return jsonResponse({ success: false, error: "Personne non trouvée" }, 404);

    console.log(`Données personne: ${personData.name}, intérêts: ${personData.interests?.join(", ") || "aucun"}`);

    // Génération des requêtes de recherche
    const queries = generateSearchQueries(personData, eventType, budget);
    console.log(`Requêtes générées: ${queries.join(", ")}`);

    // Plage de prix (plus souple)
    const minPrice = Math.max(5, Math.round(budget * 0.2));
    const maxPrice = Math.round(budget * 1.2);

    console.log(`Recherche produits dans la plage ${minPrice}-${maxPrice}€`);

    // Recherche des produits
    const products = await searchAmazonProducts(queries, serpApiKey, rainforestApiKey, minPrice, maxPrice);

    if (products.length === 0) {
      console.log("Aucun produit trouvé");
      return jsonResponse({
        success: false,
        error: "Aucun produit trouvé correspondant aux critères",
        debug: { queries, minPrice, maxPrice }
      }, 200);
    }

    // Sélection des 3 meilleurs produits par l'IA
    const selectedProducts = await selectBestProducts(products, personData, eventType, budget, openAIKey);

    if (selectedProducts.length === 0) {
      return jsonResponse({
        success: false,
        error: "Erreur lors de la sélection des produits"
      }, 500);
    }

    // Formatage des suggestions finales
    const suggestions = selectedProducts.map((product: any) => ({
      title: product.title,
      description: product.aiReasoning || `Produit recommandé pour ${personData.name}`,
      estimatedPrice: Math.round(product.price || budget * 0.7),
      confidence: 0.9,
      reasoning: product.aiReasoning || `Sélectionné pour ${personData.name}`,
      category: "Produit Amazon",
      alternatives: [],
      purchaseLinks: [withAffiliate(product.link)],
      priceInfo: {
        displayPrice: Math.round(product.price || budget * 0.7),
        source: "amazon_api",
        amazonPrice: product.price
      },
      amazonData: {
        asin: product.asin,
        productUrl: withAffiliate(product.link),
        addToCartUrl: partnerTagActive && partnerTag 
          ? `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${product.asin}&Quantity.1=1&tag=${partnerTag}`
          : null,
        searchUrl: withAffiliate(product.link),
        matchType: "direct",
        rating: product.rating,
        reviewCount: product.reviewCount,
        imageUrl: product.imageUrl
      }
    }));

    console.log(`${suggestions.length} suggestions finales générées`);

    return jsonResponse({
      success: true,
      suggestions,
      personName: personData.name,
      eventType,
      budget,
      budgetRespected: true,
      debug: {
        totalProductsFound: products.length,
        selectedCount: selectedProducts.length,
        queriesUsed: queries
      }
    });

  } catch (error: any) {
    console.error("Erreur générale:", error);
    return jsonResponse({
      success: false,
      error: "Erreur interne du serveur",
      details: error?.message
    }, 500);
  }
});