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

async function searchAmazonProducts(query: string, serpApiKey: string, minPrice: number, maxPrice: number) {
  const params = new URLSearchParams({
    engine: 'amazon',
    amazon_domain: 'amazon.fr',
    language: 'fr_FR',
    k: query,
    low_price: minPrice.toString(),
    high_price: maxPrice.toString(),
    api_key: serpApiKey,
  });
  
  try {
    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!response.ok) return [];
    
    const data = await response.json();
    const results = data.organic_results || [];
    
      const products = results
        .filter((item: any) => {
          if (!item.asin) return false;
          // Garder l'item si pas de prix (on l'utilisera sans contraindre le budget sur SerpApi)
          if (!item.price) return true;
          const price = parseFloat(String(item.price).replace(/[^\d,]/g, '').replace(',', '.'));
          return Number.isFinite(price) ? (price >= minPrice && price <= maxPrice) : true;
        })
      .map((item: any) => {
        console.log('🔍 Description produit brute:', {
          title: item.title,
          snippet: item.snippet,
          description: item.description
        });
        
        return {
          title: item.title,
          price: parseFloat(String(item.price || '0').replace(/[^\d,]/g, '').replace(',', '.')),
          asin: item.asin,
          rating: item.rating,
          reviewCount: item.reviews_count,
          imageUrl: item.thumbnail,
          link: item.link,
          snippet: item.snippet,
          description: item.description,
          displayDescription: item.snippet || item.description || null // Récupérer la vraie description Amazon
        };
      })
      .slice(0, 5); // Max 5 produits par requête
      
    console.log(`✅ ${products.length} produits trouvés pour "${query}"`);
    console.log('🔍 Exemple de produit récupéré:', products[0] ? {
      title: products[0].title,
      displayDescription: products[0].displayDescription,
      snippet: products[0].snippet,
      description: products[0].description
    } : 'Aucun produit');
    return products;
  } catch (error) {
    console.error('Erreur recherche SerpApi:', error);
    return [];
  }
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('🔑 Environment check:');
    console.log('- OpenAI Key available:', !!openAIKey);
    console.log('- SerpApi Key available:', !!serpApiKey);
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

    if (!serpApiKey) {
      console.log('❌ Missing SerpApi API key');
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration manquante: clé SerpApi non configurée'
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
    
    if (serpApiKey) {
      for (const query of searchQueries.slice(0, 6)) { // Limiter à 6 requêtes max
        try {
          console.log(`🔍 Recherche Amazon: "${query}" (${minBudget}€-${maxBudget}€)`);
          const results = await searchAmazonProducts(query, serpApiKey, minBudget, maxBudget);
          
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
    console.warn('⚠️ Aucun produit SerpApi : on fera des liens de recherche Amazon taggés');
  }
    
    // Build enhanced context with personal notes priority
    const personalNotes = personData.notes || '';
    const contextInfo = personalNotes 
      ? `Notes personnelles: "${personalNotes}"`
      : `Âge: ${personData.age_years || '?'} ans, Intérêts: ${personData.interests?.slice(0,3).join(', ') || 'N/A'}, Relation: ${personData.relationship || 'N/A'}`;

    const prompt = `Sélectionne 3 produits pour ${personData.name}.
${contextInfo}
Événement: ${eventType}, Budget: ${minBudget}-${maxBudget}€

PRODUITS DISPONIBLES:
${selectedProducts.map((p, i) => `${i+1}. ${p.title.substring(0, 50)} - ${p.price}€ (${p.asin})`).join('\n')}

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

    // --- 1) Appel Chat Completions (non GPT-5) ---
    async function callChatCompletions(model: string, maxTokens = 1200, userPrompt = prompt) {
      return fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openAIKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: `Sélectionne 3 produits parmi la liste. Sois concis. Réponds UNIQUEMENT avec un JSON valide sans texte supplémentaire. Retourne exactement {"selections":[{ "selectedTitle": "...", "selectedPrice": 0, "selectedAsin": "...", "confidence": 0.0 }, ...3 au total]}. ${promptVariation}` },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });
    }

    // --- 2) Appel Responses API (GPT-5) ---
    async function callResponses(model: string, maxOut = 1200, userPrompt = prompt) {
      // On fusionne system + user en un seul "input" pour Responses API
      const systemLine =
        `Sélectionne 3 produits parmi la liste. Sois concis. ` +
        `Réponds UNIQUEMENT avec un JSON valide sans texte supplémentaire. ` +
        `Retourne exactement {"selections":[{ "selectedTitle": "...", "selectedPrice": 0, "selectedAsin": "...", "confidence": 0.0 }, ...3 au total]}. ${promptVariation}\n\n`;
      return fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openAIKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: `${systemLine}${userPrompt}`,
          max_output_tokens: maxOut
          // ⚠️ PAS de response_format ici - non supporté par Responses API
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

      // Fallback auto si le modèle n'est pas accessible
      if (openAIResponse.status === 404 || type === 'model_not_found' || /model .* not found/i.test(msg)) {
        console.warn('↩️ Fallback automatique vers gpt-4o-mini');
        modelUsed = 'gpt-4o-mini';
        openAIResponse = await callChatCompletions(modelUsed, 1200);
        if (!openAIResponse.ok) {
          const err2 = await openAIResponse.text();
          console.error('❌ Fallback gpt-4o-mini a aussi échoué:', openAIResponse.status, err2);
          return new Response(JSON.stringify({
            success: false,
            error: 'OpenAI error',
            status: openAIResponse.status,
            details: err2
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else if (openAIResponse.status === 400 && /context_length|maximum context length|too long/i.test(msg)) {
        console.warn('⚠️ Contexte trop long → on compresse le prompt et on retente');
        // 1) Réduire le bloc PRODUITS
        const shorterProducts = selectedProducts.slice(0, 3);
        const promptShort = `Sélectionne 3 produits pour ${personData.name}.
${contextInfo}
Événement: ${eventType}, Budget: ${minBudget}-${maxBudget}€
PRODUITS:
${shorterProducts.map((p, i) => `${i+1}. ${p.title.substring(0, 40)} (${p.asin})`).join('\n')}
JSON: {"selections":[{ "selectedTitle": "...", "selectedPrice": 0, "selectedAsin": "...", "confidence": 0.0 }, ...3]}`;
        // 2) Re-appel (même modèle & bon endpoint)
        if (modelUsed.startsWith('gpt-5')) {
          openAIResponse = await callResponses(modelUsed, 900, promptShort);
        } else {
          openAIResponse = await callChatCompletions(modelUsed, 900, promptShort);
        }
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
      
      // DEBUG: Log de la structure complète pour GPT-5
      if (modelUsed.startsWith('gpt-5')) {
        console.log('🔍 GPT-5 Response structure:', JSON.stringify(openAIData, null, 2));
      }

      // Check if response was truncated due to token limit
      const finishReason = openAIData.finish_reason || openAIData.choices?.[0]?.finish_reason;
      if (finishReason === 'length') {
        console.warn('⚠️ Troncature → retry avec budget de tokens ↑');
        const retry = await callChatCompletions(modelUsed, 1600, prompt);
        if (retry.ok) {
          const rj = await retry.json();
          openAIData.choices = rj.choices;
        }
      }
      
      // Extraction du contenu - uniquement Chat Completions format
      const aiContent = openAIData.choices?.[0]?.message?.content ?? '';
      console.log('🧠 AI content length:', aiContent.length);
      console.log('📝 AI content preview:', aiContent.substring(0, 200));
      
      
      if (!aiContent || aiContent.trim().length === 0) {
        console.error('❌ Empty AI response content');
        return new Response(JSON.stringify({
          success: false,
          error: 'Réponse AI vide',
          details: 'Aucun contenu généré par l\'IA'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // With Structured Outputs, parsing should always succeed
      const parsedResponse = JSON.parse(aiContent);
      const selections = Array.isArray(parsedResponse.selections) ? parsedResponse.selections : [];
      console.log('🎯 Parsed selections count:', selections.length);
      
      // Validate that we have exactly 3 selections as per schema
      if (selections.length !== 3) {
        console.error('❌ Invalid number of selections:', selections.length);
        return new Response(JSON.stringify({
          success: false,
          error: 'Nombre de sélections incorrect',
          details: `Attendu: 3, reçu: ${selections.length}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Convert selections to suggestions format for compatibility
      suggestions = selections.map((selection: any) => {
        // Cherche dans le PETIT set montré à l'IA
        const selectedProduct = selectedProducts.find(p => p.asin === selection.selectedAsin);
        
        console.log('🔍 Debug produit sélectionné:', {
          asinRecherche: selection.selectedAsin,
          produitTrouve: !!selectedProduct,
          displayDescription: selectedProduct?.displayDescription,
          snippet: selectedProduct?.snippet,
          description: selectedProduct?.description
        });
        
        // Generate a contextual description based on product title and person profile
        const generateDescription = (title: string, person: any, eventType: string, productData?: any) => {
          console.log('🔍 Génération description:', { 
            title, 
            productData: productData ? {
              displayDescription: productData.displayDescription,
              snippet: productData.snippet,  
              description: productData.description
            } : null
          });
          
          // Si on a la vraie description du produit Amazon, l'utiliser en priorité
          const realDescription = productData?.displayDescription || productData?.snippet || productData?.description;
          if (realDescription && realDescription.trim() && realDescription.trim() !== title) {
            console.log('✅ Utilisation description Amazon:', realDescription.trim());
            return realDescription.trim();
          }
          
          const interests = person.interests || [];
          const age = person.age_years || 0;
          const name = person.name;
          
          // Extract product type from title
          const lowerTitle = title.toLowerCase();
          
          if (lowerTitle.includes('livre') || lowerTitle.includes('book')) {
            return `Un livre parfait pour ${name} qui${interests.includes('Lecture') ? ' adore lire' : ' pourra découvrir de nouveaux horizons'}. Idéal pour enrichir sa bibliothèque personnelle.`;
          }
          
          if (lowerTitle.includes('cuisine') || lowerTitle.includes('ustensile') || lowerTitle.includes('cookware')) {
            return `Un accessoire de cuisine${interests.includes('Cuisine') ? ' pour satisfaire sa passion culinaire' : ' pratique et élégant'}. Parfait pour ${name} qui pourra créer de délicieux plats.`;
          }
          
          if (lowerTitle.includes('tech') || lowerTitle.includes('gadget') || lowerTitle.includes('électronique') || lowerTitle.includes('smart')) {
            return `Un gadget technologique${interests.includes('Tech') ? ' pour combler sa passion du numérique' : ' moderne et pratique'}. Idéal pour faciliter le quotidien de ${name}.`;
          }
          
          if (lowerTitle.includes('sport') || lowerTitle.includes('fitness') || lowerTitle.includes('exercice')) {
            return `Un équipement de sport${interests.includes('Sport') ? ' pour soutenir sa passion sportive' : ' pour encourager un mode de vie actif'}. Parfait pour que ${name} reste en forme.`;
          }
          
          if (lowerTitle.includes('beauté') || lowerTitle.includes('cosmé') || lowerTitle.includes('soin')) {
            return `Un produit de beauté élégant et raffiné. Parfait pour que ${name} puisse prendre soin d'elle et se sentir bien dans sa peau.`;
          }
          
          if (lowerTitle.includes('enfant') || lowerTitle.includes('bébé') || lowerTitle.includes('jouet')) {
            return `${age < 2 ? 'Un jouet d\'éveil' : 'Un cadeau ludique'} spécialement conçu pour stimuler la créativité et l'apprentissage. Parfait pour accompagner le développement de ${name}.`;
          }
          
          if (lowerTitle.includes('bijou') || lowerTitle.includes('bracelet') || lowerTitle.includes('collier') || lowerTitle.includes('bague')) {
            return `Un bijou élégant${interests.includes('Mode') ? ' qui complétera parfaitement sa garde-robe' : ' pour ajouter une touche de raffinement'}. Idéal pour ${name} lors d'occasions spéciales.`;
          }
          
          if (lowerTitle.includes('maison') || lowerTitle.includes('décor') || lowerTitle.includes('home')) {
            return `Un accessoire de décoration qui apportera une touche personnelle à son intérieur. Parfait pour que ${name} puisse créer un espace qui lui ressemble.`;
          }
          
          // Generic description based on event type and product title
          if (eventType === 'birthday') {
            // Analyze product title to extract meaningful information
            console.log('🔍 Analyse du titre:', lowerTitle);
            
            // More specific product detection based on actual titles
            if (lowerTitle.includes('valet') || lowerTitle.includes('porte vêtement') || lowerTitle.includes('vestiaire')) {
              return `Un valet de chambre élégant en bambou pour ${name}. Parfait pour organiser ses vêtements avec style et praticité.`;
            }
            
            if (lowerTitle.includes('cônes') || lowerTitle.includes('barres') || lowerTitle.includes('agility')) {
              return `Un set d'entraînement sportif complet avec cônes et barres. Idéal pour ${name} qui aime le sport et l'exercice physique.`;
            }
            
            if (lowerTitle.includes('balle de golf') || lowerTitle.includes('golf')) {
              return `Des balles de golf haute performance pour ${name}. Parfaites pour améliorer son jeu et profiter pleinement de sa passion golfique.`;
            }
            
            if (lowerTitle.includes('haltères') || lowerTitle.includes('kettlebell') || lowerTitle.includes('musculation')) {
              return `Un équipement de musculation polyvalent et réglable. Parfait pour que ${name} puisse s'entraîner efficacement à domicile.`;
            }
            
            if (lowerTitle.includes('service à thé') || lowerTitle.includes('thé') || lowerTitle.includes('céramique')) {
              return `Un élégant service à thé en céramique pour ${name}. Idéal pour savourer des moments de détente et partager des instants privilégiés.`;
            }
            
            if (lowerTitle.includes('lego') || lowerTitle.includes('construction') || lowerTitle.includes('créatif')) {
              return `Un set de construction créatif LEGO pour ${name}. Parfait pour exprimer sa créativité et créer de magnifiques œuvres d'art.`;
            }
            
            if (lowerTitle.includes('puzzle') || lowerTitle.includes('jeu')) {
              return `Un puzzle stimulant et divertissant pour ${name}. Idéal pour exercer l'esprit tout en passant d'agréables moments.`;
            }
            
            // Relaxdays brand products
            if (lowerTitle.includes('relaxdays')) {
              if (lowerTitle.includes('set') || lowerTitle.includes('kit')) {
                return `Un ensemble pratique de la marque Relaxdays pour ${name}. Conçu pour apporter fonctionnalité et confort dans le quotidien.`;
              }
              return `Un produit Relaxdays de qualité pour ${name}. Alliant design moderne et utilité pratique pour améliorer son quotidien.`;
            }
            
            // Match with interests more broadly
            const matchingInterests = interests.filter(interest => 
              lowerTitle.includes(interest.toLowerCase()) || 
              (interest === 'Sport' && (lowerTitle.includes('sport') || lowerTitle.includes('fitness') || lowerTitle.includes('exercice') || lowerTitle.includes('training') || lowerTitle.includes('cônes') || lowerTitle.includes('haltères'))) ||
              (interest === 'Bien-être' && (lowerTitle.includes('relaxation') || lowerTitle.includes('massage') || lowerTitle.includes('zen') || lowerTitle.includes('thé')))
            );
            
            if (matchingInterests.length > 0) {
              const productType = lowerTitle.includes('set') ? 'set' : 
                                 lowerTitle.includes('kit') ? 'kit' : 
                                 lowerTitle.includes('collection') ? 'collection' : 'produit';
              return `Un ${productType} parfait pour ${name} qui aime ${matchingInterests[0].toLowerCase()}. Ce cadeau correspond parfaitement à ses centres d'intérêt.`;
            }
            
            // Extract brand and product type from title
            const words = title.split(' ');
            const brand = words[0];
            const hasNumber = /\d/.test(title);
            const isSet = lowerTitle.includes('set') || lowerTitle.includes('kit') || lowerTitle.includes('lot de');
            
            if (isSet && hasNumber) {
              return `Un ensemble complet de ${brand} pour ${name}. Ce set offre tout le nécessaire pour une expérience complète et satisfaisante.`;
            }
            
            if (brand && brand.length > 3) {
              return `Un produit de la marque ${brand} spécialement sélectionné pour ${name}. Alliant qualité et innovation pour répondre à ses besoins.`;
            }
            
            // Final fallback with more personality
            return `Un cadeau unique choisi avec soin pour l'anniversaire de ${name}. Ce produit saura lui apporter satisfaction et moments de bonheur.`;
          }
          
          // Default contextual description
          return `Un cadeau soigneusement sélectionné pour ${name}. Ce produit combine qualité et utilité, parfait pour lui faire plaisir${age > 0 ? ` à ${age} ans` : ''}.`;
        };
        
        return {
          title: selection.selectedTitle,
          description: generateDescription(selection.selectedTitle, personData, eventType, selectedProduct),
          estimatedPrice: selection.selectedPrice,
          confidence: selection.confidence,
          reasoning: `Sélectionné pour ${personData.name} en fonction de son profil et budget.`,
          category: 'Cadeau personnalisé',
          alternatives: [`Recherche Amazon: ${selection.selectedTitle}`],
          purchaseLinks: selectedProduct
            ? [selectedProduct.link]
            : [`https://www.amazon.fr/s?k=${encodeURIComponent(selection.selectedTitle)}&tag=${Deno.env.get('AMZ_PARTNER_TAG') ?? 'cadofy-21'}`],
          priceInfo: {
            displayPrice: selection.selectedPrice,
            source: 'amazon_price',
            originalEstimate: selection.selectedPrice,
            amazonPrice: selection.selectedPrice
          },
          amazonData: selectedProduct ? {
            asin: selectedProduct.asin,
            rating: selectedProduct.rating,
            reviewCount: selectedProduct.reviewCount,
            actualPrice: selectedProduct.price,
            imageUrl: selectedProduct.imageUrl,
            productUrl: selectedProduct.link,
            matchType: 'exact',
            description: selectedProduct.displayDescription // Ajouter la description Amazon
          } : {
            asin: selection.selectedAsin,
            productUrl: `https://www.amazon.fr/s?k=${encodeURIComponent(selection.selectedTitle)}&tag=${Deno.env.get('AMZ_PARTNER_TAG') ?? 'cadofy-21'}`,
            matchType: 'search'
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