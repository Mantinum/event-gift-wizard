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
const VERIFY_DP = (Deno.env.get("VERIFY_DP") || "false").toLowerCase() === "true";

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
    // Déroule les redirects SerpAPI (Picasso / gp/redirect) qui encodent l'URL réelle dans ?url=
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

async function dpLooksValid(url: string, ms = 800) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { method: "HEAD", redirect: "manual", signal: c.signal });
    return r.status >= 200 && r.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/* =========================
   TEXT NORMALIZATION & MATCH
========================= */
const normalizeTitle = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function similarity(a: string, b: string) {
  const A = new Set(normalizeTitle(a).split(" ").filter((x) => x.length > 1));
  const B = new Set(normalizeTitle(b).split(" ").filter((x) => x.length > 1));
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni ? inter / uni : 0;
}
function bestPoolMatchByTitle(title: string, pool: any[], threshold = 0.45) {
  let best: any = null, bestScore = 0;
  for (const p of pool) {
    const score = similarity(title, p.title || "");
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return bestScore >= threshold ? best : null;
}

/* =========================
   SEARCH QUERY BUILDER
========================= */
function generateTargetedSearchQueries(personData: any, eventType: string, budget: number): string[] {
  const queries: string[] = [];
  const interests: string[] = personData.interests || [];
  const notes = (personData.notes || "").toLowerCase();
  const age = personData.age_years || 0;

  // Variantes random
  const variants = [["nouveau","moderne","tendance"],["original","unique","créatif"],["pratique","utile","fonctionnel"],["premium","qualité","haut de gamme"]];
  const pick = () => {
    const cat = variants[Math.floor(Math.random() * variants.length)];
    return cat[Math.floor(Math.random() * cat.length)];
  };

  // Déterministes par intérêt (assurent des hits)
  const forced: string[] = [];
  if (interests.includes("Sport")) forced.push("tapis yoga", "bouteille isotherme sport");
  if (interests.includes("Tech")) forced.push("chargeur sans fil", "écouteurs bluetooth");
  if (interests.includes("Cuisine")) forced.push("balance de cuisine", "couteau de chef");
  if (interests.includes("Lecture")) forced.push("lampe de lecture", "marque-page cuir");

  // Créatives
  if (interests.includes("Sport")) queries.push(`accessoire fitness ${pick()}`, `équipement sport ${pick()}`);
  if (interests.includes("Tech")) queries.push(`gadget tech ${pick()}`, `accessoire high tech ${pick()}`);
  if (interests.includes("Cuisine")) queries.push(`ustensile cuisine ${pick()}`, `accessoire cuisine ${pick()}`);
  if (interests.includes("Lecture")) queries.push(`livre ${pick()} 2025`, `accessoire lecture ${pick()}`);
  if (notes.includes("nature")) queries.push(`produit écologique ${pick()}`);
  if (notes.includes("musique")) queries.push(`accessoire musique ${pick()}`);

  if (age > 60) queries.push(`cadeau senior ${pick()}`);
  else if (age > 30) queries.push(`cadeau adulte ${pick()}`);
  else if (age > 15) queries.push(`cadeau jeune adulte ${pick()}`);

  if (eventType === "birthday") queries.push(`cadeau anniversaire ${pick()}`);
  if (eventType === "wedding") queries.push(`cadeau mariage ${pick()}`);

  // Merge, shuffle, limiter
  const final = [...forced, ...queries]
    .map((q) => q.trim())
    .filter(Boolean)
    .sort(() => Math.random() - 0.5)
    .slice(0, 4); // jusqu'à 4 requêtes
  return final.length ? final : ["cadeau original", "accessoire pratique"];
}

/* =========================
   NORMALISATION ITEMS
========================= */
function normalizeRainforestItem(item: any) {
  const asinField = toAsin(item.asin);
  const asinFromLink = extractAsinFromUrl(item.link);
  const asin = isValidAsin(asinFromLink) ? asinFromLink : asinField;

  const direct = item.link && item.link.includes("/dp/") ? item.link : null;
  const dp = !direct && isValidAsin(asin) ? `https://www.amazon.fr/dp/${asin}` : null;
  const title = item.title || "";
  const search = `https://www.amazon.fr/s?k=${encodeURIComponent(title.replace(/[^\w\s-]/g, " ").trim())}`;

  const price = parseFloat(String(item.price?.value ?? item.price ?? "")
    .replace(/[^\d.,]/g, "")
    .replace(",", ".")) || undefined;

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
    displayDescription: item.snippet || null,
  };
}

function normalizeSerpApiItem(item: any) {
  const asinField = toAsin(item.asin);
  const asinFromLink = extractAsinFromUrl(item.link);
  const asin = isValidAsin(asinFromLink) ? asinFromLink : asinField;

  const direct = item.link && item.link.includes("/dp/") ? item.link : null;
  const dp = !direct && isValidAsin(asin) ? `https://www.amazon.fr/dp/${asin}` : null;
  const title = item.title || "";
  const search = `https://www.amazon.fr/s?k=${encodeURIComponent(title.replace(/[^\w\s-]/g, " ").trim())}`;

  const priceObj = typeof item.price === "object" ? (item.price?.value ?? parseFloat(String(item.price?.raw ?? "").replace(/[^\d.,]/g, "").replace(",", "."))) : parseFloat(String(item.price ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
  const price = priceObj || undefined;

  return {
    title,
    asin,
    link: withAffiliate(direct || dp || search),
    searchUrl: withAffiliate(search),
    price,
    rating: item.rating,
    reviewCount: item.reviews_count,
    imageUrl: item.thumbnail || item.image,
    snippet: item.snippet,
    description: item.description,
    displayDescription: item.snippet || item.description || null,
  };
}

/* =========================
   APIS: SERPAPI & RAINFOREST
========================= */
async function searchAmazonProductsSerpApi(query: string, serpApiKey: string, minPrice: number, maxPrice: number): Promise<any[]> {
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
  const res = await withTimeoutFetch(url, {}, 10000);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("SerpAPI HTTP error", res.status, txt);
    return [];
  }
  const data = await res.json();
  if (data.error) {
    console.error("SerpAPI API error:", data.error);
    return [];
  }
  const results = [
    ...(data.product_results || []),
    ...(data.organic_results || []),
  ];

  const products = results
    .filter((it: any) => it.asin || extractAsinFromUrl(it.link))
    .map(normalizeSerpApiItem)
    .filter((p: any) => (p.link?.includes("/dp/")) || isValidAsin(p.asin))
    .filter((p: any) => !p.price || (p.price >= minPrice && p.price <= maxPrice))
    .slice(0, 8);

  return products;
}

async function searchAmazonProductsRainforest(query: string, rainforestApiKey: string, minPrice: number, maxPrice: number): Promise<any[]> {
  const url = `https://api.rainforestapi.com/request?api_key=${rainforestApiKey}&type=search&amazon_domain=amazon.fr&search_term=${encodeURIComponent(query)}`;
  const res = await withTimeoutFetch(url, {}, 10000);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("Rainforest HTTP error", res.status, txt);
    return [];
  }
  const data = await res.json();
  if (data.request_info?.success === false) {
    console.error("Rainforest API error:", data.request_info?.message);
    return [];
  }
  const products = (data.search_results || [])
    .filter((it: any) => it.asin || extractAsinFromUrl(it.link))
    .map(normalizeRainforestItem)
    .filter((p: any) => (p.link?.includes("/dp/")) || isValidAsin(p.asin))
    .filter((p: any) => !p.price || (p.price >= minPrice && p.price <= maxPrice))
    .slice(0, 8);

  return products;
}

async function searchAmazonProducts(query: string, serpApiKey: string | undefined, minPrice: number, maxPrice: number, rainforestApiKey?: string) {
  let out: any[] = [];
  if (serpApiKey) {
    try {
      out = await searchAmazonProductsSerpApi(query, serpApiKey, minPrice, maxPrice);
      if (out.length) return out;
    } catch (e) {
      console.error("SerpAPI exception:", e);
    }
  }
  if (rainforestApiKey) {
    try {
      out = await searchAmazonProductsRainforest(query, rainforestApiKey, minPrice, maxPrice);
    } catch (e) {
      console.error("Rainforest exception:", e);
    }
  }
  return out;
}

/* =========================
   POOL DIVERSIFICATION
========================= */
function diversifyProducts(products: any[], maxProducts: number) {
  const unique = products.filter((p, i, self) => i === self.findIndex((q) => q.asin === p.asin));
  unique.sort((a, b) => {
    const sA = (a.rating || 3) * (a.reviewCount || 1);
    const sB = (b.rating || 3) * (b.reviewCount || 1);
    return sB - sA;
  });
  return unique.slice(0, maxProducts);
}

/* =========================
   EDGE FUNCTION (Updated)
========================= */
Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method === "GET") return jsonResponse({ ok: true, timestamp: new Date().toISOString() });

    if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

    const raw = await req.text();
    if (!raw) return jsonResponse({ success: false, error: "Empty body" }, 400);

    const body = JSON.parse(raw);
    const { personId, eventType, budget } = body || {};
    if (!personId || typeof eventType !== "string" || typeof budget !== "number") {
      return jsonResponse({ success: false, error: "Missing or invalid parameters" }, 400);
    }

    // ENV
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    const serpApiKey = Deno.env.get("SERPAPI_API_KEY");
    const rainforestApiKey = Deno.env.get("RAINFOREST_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!openAIKey) return jsonResponse({ success: false, error: "OPENAI_API_KEY manquante" }, 500);
    if (!supabaseUrl || !supabaseAnon || !supabaseService) return jsonResponse({ success: false, error: "Config Supabase incomplète" }, 500);

    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Authentication requise" }, 401);

    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return jsonResponse({ success: false, error: "Authentication échouée" }, 401);

    // Service client (RLS bypass)
    const supabase = createClient(supabaseUrl, supabaseService, { auth: { persistSession: false } });

    // Usage limits (si tu as la RPC)
    const { data: usageResult, error: usageError } = await supabase.rpc("check_and_increment_ai_usage", { p_user_id: user.id });
    if (usageError) return jsonResponse({ success: false, error: "Erreur limites d'utilisation" }, 500);
    if (!usageResult.allowed) {
      return jsonResponse({
        success: false,
        error: "Limite quotidienne dépassée",
        details: { limit: usageResult.limit, remaining: usageResult.remaining, resetTime: usageResult.reset_time },
      }, 429);
    }

    // Person
    const { data: personData, error: personError } = await supabase.from("persons").select("*").eq("id", personId).maybeSingle();
    if (personError) return jsonResponse({ success: false, error: "DB error", details: personError.message }, 500);
    if (!personData) return jsonResponse({ success: false, error: "Person not found" }, 404);

    // Budget window (plus large)
    const maxBudget = budget;
    const minBudget = Math.max(5, Math.round(budget * 0.3));

    // Queries
    const queries = generateTargetedSearchQueries(personData, eventType, budget);

    // Recherche parallèle limitée
    const availableProducts: any[] = [];
    if (serpApiKey || rainforestApiKey) {
      const start = Date.now();
      const MAX_WALL_MS = 14000;
      const tasks = queries.map((q) => async () => {
        if (Date.now() - start > MAX_WALL_MS) return [];
        try {
          const r = await searchAmazonProducts(q, serpApiKey, minBudget, maxBudget, rainforestApiKey);
          return r.slice(0, 4);
        } catch { return []; }
      });

      async function runLimited(funcs: Array<() => Promise<any[]>>, limit = 2) {
        const out: any[] = [];
        let i = 0;
        const runners = Array.from({ length: Math.min(limit, funcs.length) }, async function run() {
          while (i < funcs.length && Date.now() - start < MAX_WALL_MS) {
            const idx = i++;
            const res = await funcs[idx]();
            out.push(...res);
          }
        });
        await Promise.allSettled(runners);
        return out;
      }

      const all = await runLimited(tasks, 2);
      availableProducts.push(...all);
    }

    // Normalisation post
    const normalized = availableProducts.map((p) => {
      const asin = toAsin(p.asin);
      let link = p.link || "";
      if (isValidAsin(asin) && (!link || !link.includes("/dp/"))) {
        link = `https://www.amazon.fr/dp/${asin}`;
      }
      return { ...p, asin, link: withAffiliate(link) };
    });

    const sanitized = normalized.filter((p) => (p.link && p.link.includes("/dp/")) || isValidAsin(p.asin));
    const selectedProducts = diversifyProducts(sanitized, 6);

    // Fallback si 0
    if (!selectedProducts.length) {
      const searchUrl = withAffiliate(`https://www.amazon.fr/s?k=${encodeURIComponent("cadeau pratique")}&rh=p_36%3A${Math.round(budget * 0.3)}00-${budget}00`);
      return jsonResponse({
        success: true,
        suggestions: [{
          title: "Idée cadeau (recherche Amazon)",
          description: "Recherche optimisée sur Amazon selon profil et budget.",
          estimatedPrice: Math.round(budget * 0.7),
          confidence: 0.5,
          reasoning: "APIs de recherche n'ont pas renvoyé de produits exploitables dans la fenêtre de prix.",
          category: "Fallback",
          alternatives: ["Recherche similaire"],
          purchaseLinks: [searchUrl],
          priceInfo: { displayPrice: Math.round(budget * 0.7), source: "fallback" },
          amazonData: { asin: null, productUrl: searchUrl, searchUrl, matchType: "smart_search" },
        }],
        personName: personData.name,
        eventType,
        budget,
        budgetRespected: true,
      });
    }

    // IA: choisir 3 produits dans le pool
    const personalNotes = personData.notes || "";
    const contextInfo = personalNotes
      ? `Notes: "${personalNotes}"`
      : `Âge: ${personData.age_years || "?"} | Intérêts: ${(personData.interests || []).slice(0, 3).join(", ") || "N/A"} | Relation: ${personData.relationship || "N/A"}`;

    const prompt = `Sélectionne 3 produits pour ${personData.name}.
${contextInfo}
Événement: ${eventType}, Budget: ${minBudget}-${maxBudget}€
PRODUITS DISPONIBLES:
${selectedProducts.map((p, i) => `${i + 1}. ${p.title.substring(0, 60)} - ${p.price ?? "?"}€ (ASIN: ${p.asin})`).join("\n")}
IMPORTANT: Choisis UNIQUEMENT parmi les produits ci-dessus. Renvoie un JSON strict (champ "suggestions").`;

    const openAIRes = await withTimeoutFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAIKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Tu renvoies uniquement un JSON valide: {"suggestions":[{ "title":"...", "price":0, "asin":"<ASIN de la liste>", "confidence":0.0, "reasoning":"..." }, ...3]}. N'invente aucun ASIN.` },
          { role: "user", content: prompt },
        ],
        max_tokens: 900,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    }, 10000);

    if (!openAIRes.ok) {
      const err = await openAIRes.text().catch(() => "");
      console.error("OpenAI error:", openAIRes.status, err);
      // Reprend 3 meilleurs du pool si IA en échec
      const fallbackPick = selectedProducts.slice(0, 3).map((p) => ({
        title: p.title, asin: p.asin, price: Math.round(p.price || budget * 0.7), confidence: 0.7, reasoning: "Top du pool",
      }));
      const suggestions = await buildFinalSuggestions(fallbackPick, selectedProducts, personData);
      return jsonResponse({ success: true, suggestions, personName: personData.name, eventType, budget, budgetRespected: true });
    }

    const aiData = await openAIRes.json();
    let content = aiData.choices?.[0]?.message?.content?.trim() || "";
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch (e) {
      console.error("JSON parse error:", e, content);
      // idem fallback
      const fallbackPick = selectedProducts.slice(0, 3).map((p) => ({
        title: p.title, asin: p.asin, price: Math.round(p.price || budget * 0.7), confidence: 0.7, reasoning: "Top du pool",
      }));
      const suggestions = await buildFinalSuggestions(fallbackPick, selectedProducts, personData);
      return jsonResponse({ success: true, suggestions, personName: personData.name, eventType, budget, budgetRespected: true });
    }

    const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : Array.isArray(parsed?.selections) ? parsed.selections : [];
    const allowedAsins = new Set(selectedProducts.map((p) => toAsin(p.asin)));
    const direct = rawSuggestions.map((r: any) => ({
      title: r.title ?? r.selectedTitle ?? "",
      asin: toAsin(r.asin ?? r.selectedAsin ?? ""),
      price: r.price ?? r.selectedPrice ?? 0,
      confidence: r.confidence ?? 0.5,
      reasoning: r.reasoning ?? "",
    }));

    const used = new Set<string>();
    const reconciled = direct.map((s: any) => {
      if (allowedAsins.has(s.asin) && !used.has(s.asin)) { used.add(s.asin); return s; }
      const match = bestPoolMatchByTitle(s.title, selectedProducts);
      if (match && !used.has(toAsin(match.asin))) {
        used.add(toAsin(match.asin));
        return { ...s, asin: toAsin(match.asin), title: match.title, price: match.price ?? s.price };
      }
      const fallback = selectedProducts.find((p) => !used.has(toAsin(p.asin)));
      if (fallback) {
        used.add(toAsin(fallback.asin));
        return { ...s, asin: toAsin(fallback.asin), title: fallback.title, price: fallback.price ?? s.price };
      }
      return null;
    }).filter(Boolean).slice(0, 3);

    const suggestions = await buildFinalSuggestions(reconciled, selectedProducts, personData);

    // filtre budget final
    const final = suggestions.filter((s: any) => s.estimatedPrice <= budget);
    if (!final.length) return jsonResponse({ success: false, error: "Aucune suggestion <= budget." }, 200);

    return jsonResponse({
      success: true,
      suggestions: final,
      personName: personData.name,
      eventType,
      budget,
      budgetRespected: true,
    });
  } catch (e: any) {
    console.error("Edge error:", e);
    return jsonResponse({ success: false, error: "Erreur serveur", details: e?.message }, 500);
  }
});

/* =========================
   BUILD FINAL SUGGESTIONS
========================= */
async function buildFinalSuggestions(reconciled: any[], pool: any[], personData: any) {
  const byAsin = new Map(pool.filter((p) => isValidAsin(p.asin)).map((p) => [toAsin(p.asin), p]));
  const out: any[] = [];
  for (const s of reconciled) {
    const { primary, search, isDirectLink } = await resolveAmazonLinksFromPool(s.asin, byAsin, s.title);
    out.push({
      title: s.title,
      description: generateDescription(s.title, s.reasoning, personData),
      estimatedPrice: Math.round(s.price || 0),
      confidence: s.confidence,
      reasoning: s.reasoning || `Produit sélectionné pour ${personData.name}.`,
      category: "Cadeau personnalisé",
      alternatives: [`Recherche précise: ${s.title}`],
      // 👉 Forcer dp quand ASIN valide
      purchaseLinks: [
        isValidAsin(s.asin) ? withAffiliate(`https://www.amazon.fr/dp/${toAsin(s.asin)}`) : primary,
      ],
      priceInfo: { displayPrice: Math.round(s.price || 0), source: "ai_estimate", amazonPrice: s.price || null },
      amazonData: {
        asin: s.asin,
        productUrl: isValidAsin(s.asin) ? withAffiliate(`https://www.amazon.fr/dp/${toAsin(s.asin)}`) : withAffiliate(primary),
        addToCartUrl: (partnerTagActive && isValidAsin(s.asin)) ? `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${toAsin(s.asin)}&Quantity.1=1&tag=${partnerTag}` : null,
        searchUrl: withAffiliate(search),
        matchType: isDirectLink ? "direct" : "search",
      },
    });
  }
  return out;
}

async function resolveAmazonLinksFromPool(asin: string, byAsin: Map<string, any>, title: string) {
  const p = byAsin.get(toAsin(asin));
  let base = p?.link && p.link.includes("/dp/") ? p.link : null;

  if (!base && isValidAsin(asin)) base = `https://www.amazon.fr/dp/${toAsin(asin)}`;

  if (VERIFY_DP && base) {
    const ok = await dpLooksValid(base);
    if (!ok) base = null;
  }

  const encodedTitle = encodeURIComponent(title.replace(/[^\w\s-]/g, " ").trim());
  const search = `https://www.amazon.fr/s?k=${encodedTitle}`;

  return {
    primary: base || (isValidAsin(asin) ? `https://www.amazon.fr/dp/${toAsin(asin)}` : search),
    search,
    isDirectLink: !!base || isValidAsin(asin),
  };
}

function generateDescription(title: string, reasoning: string, person: any) {
  if (reasoning && reasoning.length > 20) return reasoning;
  const t = title.toLowerCase();
  const name = person.name || "la personne";
  if (t.includes("tapis") && (t.includes("yoga") || t.includes("fitness"))) return `Un tapis d'exercice de qualité pour ${name}, idéal pour yoga/pilates à la maison.`;
  if (t.includes("écouteurs") || t.includes("casque")) return `Un équipement audio confortable pour ${name} et sa musique au quotidien.`;
  if (t.includes("cuisine") || t.includes("couteau")) return `Un ustensile de cuisine pratique pour ${name}, parfait pour préparer de bons plats.`;
  if (t.includes("bouteille") && t.includes("eau")) return `Une bouteille isotherme robuste pour ${name}, pratique pour le sport et les déplacements.`;
  return `Un produit sélectionné pour ${name}, utile et bien noté, adapté à ses goûts.`;
}