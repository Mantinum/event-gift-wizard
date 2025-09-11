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
  amazonData?: {
    asin?: string;
    rating?: number;
    reviewCount?: number;
    availability?: string;
    prime?: boolean;
    actualPrice?: number;
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

// Helper function to pick the best product from search results
const pickBestProduct = (products: any[], expectedTitle: string, targetBudget?: number) => {
  if (!products || products.length === 0) return null;
  
  const scored = products.map(product => {
    // Score based on title similarity (simple word matching)
    const titleWords = expectedTitle.toLowerCase().split(' ').filter(w => w.length > 2);
    const productTitle = (product.title || '').toLowerCase();
    const titleScore = titleWords.reduce((score, word) => {
      return score + (productTitle.includes(word) ? 1 : 0);
    }, 0) / Math.max(titleWords.length, 1);
    
    // Score based on budget proximity
    const price = product.price_current || product.price || 0;
    const budgetScore = targetBudget && price > 0 
      ? 1 / (1 + Math.abs(price - targetBudget) / targetBudget)
      : 0.5;
    
    // Score based on rating (if available)
    const ratingScore = product.rating ? Math.min(product.rating / 5, 1) : 0.5;
    
    const totalScore = 0.5 * titleScore + 0.3 * budgetScore + 0.2 * ratingScore;
    
    return { product, score: totalScore, titleScore, budgetScore, ratingScore };
  });
  
  scored.sort((a, b) => b.score - a.score);
  console.log(`🎯 Product scoring for "${expectedTitle}":`, scored.map(s => ({
    title: s.product.title,
    score: s.score.toFixed(3),
    titleScore: s.titleScore.toFixed(3),
    budgetScore: s.budgetScore.toFixed(3),
    ratingScore: s.ratingScore.toFixed(3),
    price: s.product.price_current || s.product.price
  })));
  
  return scored[0]?.product;
};

// Function to create Amazon links from ASIN
const createAmazonLinks = (asin: string, title: string): string[] => {
  if (!asin) return [];
  
  return [
    `https://www.amazon.fr/dp/${asin}`, // Direct product page
    `https://www.amazon.fr/gp/aws/cart/add.html?ASIN.1=${asin}&Quantity.1=1`, // Add to cart
    `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(title)}`, // Price comparison
  ];
};

// Canopy API integration functions
const enrichWithCanopyData = async (suggestions: GiftSuggestion[]): Promise<GiftSuggestion[]> => {
  const canopyApiKey = Deno.env.get('CANOPY_API_KEY');
  
  console.log('🔍 Starting Canopy enrichment...');
  console.log('📊 Number of suggestions to enrich:', suggestions.length);
  console.log('🔑 Canopy API key available:', !!canopyApiKey);
  
  if (!canopyApiKey) {
    console.log('❌ CANOPY_API_KEY not configured, skipping Amazon data enrichment');
    return suggestions;
  }

  console.log('🔄 Starting Canopy enrichment process...');

  const enrichedSuggestions = await Promise.all(
    suggestions.map(async (suggestion) => {
      try {
        console.log(`🔍 Searching Canopy for: "${suggestion.title}"`);
        
        // Search for the product on Amazon using Canopy API with more results
        const rawQuery = suggestion.title;
        const searchQuery = encodeURIComponent(rawQuery);

        // Try REST first
        const restUrl = `https://rest.canopyapi.co/api/amazon/search?searchTerm=${searchQuery}&domain=amazon.fr&limit=5`;
        console.log(`📡 Canopy REST request URL: ${restUrl}`);

        let results: any[] | undefined;
        try {
          const restRes = await fetch(restUrl, {
            method: 'GET',
            headers: { 'API-KEY': canopyApiKey },
          });
          console.log(`📊 Canopy REST status: ${restRes.status}`);
          if (restRes.ok) {
            const restJson = await restRes.json();
            results = restJson?.results;
            console.log(`✅ REST response received. Results count: ${results?.length || 0}`);
            if (results && results.length > 0) {
              console.log('🎯 First result preview:', {
                title: results[0]?.title?.substring(0, 50),
                asin: results[0]?.asin,
                price: results[0]?.price
              });
            }
          } else {
            const errText = await restRes.text();
            console.log('❌ REST error body:', errText);
          }
        } catch (e) {
          console.log('❌ REST call threw:', e);
        }

        // If REST did not return usable results, try GraphQL as a fallback
        if (!Array.isArray(results) || results.length === 0) {
          const gqlEndpoint = 'https://graphql.canopyapi.co/';
          const gqlQuery = `
            query Search($q: String!, $country: String!) {
              search(query: $q, country: $country, page: 1) {
                results {
                  asin
                  title
                  url
                  image
                  price { value currency }
                  rating { stars count }
                  badges
                  brand
                }
              }
            }
          `;
          console.log('🔄 Falling back to Canopy GraphQL search');
          try {
            const gqlRes = await fetch(gqlEndpoint, {
              method: 'POST',
              headers: {
                'API-KEY': canopyApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query: gqlQuery, variables: { q: rawQuery, country: 'FR' } }),
            });
            console.log(`📊 Canopy GraphQL status: ${gqlRes.status}`);
            if (gqlRes.ok) {
              const gqlJson = await gqlRes.json();
              const gqlResults = gqlJson?.data?.search?.results ?? [];
              // Normalize to the REST shape expected by our scoring function
              results = gqlResults.map((r: any) => ({
                asin: r.asin,
                title: r.title,
                price_current: r?.price?.value,
                price: r?.price?.value,
                rating: r?.rating?.stars,
                review_count: r?.rating?.count,
                image: r?.image,
                availability: Array.isArray(r?.badges) && r.badges.includes('In Stock') ? 'In Stock' : 'Unknown',
                is_prime: Array.isArray(r?.badges) && r.badges.includes('Prime'),
                brand: r?.brand,
              }));
            } else {
              const errText = await gqlRes.text();
              console.log('❌ GraphQL error body:', errText);
            }
          } catch (e) {
            console.log('❌ GraphQL call threw:', e);
          }
        }

        if (!Array.isArray(results) || results.length === 0) {
          console.log(`⚠️ No Amazon products found for "${suggestion.title}"`);
          return {
            ...suggestion,
            purchaseLinks: [
              `https://www.amazon.fr/s?k=${encodeURIComponent(suggestion.title)}&ref=nb_sb_noss`
            ]
          };
        }

        // Keep compatibility with the rest of the enrichment flow
        const searchData = { results };
        console.log(`✅ Canopy search response for "${suggestion.title}":`, {
          totalResults: results.length,
          firstResult: results?.[0]?.title
        });

        // Pick the best matching product using our scoring algorithm
        const bestProduct = pickBestProduct(searchData.results, suggestion.title, suggestion.estimatedPrice);
        
        if (!bestProduct || !bestProduct.asin) {
          console.log(`⚠️ No suitable product found for "${suggestion.title}" - no ASIN available`);
          return {
            ...suggestion,
            purchaseLinks: [
              `https://www.amazon.fr/s?k=${encodeURIComponent(suggestion.title)}&ref=nb_sb_noss`
            ]
          };
        }

        console.log(`🎯 Selected best product for "${suggestion.title}":`, {
          title: bestProduct.title,
          asin: bestProduct.asin,
          price: bestProduct.price_current || bestProduct.price,
          rating: bestProduct.rating
        });
        
        // Create proper Amazon links using ASIN
        const amazonLinks = createAmazonLinks(bestProduct.asin, suggestion.title);
        console.log(`🔗 Generated Amazon links for ASIN ${bestProduct.asin}:`, amazonLinks);
        
        return {
          ...suggestion,
          purchaseLinks: amazonLinks,
          amazonData: {
            asin: bestProduct.asin,
            rating: bestProduct.rating,
            reviewCount: bestProduct.review_count,
            availability: bestProduct.availability,
            prime: bestProduct.is_prime,
            actualPrice: bestProduct.price_current || bestProduct.price,
            imageUrl: bestProduct.image || bestProduct.image_url,
          }
        };
        
      } catch (error) {
        console.error(`❌ Error enriching suggestion "${suggestion.title}" with Canopy data:`, error);
        return {
          ...suggestion,
          purchaseLinks: [
            `https://www.amazon.fr/s?k=${encodeURIComponent(suggestion.title)}&ref=nb_sb_noss`
          ]
        };
      }
    })
  );

  return enrichedSuggestions;
};

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
          "title": "Nom produit précis (marque/modèle si applicable)",
          "description": "Description concise et convaincante",
          "estimatedPrice": 0,
          "confidence": 0,
          "reasoning": "Pourquoi ce produit correspond au profil et au budget",
          "category": "Catégorie autorisée",
          "alternatives": ["Variante 1", "Variante 2"],
          "purchaseLinks": [
            "https://...", // Lien d'achat FR ou Google Shopping
            "https://..."
          ]
        },
        { ... },
        { ... }
      ]
    }`;


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

    // Helper: deterministic fallback when OpenAI is unavailable (quota/key/errors)
    const createFallbackSuggestions = (): GiftSuggestion[] => {
      // 85% à 100% du budget
      const minTarget = Math.min(budget, Math.max(10, Math.round(budget * 0.85)));
      const targets = [minTarget, Math.round((minTarget + budget) / 2), budget];

      // Templates adaptés à l'âge
      const BABY_TEMPLATES: Record<string, Array<{ title: string; description: string }>> = {
        'Enfance': [
          { title: 'Jouet d\'éveil en bois', description: 'Stimule la motricité et les sens' },
          { title: 'Livre en tissu interactif', description: 'Textures variées pour l\'exploration tactile' },
        ],
        'Bébé': [
          { title: 'Mobile musical en bois', description: 'Berceuses apaisantes et formes douces' },
          { title: 'Anneau de dentition en silicone', description: 'Soulage les poussées dentaires' },
        ],
        'Jeux': [
          { title: 'Tapis d\'éveil coloré', description: 'Arches avec jouets suspendus pour stimuler bébé' },
          { title: 'Cubes empilables souples', description: 'Développement de la coordination' },
        ],
      };

      const ADULT_TEMPLATES: Record<string, Array<{ title: string; description: string }>> = {
        'Beauté': [
          { title: 'Lisseur ghd Gold', description: 'Lisseur professionnel à température contrôlée' },
          { title: 'Coffret soins visage Clarins', description: 'Routine complète hydratation et éclat' },
        ],
        'Bien-être': [
          { title: 'Coffret spa Rituals The Ritual of Sakura', description: 'Gommage, gel douche, crème et bougie' },
          { title: 'Masseur cervical Shiatsu Homedics', description: 'Relaxation à domicile, chaleur apaisante' },
        ],
        'Cosmétiques': [
          { title: 'Coffret maquillage Sephora Favorites', description: 'Sélection best-sellers format découverte' },
          { title: 'Palette yeux Anastasia Beverly Hills Soft Glam', description: 'Teintes neutres et pigmentées' },
        ],
        'Parfum': [
          { title: 'Coffret parfum découverte Sephora', description: 'Sélection de miniatures mixte' },
          { title: 'Yves Saint Laurent Libre Eau de Parfum 50ml', description: 'Floral moderne, long tenue' },
        ],
        'Décoration': [
          { title: 'Lampe de table Fatboy Edison the Medium', description: 'Ambiance chaleureuse, design iconique' },
          { title: 'Plaid en laine mérinos Hugo Boss Home', description: 'Confort haut de gamme pour le salon' },
        ],
        'Maison': [
          { title: 'Diffuseur d’arômes en céramique Stone', description: 'Design minimal, relaxation à la maison' },
          { title: 'Vase design Bloomingville', description: 'Céramique texturée, pièce décorative' },
        ],
        'Mode': [
          { title: 'Écharpe en cachemire', description: 'Accessoire intemporel, ultra-doux' },
          { title: 'Portefeuille en cuir Fossil', description: 'Maroquinerie élégante et durable' },
        ],
        'Accessoires': [
          { title: 'Ceinture en cuir Levi’s', description: 'Boucle métal, finition premium' },
          { title: 'Lunettes de soleil Ray-Ban Wayfarer', description: 'Icône de style, verres UV' },
        ],
        'Maroquinerie': [
          { title: 'Sac bandoulière en cuir Lancaster', description: 'Compact, chic, quotidien' },
          { title: 'Porte-cartes en cuir Tommy Hilfiger', description: 'Profil fin, compartiments essentiels' },
        ],
        'Vêtements': [
          { title: 'Chemise en lin premium', description: 'Respirante, coupe moderne' },
          { title: 'Sweat zippé Nike Tech Fleece', description: 'Confort et style décontracté' },
        ],
        'Bijoux': [
          { title: 'Bracelet Swarovski Subtle', description: 'Cristaux scintillants, plaqué rhodium' },
          { title: 'Collier en argent 925 avec pendentif', description: 'Minimaliste et élégant' },
        ],
        'Joaillerie': [
          { title: 'Bague en argent avec oxydes', description: 'Finition brillante, intemporelle' },
          { title: 'Boucles d’oreilles perles Majorica', description: 'Classiques revisitées' },
        ],
        'Montres': [
          { title: 'Montre Casio Edifice', description: 'Acier inoxydable, style urbain' },
          { title: 'Montre Fossil Minimalist', description: 'Cuir véritable, cadran épuré' },
        ],
      };

      // Choisir les templates appropriés selon l'âge
      const isChild = personContext.age <= 12;
      const TEMPLATES = isChild ? BABY_TEMPLATES : ADULT_TEMPLATES;

      const allowedPrimary = allowedCategories.filter((c) => TEMPLATES[c]);
      const fallbackOrder = isChild 
        ? ['Enfance', 'Bébé', 'Jeux', 'Mode', 'Décoration'] 
        : ['Mode', 'Bijoux', 'Décoration', 'Beauté', 'Bien-être', 'Parfum', 'Cosmétiques', 'Maroquinerie', 'Accessoires', 'Montres'];
      
      const pickCats: string[] = [];
      for (const c of allowedPrimary) { if (pickCats.length < 3) pickCats.push(c); }
      for (const c of fallbackOrder) { if (pickCats.length < 3 && !pickCats.includes(c) && TEMPLATES[c]) pickCats.push(c); }

      const seed = Date.now();
      return pickCats.map((cat, i) => {
        const options = TEMPLATES[cat];
        const p = options[(seed + i) % options.length];
        return {
          title: p.title,
          description: p.description,
          estimatedPrice: targets[Math.min(i, targets.length - 1)],
          confidence: 0.85,
          reasoning: `Suggestion fallback adaptée à l'âge (${personContext.age} ans) et aux intérêts (${cat}) - Budget: ${minTarget}€ - ${budget}€`,
          category: cat,
          alternatives: ['Variante de la même gamme', 'Modèle précédent pour ajuster le prix'],
          purchaseLinks: [p.title, `${p.title} ${cat}`],
        };
      });
    };

    console.log('Calling OpenRouter API for gift suggestions...');

    let suggestions: GiftSuggestion[] | null = null;

    if (!openrouterApiKey) {
      console.warn('OPENROUTER_API_KEY non configuree. Utilisation du fallback local.');
      suggestions = createFallbackSuggestions();
    } else {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://uurlvbvsewzshbppcfrl.supabase.co',
            'X-Title': 'Gift Suggestions App',
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 900,
            temperature: 0.3,
            top_p: 0.8,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('OpenRouter API error:', errorData);
          suggestions = createFallbackSuggestions();
        } else {
          const data = await response.json();
          const aiResponse = data.choices?.[0]?.message?.content ?? '';
          console.log('OpenRouter response:', aiResponse);

          try {
            const parsed = JSON.parse(aiResponse);
            suggestions = parsed.suggestions;
          } catch (parseError) {
            console.error('Failed to parse AI response, using fallback:', parseError);
            suggestions = createFallbackSuggestions();
          }
        }
      } catch (e) {
        console.error('Erreur d\'appel OpenRouter, utilisation du fallback:', e);
        suggestions = createFallbackSuggestions();
      }
    }

    // Validate and enforce budget with 85%-100% range
    const enforceBudget = (suggs: GiftSuggestion[] | null | undefined, max: number): GiftSuggestion[] => {
      const min = Math.min(max, Math.max(10, Math.round(max * 0.85)));
      const safe = Array.isArray(suggs) ? suggs : [];
      return safe
        .map((s) => {
          let price = typeof s.estimatedPrice === 'number' && isFinite(s.estimatedPrice)
            ? Math.round(s.estimatedPrice)
            : min;
          price = Math.min(max, Math.max(min, price));
          return { ...s, estimatedPrice: price };
        })
        .filter((s) => s.estimatedPrice <= max);
    };

    const filterAndAdjustCategories = (arr: GiftSuggestion[] | null | undefined): GiftSuggestion[] => {
      const safe = Array.isArray(arr) ? arr : [];
      const allowedNorm = new Set(allowedCategories.map((c) => normalize(c)));
      const mapped = safe.map((s) => {
        const catNorm = normalize(s.category);
        if (allowedNorm.has(catNorm)) return s;
        const fallbackCat = allowedCategories[0] || s.category;
        return { ...s, category: fallbackCat, reasoning: `${s.reasoning} • Catégorie réajustée pour correspondre aux centres d’intérêt (${fallbackCat}).` };
      });
      return mapped.filter((s) => allowedNorm.has(normalize(s.category)));
    };

    const normalizePurchaseLinks = (arr: GiftSuggestion[] | null | undefined): GiftSuggestion[] => {
      const safe = Array.isArray(arr) ? arr : [];
      const toUrls = (query: string): string[] => [
        `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`,
        `https://www.amazon.fr/s?k=${encodeURIComponent(query)}`,
        `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(query)}`,
      ];
      return safe.map((s) => {
        const raw = Array.isArray(s.purchaseLinks) ? s.purchaseLinks.filter(Boolean) : [];
        const baseQuery = raw[0] || `${s.title} ${s.category}`;
        const urlCandidates = [
          ...raw.filter((x) => typeof x === 'string' && x.startsWith('http')).slice(0, 3),
          ...toUrls(baseQuery)
        ];
        const unique = Array.from(new Set(urlCandidates)).slice(0, 3);
        return { ...s, purchaseLinks: unique };
      });
    };

    suggestions = enforceBudget(suggestions, budget);
    suggestions = filterAndAdjustCategories(suggestions);
    suggestions = normalizePurchaseLinks(suggestions);
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestions = normalizePurchaseLinks(createFallbackSuggestions());
    }

// Enrich suggestions with real Amazon data via Canopy API
    console.log('🔄 About to enrich suggestions with Canopy Amazon data...');
    console.log('📋 Suggestions before enrichment:', suggestions.length);
    console.log('🔑 CANOPY_API_KEY env var check:', !!Deno.env.get('CANOPY_API_KEY'));
    suggestions = await enrichWithCanopyData(suggestions);
    console.log('✅ Canopy enrichment completed. Suggestions after enrichment:', suggestions.length);

    // Store suggestions in database for future reference
    const purchaseRecords = suggestions.map(suggestion => ({
      user_id: person.user_id,
      person_id: personId,
      person_name: person.name,
      event_title: `${eventType} - ${person.name}`,
      event_id: null, // Will be linked when event is created
      days_until: calculateDaysUntilNextEvent(eventType, person.birthday),
      budget: suggestion.estimatedPrice,
      suggested_gift: suggestion.title,
      confidence: suggestion.confidence,
      status: 'pending' as const,
      alternative_gifts: suggestion.alternatives,
      ai_reasoning: suggestion.reasoning
    }));

    const { error: insertError } = await supabase
      .from('upcoming_purchases')
      .insert(purchaseRecords);

    if (insertError) {
      console.error('Error storing suggestions:', insertError);
      // Don't throw - we still want to return the suggestions
    }

    return new Response(JSON.stringify({ 
      success: true, 
      suggestions,
      personName: person.name,
      allowedCategories
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-gifts function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Une erreur est survenue lors de la generation des suggestions' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateAge(birthday: string): number {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function calculateDaysUntilNextEvent(eventType: string, birthday: string): number {
  if (eventType === 'birthday') {
    const today = new Date();
    const birthDate = new Date(birthday);
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = thisYearBirthday.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  return 30; // Default for other event types
}