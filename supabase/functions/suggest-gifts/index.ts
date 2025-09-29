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

function toCompactQuery(raw: string) {
  const s = toSearchKeywords(raw);
  // garde 6-8 tokens alphanum les plus significatifs (évite les couleurs/tailles)
  const tokens = s.split(/\s+/).filter(t => t.length > 1 && /[a-z0-9]/i.test(t));
  return tokens.slice(0, 8).join(" ");
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

function extractAsinFromUrl(u?: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    const path = url.pathname || "";
    // 1) Patterns classiques / variés
    const m =
      path.match(/\/(?:dp|gp\/product|gp\/aw\/d|aw\/d|dp\/product|product-reviews|exec\/obidos\/ASIN)\/([A-Z0-9]{10})(?:[/?-]|$)/i) ||
      // certains liens ont des segments " -/dp/ASIN "
      path.match(/\/-\/dp\/([A-Z0-9]{10})(?:[/?-]|$)/i);
    if (m && isValidAsin(m[1])) return m[1].toUpperCase();

    // 2) Paramètre ?asin=XXXX
    const qAsin = url.searchParams.get("asin");
    if (qAsin && isValidAsin(qAsin)) return qAsin.toUpperCase();

    // 3) Dernière chance : décoder et extraire un token 10 chars maj alphanum dans le path
    const path2 = decodeURIComponent(path);
    const m2 = path2.match(/(?:^|[\/-])([A-Z0-9]{10})(?:[\/?_-]|$)/i);
    if (m2 && isValidAsin(m2[1])) return m2[1].toUpperCase();
  } catch {
    // ignore
  }
  return null;
}

function isAmazonSearchUrl(link?: string | null): boolean {
  if (!link) return false;
  try {
    const u = new URL(link);
    if (!/amazon\./i.test(u.hostname)) return false;
    return u.pathname.startsWith("/s") && (u.searchParams.has("k") || u.search.includes("k="));
  } catch {
    return false;
  }
}

/* =========================
   GPT GIFT GENERATION
========================= */
async function generateGiftIdeasWithGPT(personData: any, eventType: string, budget: number, openAIKey: string) {
  const personalInfo = personData.notes 
    ? `Notes: "${personData.notes}"`
    : `Âge: ${personData.age_years || "?"} | Sexe: ${personData.gender || "N/A"} | Intérêts: ${(personData.interests || []).join(", ") || "N/A"} | Relation: ${personData.relationship || "N/A"}`;

  // Au lieu d'utiliser des ASIN qui peuvent ne plus être valides,
  // nous utiliserons une approche de recherche Amazon pour générer des liens fiables

  const prompt = `Génère exactement 3 idées cadeaux parfaites pour ${personData.name}.

${personalInfo}
Événement: ${eventType}
Budget alloué: ${budget}€

INSTRUCTIONS CRITIQUES BUDGET:
- UTILISE INTELLIGEMMENT LE BUDGET: Si le budget est de 100€, propose des cadeaux entre 70-100€, pas 10-20€
- Varie les prix: 1 cadeau proche du budget max (80-100%), 1 cadeau milieu de gamme (60-80%), 1 cadeau accessible (40-60%)
- Pour un budget de 50€+, évite les cadeaux < 30€ sauf si très spécifiques aux intérêts
- Pour un budget de 100€+, évite les cadeaux < 50€ sauf si très spécifiques aux intérêts

INSTRUCTIONS PRODUITS:
- Génère 3 produits concrets avec marques et modèles réels (Nike, Adidas, Apple, Samsung, etc.)
- Varie les catégories selon ses intérêts : Sport, Tech, Lifestyle, Beauty, Home
- NE GÉNÈRE PAS D'ASIN - laisse le champ "asin" vide, il sera rempli automatiquement
- Focus sur des produits populaires et disponibles sur Amazon France
- Prends en compte le SEXE pour adapter les suggestions (parfums, vêtements, accessoires...)
- Utilise des mots-clés précis incluant marque + modèle pour les searchKeywords

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
   AVAILABILITY CHECK
========================= */
function checkAvailability(availabilityInfo: any): boolean {
  if (!availabilityInfo) return false;
  
  const availText = typeof availabilityInfo === 'string' ? availabilityInfo.toLowerCase() : 
                   availabilityInfo?.text?.toLowerCase() || '';
                   
  // Mots clés indiquant que le produit n'est pas disponible
  const unavailableKeywords = [
    'indisponible', 'rupture', 'stock', 'temporairement', 'currently unavailable',
    'out of stock', 'non disponible', 'épuisé', 'plus disponible'
  ];
  
  // Mots clés indiquant que le produit est disponible
  const availableKeywords = [
    'en stock', 'disponible', 'expédié', 'livraison', 'prime', 'available',
    'in stock', 'ships', 'delivery'
  ];
  
  // Si on trouve des mots-clés de non-disponibilité
  if (unavailableKeywords.some(keyword => availText.includes(keyword))) {
    return false;
  }
  
  // Si on trouve des mots-clés de disponibilité
  if (availableKeywords.some(keyword => availText.includes(keyword))) {
    return true;
  }
  
  // Par défaut, si on ne peut pas déterminer, on considère disponible
  // pour éviter de filtrer trop de produits
  return true;
}

/* =========================
   ADVANCED AVAILABILITY CHECK
========================= */
async function checkProductAvailability(asin: string, oxyUsername?: string, oxyPassword?: string): Promise<{ isAvailable: boolean, info: string }> {
  if (!asin || !isValidAsin(asin)) {
    return { isAvailable: false, info: 'ASIN invalide' };
  }

  // Vérifier la disponibilité via Oxylabs product details
  if (oxyUsername && oxyPassword) {
    try {
      const payload = {
        source: "amazon_product",
        domain: "fr",
        query: asin,
        parse: true
      };

      const response = await withTimeoutFetch("https://realtime.oxylabs.io/v1/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${btoa(`${oxyUsername}:${oxyPassword}`)}`
        },
        body: JSON.stringify(payload),
      }, 10000);

      if (response.ok) {
        const data = await response.json();
        const productInfo = data?.results?.[0]?.content;
        
        if (productInfo) {
          const availability = productInfo.availability || productInfo.stock_status;
          const isAvailable = checkAvailability(availability);
          const deliveryInfo = productInfo.delivery_info || {};
          
          return {
            isAvailable,
            info: isAvailable ? 
              `Disponible - ${deliveryInfo.text || 'Livraison standard'}` : 
              `Indisponible - ${availability?.text || 'Stock épuisé'}`
          };
        }
      }
    } catch (error) {
      console.log(`⚠️ Erreur vérification disponibilité ${asin}:`, error);
    }
  }

  // Fallback : considérer comme disponible si on ne peut pas vérifier
  return { isAvailable: true, info: 'Disponibilité non vérifiée' };
}

/* =========================
   SERPAPI SEARCH
========================= */
async function searchWithSerpApi(query: string, serpApiKey: string, minPrice?: number, maxPrice?: number) {
  const mkUrl = (q: string, withPrice: boolean) => {
    const base: Record<string, string> = {
      engine: "amazon",
      amazon_domain: "amazon.fr",
      gl: "fr",
      hl: "fr",
      k: q,
      api_key: serpApiKey,
    };
    if (withPrice && typeof minPrice === "number") base.low_price = String(minPrice);
    if (withPrice && typeof maxPrice === "number") base.high_price = String(maxPrice);
    return `https://serpapi.com/search.json?${new URLSearchParams(base)}`;
  };

  const run = async (q: string, withPrice: boolean) => {
    const url = mkUrl(q, withPrice);
    const res = await withTimeoutFetch(url, {}, 20000);
    if (!res.ok) return [];
    const data = await res.json();
    const all = [...(data.product_results || []), ...(data.organic_results || [])];
    const seen = new Set<string>();
    let products = all
      .map((item: any) => {
        const asin = extractAsinFromUrl(item.link) || toAsin(item.asin || item.asin_id || item.product_id);
        const rawPrice = String(item.price?.value ?? item.price ?? "0");
        return {
          title: item.title || "",
          asin,
          link: item.link || (isValidAsin(asin) ? `https://www.amazon.fr/dp/${asin}` : null),
          originalLink: item.link || null,
          price: parseFloat(rawPrice.replace(/[^\d.,]/g, "").replace(",", ".")) || null,
          rating: item.rating ?? null,
          reviewCount: item.reviews_count ?? null,
          imageUrl: item.thumbnail || item.image || null,
          availability: item.availability || item.stock_status || null,
          isAvailable: checkAvailability(item.availability || item.stock_status || item.delivery_info)
        };
      })
      .filter(p => p.title.length > 5 && (isValidAsin(p.asin) || (p.link && p.link.includes("amazon"))) && p.isAvailable)
      .filter(p => {
        if (p.asin && isValidAsin(p.asin)) {
          if (seen.has(p.asin)) return false;
          seen.add(p.asin);
        }
        return true;
      });

    // ASIN en premier, puis meilleure note / nb avis
    products.sort((a: any, b: any) => {
      const aa = isValidAsin(a.asin) ? 1 : 0, bb = isValidAsin(b.asin) ? 1 : 0;
      if (bb !== aa) return bb - aa;
      const ar = a.rating ?? 0, br = b.rating ?? 0;
      if (br !== ar) return br - ar;
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    });

    return products.slice(0, 5);
  };

  // PASS 1 : requête complète + bornes de prix
  let products = await run(query, true);

  // Si aucun ASIN, PASS 2 : requête compacte SANS prix
  if (!products.some(p => isValidAsin(p.asin))) {
    const compact = toCompactQuery(query);
    console.log(`↻ SerpApi PASS2 compact="${compact}"`);
    products = await run(compact, false);
  }

  return products;
}

/* =========================
   OXYLABS SEARCH
========================= */
async function searchWithOxylabs(query: string, oxyUsername: string, oxyPassword: string, minPrice?: number, maxPrice?: number) {
  const run = async (q: string, withPrice: boolean) => {
    const payload = {
      source: "amazon_search",
      domain: "fr",
      query: q,
      pages: 1,
      parse: true,
      ...(withPrice && typeof minPrice === "number" && { price_min: minPrice }),
      ...(withPrice && typeof maxPrice === "number" && { price_max: maxPrice })
    };

    const response = await withTimeoutFetch("https://realtime.oxylabs.io/v1/queries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(`${oxyUsername}:${oxyPassword}`)}`
      },
      body: JSON.stringify(payload),
    }, 25000);

    if (!response.ok) return [];
    
    const data = await response.json();
    const results = data?.results?.[0]?.content?.results?.organic || [];
    
    const seen = new Set<string>();
    let products = results
      .map((item: any) => {
        const asin = extractAsinFromUrl(item.url) || toAsin(item.asin);
        const rawPrice = String(item.price?.value ?? item.price ?? "0");
        return {
          title: item.title || "",
          asin,
          link: item.url || (isValidAsin(asin) ? `https://www.amazon.fr/dp/${asin}` : null),
          originalLink: item.url || null,
          price: parseFloat(rawPrice.replace(/[^\d.,]/g, "").replace(",", ".")) || null,
          rating: item.rating ?? null,
          reviewCount: item.reviews_count ?? null,
          imageUrl: item.image || null,
          availability: item.availability || item.stock_status || null,
          isAvailable: checkAvailability(item.availability || item.stock_status || item.delivery_info)
        };
      })
      .filter((p: any) => p.title && p.title.length > 5 && (isValidAsin(p.asin) || (p.link && p.link.includes("amazon"))) && p.isAvailable)
      .filter((p: any) => {
        if (p.asin && isValidAsin(p.asin)) {
          if (seen.has(p.asin)) return false;
          seen.add(p.asin);
        }
        return true;
      });

    // Priorité : ASIN valides d'abord, puis tri par rating et reviews
    products.sort((a: any, b: any) => {
      const aa = isValidAsin(a.asin) ? 1 : 0, bb = isValidAsin(b.asin) ? 1 : 0;
      if (bb !== aa) return bb - aa;
      const ar = a.rating ?? 0, br = b.rating ?? 0;
      if (br !== ar) return br - ar;
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    });

    const totalFound = products.length;
    const availableProducts = products.filter((p: any) => p.isAvailable);
    
    if (totalFound > availableProducts.length) {
      console.log(`📦 Filtrage disponibilité: ${totalFound} produits trouvés → ${availableProducts.length} disponibles`);
    }

    return availableProducts.slice(0, 5);
  };

  // PASS 1 : requête complète avec filtres de prix
  let products = await run(query, true);

  // Si aucun ASIN trouvé, PASS 2 : requête compacte sans filtres
  if (!products.some((p: any) => isValidAsin(p.asin))) {
    const compact = toCompactQuery(query);
    console.log(`↻ Oxylabs PASS2 compact="${compact}"`);
    products = await run(compact, false);
  }

  return products;
}

/* =========================
   ENHANCED PRODUCT SEARCH
========================= */
async function enrichWithAmazonData(gptSuggestions: any[], serpApiKey?: string, oxyUsername?: string, oxyPassword?: string) {
  console.log(`🔍 Enrichissement de ${gptSuggestions.length} suggestions GPT`);
  
  const enrichedSuggestions = [];
  
  for (const suggestion of gptSuggestions) {
    const searchKeywords = suggestion.searchKeywords || suggestion.title;
    const cleanKeywords = toSearchKeywords(searchKeywords);
    const amazonSearchUrl = `https://www.amazon.fr/s?k=${encodeURIComponent(cleanKeywords)}&ref=sr_st_relevancerank`;
    
    let enrichedSuggestion = {
      ...suggestion,
      amazonData: {
        searchUrl: amazonSearchUrl,
        productUrl: suggestion.amazonUrl || amazonSearchUrl,
        addToCartUrl: null,
        matchType: "search"
      }
    };
    
    // Essayer d'enrichir avec des données Amazon spécifiques
    if (serpApiKey || (oxyUsername && oxyPassword)) {
      const searchQuery = toSearchKeywords((suggestion.searchKeywords || suggestion.title)).toLowerCase();
      console.log(`🔍 Tentative d'enrichissement spécifique pour: "${searchQuery}"`);
      
      let foundProducts: any[] = [];
      
      // Gestion prix souples
      const est = Number.isFinite(suggestion.estimatedPrice) && suggestion.estimatedPrice > 0 ? suggestion.estimatedPrice : 30;
      const minP = Math.max(5, Math.floor(est * 0.4));
      const maxP = Math.max(minP + 10, Math.floor(est * 3.5));
      
      // Tentative avec SerpAPI d'abord (coût plus bas)
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
      
      // Fallback avec Oxylabs si pas de résultats SerpAPI
      if (foundProducts.length === 0 && oxyUsername && oxyPassword) {
        try {
          foundProducts = await searchWithOxylabs(searchQuery, oxyUsername, oxyPassword, minP, maxP);
          if (foundProducts.length > 0) {
            console.log(`✅ Produit spécifique trouvé via Oxylabs: ${foundProducts[0].title}`);
          }
        } catch (error) {
          console.log(`⚠️ Oxylabs non disponible pour: ${searchQuery}`);
        }
      }
      
      // Si on a trouvé des produits, utiliser le meilleur
      if (foundProducts.length > 0) {
        // Filtrer les URLs de recherche et prendre le premier produit avec ASIN si possible
        const validProducts = foundProducts.filter(p => !isAmazonSearchUrl(p.link || p.originalLink));
        const bestProduct = validProducts.find(p => isValidAsin(p.asin)) || validProducts[0];
        
        if (bestProduct) {
          // S'assurer que l'ASIN est extrait du lien si nécessaire
          if (!isValidAsin(bestProduct.asin)) {
            const linkAsin = extractAsinFromUrl(bestProduct.link || bestProduct.originalLink);
            if (linkAsin && isValidAsin(linkAsin)) {
              bestProduct.asin = linkAsin;
            }
          }
          
          console.log(`✅ Produit sélectionné: "${bestProduct.title}" - ASIN: ${bestProduct.asin || 'N/A'} - Disponible: ${bestProduct.isAvailable ? 'Oui' : 'Non'}`);
          
          // Ne traiter que les produits disponibles
          if (!bestProduct.isAvailable) {
            console.log(`⚠️ Produit "${bestProduct.title}" exclu car indisponible`);
            enrichedSuggestion = {
              ...suggestion,
              amazonData: {
                searchUrl: amazonSearchUrl,
                productUrl: suggestion.amazonUrl || amazonSearchUrl,
                addToCartUrl: null,
                matchType: "search",
                availability: "Indisponible",
                isAvailable: false
              }
            };
          } else {
            // Construire le lien direct vers le produit
            let productUrl = amazonSearchUrl;
            if (bestProduct.asin && isValidAsin(bestProduct.asin)) {
              productUrl = `https://www.amazon.fr/dp/${bestProduct.asin}`;
            } else if (bestProduct.originalLink || bestProduct.link) {
              productUrl = bestProduct.originalLink || bestProduct.link;
            }
            
            enrichedSuggestion = {
              ...suggestion,
              title: bestProduct.title,
              estimatedPrice: Math.round(bestProduct.price || suggestion.estimatedPrice),
              amazonData: {
                asin: bestProduct.asin,
                rating: bestProduct.rating,
                reviewCount: bestProduct.reviewCount,
                imageUrl: bestProduct.imageUrl,
                productUrl: withAffiliate(productUrl),
                searchUrl: amazonSearchUrl,
                availability: bestProduct.availability,
                isAvailable: bestProduct.isAvailable,
                addToCartUrl: bestProduct.asin && isValidAsin(bestProduct.asin) && partnerTagActive && partnerTag
                  ? `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${bestProduct.asin}&Quantity.1=1&tag=${partnerTag}`
                  : null,
                matchType: bestProduct.asin && isValidAsin(bestProduct.asin) ? "exact" : "api_link"
              }
            };
          }
        }
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
    const { personId, eventType, budget, additionalContext } = body || {};
    
    if (!personId || typeof eventType !== "string" || typeof budget !== "number") {
      return jsonResponse({ success: false, error: "Paramètres manquants ou invalides" }, 400);
    }

    console.log(`🎁 Génération d'idées cadeaux pour personne ${personId}, événement: ${eventType}, budget: ${budget}€`);

    // Variables d'environnement
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    const serpApiKey = Deno.env.get("SERPAPI_API_KEY");
    const oxyUsername = Deno.env.get("OXYLABS_USERNAME");
    const oxyPassword = Deno.env.get("OXYLABS_PASSWORD");
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
    let personData;
    
    if (personId === "onboarding-temp") {
      // Mode onboarding : extraire les données du contexte
      console.log("🔄 Mode onboarding détecté, parsing du contexte...");
      
      // Parse additionalContext: "Nom: Jean Baptiste, Relation: Partenaire, Sexe: Homme, Intérêts: Artisanat, Tech, Jardinage"
      const nameMatch = additionalContext?.match(/Nom:\s*([^,]+)/);
      const relationMatch = additionalContext?.match(/Relation:\s*([^,]+)/);
      const genderMatch = additionalContext?.match(/Sexe:\s*([^,]+)/);
      const interestsMatch = additionalContext?.match(/Intérêts:\s*(.+)/);
      
      const name = nameMatch?.[1]?.trim() || "Personne";
      const relationship = relationMatch?.[1]?.trim() || "Proche";
      const gender = genderMatch?.[1]?.trim() || "Non spécifié";
      const interestsText = interestsMatch?.[1]?.trim() || "";
      const interests = interestsText ? interestsText.split(",").map((i: string) => i.trim()) : [];
      
      personData = {
        id: "onboarding-temp",
        name,
        age_years: null,
        interests,
        notes: null,
        relationship,
        gender
      };
      
      console.log(`👤 Données onboarding: ${name}, relation: ${relationship}, sexe: ${gender}, intérêts: ${interests.join(", ")}`);
    } else {
      // Mode normal : chercher dans la base de données
      const { data: dbPersonData, error: personError } = await supabase
        .from("persons")
        .select("id, name, age_years, interests, notes, relationship")
        .eq("id", personId)
        .single();

      if (personError || !dbPersonData) {
        return jsonResponse({ success: false, error: "Personne non trouvée" }, 404);
      }
      
      personData = dbPersonData;
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
    const enrichedSuggestions = await enrichWithAmazonData(gptSuggestions, serpApiKey, oxyUsername, oxyPassword);

    // Filtrer les suggestions qui n'ont que des liens de recherche
    const validSuggestions = enrichedSuggestions.filter((suggestion: any) => {
      return suggestion.amazonData?.matchType !== "search" || 
             (suggestion.amazonData?.asin && isValidAsin(suggestion.amazonData.asin));
    });

    // Si aucune suggestion valide, générer des suggestions génériques avec des ASINs connus
    let finalSuggestions = [];
    
    if (validSuggestions.length === 0) {
      console.log("🔄 Aucun produit spécifique trouvé, génération de suggestions avec ASINs connus...");
      
      // Suggestions génériques avec des ASINs Amazon France populaires
      const fallbackSuggestions = [
        {
          title: "AirPods Apple (3ème génération)",
          description: "Écouteurs sans fil avec audio spatial et résistance à l'eau, parfaits pour la musique et les appels.",
          estimatedPrice: Math.min(budget, 199),
          reasoning: "Produit Apple populaire et apprécié pour sa qualité audio",
          amazonData: {
            asin: "B09JQM6427",
            productUrl: "https://www.amazon.fr/dp/B09JQM6427",
            searchUrl: "https://www.amazon.fr/s?k=airpods+apple",
            matchType: "exact",
            isAvailable: true
          }
        },
        {
          title: "Echo Dot (5ème génération)",
          description: "Enceinte connectée Amazon avec Alexa, design compact et son amélioré pour la maison intelligente.",
          estimatedPrice: Math.min(budget, 59),
          reasoning: "Assistant vocal populaire pour automatiser le quotidien",
          amazonData: {
            asin: "B09B8V1LZ3",
            productUrl: "https://www.amazon.fr/dp/B09B8V1LZ3", 
            searchUrl: "https://www.amazon.fr/s?k=echo+dot+alexa",
            matchType: "exact",
            isAvailable: true
          }
        },
        {
          title: "Kindle Paperwhite",
          description: "Liseuse numérique étanche avec écran haute résolution et éclairage intégré, parfaite pour lire partout.",
          estimatedPrice: Math.min(budget, 149),
          reasoning: "Idéal pour les amateurs de lecture avec une grande autonomie",
          amazonData: {
            asin: "B08KTZ8249",
            productUrl: "https://www.amazon.fr/dp/B08KTZ8249",
            searchUrl: "https://www.amazon.fr/s?k=kindle+paperwhite",
            matchType: "exact", 
            isAvailable: true
          }
        }
      ].filter(s => s.estimatedPrice <= budget);
      
      finalSuggestions = fallbackSuggestions.slice(0, 3);
    } else {
      finalSuggestions = validSuggestions;
    }

    // Formatage final des suggestions
    const formattedSuggestions = finalSuggestions.map((suggestion: any) => ({
      title: suggestion.title,
      description: suggestion.description,
      estimatedPrice: suggestion.estimatedPrice,
      confidence: 0.9,
      reasoning: suggestion.reasoning,
      category: "Produit Amazon",
      alternatives: [],
      purchaseLinks: [
        // Prioriser les vrais liens produits avec ASIN
        suggestion.amazonData?.asin && isValidAsin(suggestion.amazonData.asin)
          ? withAffiliate(`https://www.amazon.fr/dp/${suggestion.amazonData.asin}`)
          : withAffiliate(suggestion.amazonData?.productUrl || suggestion.amazonData?.searchUrl)
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