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
- Budget: ${budget}€
- Contexte supplémentaire: ${additionalContext || 'Aucun'}

INSTRUCTIONS:
1. Prends en compte l'âge, les intérêts et la personnalité
2. Respecte le budget indiqué
3. Évite de répéter le dernier cadeau s'il est mentionné
4. Sois créatif et personnel dans tes suggestions
5. Explique pourquoi chaque cadeau convient à cette personne

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

    // Enrich suggestions with Amazon data
    console.log('🛒 Enriching suggestions with Amazon data...');
    const enrichedSuggestions = await Promise.all(
      suggestions.map(async (suggestion: any) => {
        try {
          const searchQuery = `${suggestion.title} ${suggestion.category}`.toLowerCase();
          console.log(`🔍 Searching Amazon for: ${searchQuery}`);
          
          const serpResponse = await fetch(`https://serpapi.com/search.json?engine=amazon&q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}&amazon_domain=amazon.fr&gl=fr&hl=fr&num=3`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!serpResponse.ok) {
            console.log(`⚠️ SerpApi error for "${searchQuery}":`, serpResponse.status);
            return suggestion;
          }

          const serpData = await serpResponse.json();
          const amazonResults = serpData.shopping_results || [];
          
          if (amazonResults.length > 0) {
            const bestMatch = amazonResults[0];
            console.log(`✅ Found Amazon product: ${bestMatch.title}`);
            
            // Extract ASIN from link if available
            const asin = bestMatch.link?.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || 
                        bestMatch.link?.match(/\/gp\/product\/([A-Z0-9]{10})/)?.[1];
            
            suggestion.amazonData = {
              asin: asin,
              rating: bestMatch.rating || null,
              reviewCount: bestMatch.reviews_count || 0,
              availability: bestMatch.delivery || 'Disponible',
              prime: bestMatch.prime || false,
              actualPrice: bestMatch.price ? parseFloat(bestMatch.price.toString().replace(/[^\d.,]/g, '').replace(',', '.')) : null,
              imageUrl: bestMatch.thumbnail,
              productUrl: bestMatch.link,
              addToCartUrl: bestMatch.link,
              searchUrl: `https://amazon.fr/s?k=${encodeURIComponent(searchQuery)}`,
              matchType: 'search'
            };
            
            // Update purchase links
            suggestion.purchaseLinks = [bestMatch.link];
            
            // Update estimated price with actual Amazon price if available
            if (suggestion.amazonData.actualPrice) {
              suggestion.estimatedPrice = Math.round(suggestion.amazonData.actualPrice);
            }
          } else {
            console.log(`❌ No Amazon results for: ${searchQuery}`);
            // Add search URL as fallback
            suggestion.purchaseLinks = [`https://amazon.fr/s?k=${encodeURIComponent(searchQuery)}`];
          }
          
          return suggestion;
        } catch (error) {
          console.error(`❌ Error enriching suggestion "${suggestion.title}":`, error);
          // Return original suggestion if enrichment fails
          return suggestion;
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