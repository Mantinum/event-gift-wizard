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

  try {
    console.log('📥 Processing request...');
    
    // Test environment variables
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const serpApiKey = Deno.env.get('SERPAPI_API_KEY');
    
    console.log('🔑 Environment check:');
    console.log('- OpenAI Key available:', !!openAIKey);
    console.log('- SerpApi Key available:', !!serpApiKey);
    
    if (!openAIKey) {
      console.log('❌ Missing OpenAI API key');
      return new Response(JSON.stringify({
        error: 'Configuration manquante: clé OpenAI non configurée',
        suggestions: []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!serpApiKey) {
      console.log('❌ Missing SerpApi API key');
      return new Response(JSON.stringify({
        error: 'Configuration manquante: clé SerpApi non configurée',
        suggestions: []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body = await req.json();
    const { personId, eventType, budget, additionalContext } = body;
    console.log('📋 Request data:', { personId, eventType, budget, additionalContext });

    // Fetch person data from database
    console.log('🔍 Fetching person data for ID:', personId);
    const { data: personData, error: personError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .single();

    console.log('📊 Database response - Data:', personData);
    console.log('📊 Database response - Error:', personError);

    if (personError) {
      console.error('❌ Database error:', personError.message, personError.code);
      return new Response(JSON.stringify({
        error: `Erreur base de données: ${personError.message}`,
        errorCode: personError.code,
        suggestions: []
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!personData) {
      console.error('❌ Person not found with ID:', personId);
      return new Response(JSON.stringify({
        error: 'Personne non trouvée avec cet ID',
        personId: personId,
        suggestions: []
      }), {
        status: 404,
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

    // Call OpenAI API
    console.log('🤖 Calling OpenAI API...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
      console.error('❌ OpenAI API error:', await openAIResponse.text());
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    console.log('✅ OpenAI response received');

    // Parse the AI response
    let suggestions = [];
    try {
      const aiContent = openAIData.choices[0].message.content.trim();
      console.log('🧠 AI content:', aiContent);
      
      // Remove any markdown formatting
      const cleanContent = aiContent.replace(/```json\n?/, '').replace(/\n?```/, '');
      const parsedResponse = JSON.parse(cleanContent);
      suggestions = parsedResponse.suggestions || [];
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      // Fallback suggestions
      suggestions = [
        {
          title: "Cadeau personnalisé",
          description: `Un cadeau adapté pour ${personData.name} basé sur ses intérêts`,
          estimatedPrice: Math.min(budget * 0.8, 50),
          confidence: 0.7,
          reasoning: "Suggestion générée automatiquement en cas d'erreur d'analyse",
          category: "général",
          alternatives: [],
          purchaseLinks: []
        }
      ];
    }

    console.log('🎁 Generated suggestions:', suggestions.length);
    return new Response(JSON.stringify({
      suggestions,
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
      error: 'Erreur lors du traitement de la requête',
      details: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});