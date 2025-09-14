import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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
    
    // 2. Parse body with try/catch
    let body: any = {};
    try {
      body = await req.json();
    } catch (parseError) {
      console.log('❌ Invalid JSON body:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON body'
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
    
    // Get the authorization header for user authentication
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

    // Create regular supabase client to get authenticated user
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          authorization: authHeader
        }
      }
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    console.log('👤 User:', user?.id);
    console.log('❌ Auth error:', authError);

    if (authError || !user) {
      console.log('❌ Authentication failed');
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

    // Create intelligent prompt for OpenAI
    const prompt = `Tu es un expert en suggestions de cadeaux personnalisés. Génère 3 suggestions de cadeaux pour cette personne :

PROFIL DE LA PERSONNE:
- Nom: ${personData.name}
- Âge: ${personData.age_years ? `${personData.age_years} ans` : 'Non spécifié'}
- Genre: ${personData.gender || 'Non spécifié'}
- Relation: ${personData.relationship || 'Non spécifié'}
- Centres d'intérêt: ${personData.interests?.join(', ') || 'Aucun spécifié'}
- Catégories préférées: ${personData.preferred_categories?.join(', ') || 'Aucune spécifiée'}
- Notes personnelles: ${personData.notes || 'Aucune'}
- Dernier cadeau offert: ${personData.last_gift || 'Aucun'}

CONTEXTE DE L'ÉVÉNEMENT:
- Type d'événement: ${eventType}
- Budget MAXIMUM: ${budget}€ (TRÈS IMPORTANT: ne pas dépasser)
- Contexte supplémentaire: ${additionalContext || 'Aucun'}

INSTRUCTIONS CRITIQUES:
1. RESPECTE ABSOLUMENT le budget de ${budget}€ - tous les prix doivent être inférieurs ou égaux à ce montant
2. VISE des prix entre ${Math.round(budget * 0.85)}€ et ${budget}€ pour optimiser le rapport qualité/prix
3. Prends en compte l'âge, les intérêts et la personnalité
4. Évite de répéter le dernier cadeau s'il est mentionné
5. Sois créatif et personnel dans tes suggestions
6. Explique pourquoi chaque cadeau convient à cette personne
7. Les prix estimés doivent être réalistes et dans la fourchette haute du budget

Réponds uniquement avec un JSON valide contenant un tableau de 3 suggestions au format :
{
  "suggestions": [
    {
      "title": "Titre du cadeau",
      "description": "Description détaillée du cadeau et pourquoi il convient",
      "estimatedPrice": 50,
      "confidence": 0.9,
      "reasoning": "Explication détaillée du choix basée sur le profil",
      "category": "catégorie du cadeau",
      "alternatives": ["alternative 1", "alternative 2"],
      "purchaseLinks": []
    }
  ]
}`;

    // Call OpenAI API with forced JSON response
    console.log('🤖 Calling OpenAI API...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en cadeaux personnalisés. Tu réponds UNIQUEMENT avec du JSON valide, sans texte supplémentaire.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      }),
    });

    if (!openAIResponse.ok) {
      const errText = await openAIResponse.text();
      console.error('❌ OpenAI API error:', openAIResponse.status, errText);
      return new Response(JSON.stringify({
        success: false,
        error: 'OpenAI error',
        status: openAIResponse.status,
        details: errText
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse the AI response with better error handling
    let suggestions = [];
    try {
      const openAIData = await openAIResponse.json();
      console.log('✅ OpenAI response received');
      
      const aiContent = openAIData.choices?.[0]?.message?.content ?? '{}';
      console.log('🧠 AI content:', aiContent);
      
      const parsedResponse = JSON.parse(aiContent);
      suggestions = parsedResponse.suggestions || [];
    } catch (parseError) {
      console.error('❌ Error parsing OpenAI response:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to parse OpenAI JSON',
        details: (parseError as Error).message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1) Utilitaire robuste : extraction ASIN depuis n'importe quel lien Amazon
    const extractAsin = (link: string): string | null => {
      if (!link) return null;
      const pats = [
        /\/dp\/([A-Z0-9]{10})/i,
        /\/gp\/product\/([A-Z0-9]{10})/i,
        /[?&]asin=([A-Z0-9]{10})/i,
      ];
      for (const re of pats) {
        const m = link.match(re);
        if (m) return m[1].toUpperCase();
      }
      return null;
    };

    // 2) Recherche Amazon SerpApi → renvoie le premier produit avec ASIN + infos utiles
    async function searchAmazonProductSerpApi(query: string, serpApiKey: string) {
      const params = new URLSearchParams({
        engine: 'amazon',
        amazon_domain: 'amazon.fr',
        language: 'fr_FR',
        k: query,
        api_key: serpApiKey,
      });
      const r = await fetch(`https://serpapi.com/search.json?${params}`);
      if (!r.ok) return null;
      const data = await r.json();

      const buckets = [
        ...(data.sponsored_results || []),
        ...(data.organic_results || []),
        ...(data.search_results || []),
      ];

      for (const item of buckets.slice(0, 15)) {
        const asin = item.asin || extractAsin(item.link);
        if (!asin) continue;
        const productUrl = `https://www.amazon.fr/dp/${asin}`;
        return {
          asin,
          productUrl,
          title: item.title,
          price: item.price_string || item.price,
          imageUrl: item.thumbnail || item.image,
          rating: item.rating,
          reviewCount: item.reviews_count,
          matchType: 'direct' as const,
        };
      }
      return null;
    }

    // 🛒 Enrich suggestions with Amazon data (fix: use amazon engine properly)
    console.log('🛒 Enriching suggestions with Amazon data...');
    const enrichedSuggestions = await Promise.all(
      suggestions.map(async (suggestion: any) => {
        try {
          // Requête plus précise : marque + modèle si dispo
          const baseQuery = [suggestion.brand, suggestion.canonical_name || suggestion.title]
            .filter(Boolean)
            .join(' ');
          const query = baseQuery || `${suggestion.title} ${suggestion.category}`;
          console.log(`🔍 Searching Amazon for: ${query}`);      

          const result = await searchAmazonProductSerpApi(query, serpApiKey);

          if (result) {
            console.log(`✅ Found Amazon product with ASIN: ${result.asin}`);
        suggestion.amazonData = {
          asin: result.asin,
          productUrl: result.productUrl,
          imageUrl: result.imageUrl || null,
          rating: result.rating || null,
          reviewCount: result.reviewCount || 0,
          matchType: result.matchType,
          // on garde un searchUrl de secours
          searchUrl: `https://www.amazon.fr/s?k=${encodeURIComponent(query)}`
        };
        suggestion.purchaseLinks = [result.productUrl]; // 🔒 lien direct produit
        // Ajouter l'image du produit à la suggestion
        if (result.imageUrl) {
          suggestion.imageUrl = result.imageUrl;
        }
        // Mise à jour de prix si dispo et si dans le budget
        if (result.price) {
          const p = parseFloat(String(result.price).replace(/[^\d,]/g, '').replace(',', '.'));
          if (!isNaN(p)) {
            // Si le prix Amazon dépasse le budget, on garde l'estimation OpenAI
            if (p <= budget) {
              suggestion.estimatedPrice = Math.round(p);
            } else {
              console.log(`Prix Amazon (${p}€) dépasse le budget (${budget}€) pour "${suggestion.title}"`);
            }
          }
        }
          } else {
            console.log(`❌ No Amazon results for: ${query}`);
            // fallback propre
            const searchUrl = `https://www.amazon.fr/s?k=${encodeURIComponent(query)}`;
            suggestion.amazonData = { matchType: 'search', searchUrl };
            suggestion.purchaseLinks = [searchUrl];
          }
          return suggestion;
        } catch (e) {
          console.error(`SerpApi enrich error for "${suggestion.title}":`, e);
          return suggestion; // pas de crash
        }
      })
    );

    console.log('🎁 Generated and enriched suggestions:', enrichedSuggestions.length);
    return new Response(JSON.stringify({
      success: true,
      suggestions: enrichedSuggestions,
      personName: personData.name,
      eventType,
      budget
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