import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== FUNCTION START ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { personId, eventType, budget } = body;
    console.log('Request received:', { personId, eventType, budget });

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.error('Missing OpenAI API key');
      return new Response(JSON.stringify({
        error: 'Configuration manquante: clé OpenAI non configurée',
        suggestions: []
      }), {
        status: 200, // Return 200 but with error message
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test simple OpenAI API call
    const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: 'Réponds juste "OK"'
          }
        ]
      })
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('OpenAI API error:', testResponse.status, errorText);
      
      let userMessage = 'Erreur API OpenAI';
      if (testResponse.status === 429) {
        userMessage = 'Quota OpenAI dépassé - vérifiez votre abonnement OpenAI';
      } else if (testResponse.status === 401) {
        userMessage = 'Clé OpenAI invalide - vérifiez votre configuration';
      } else if (testResponse.status === 400) {
        userMessage = 'Requête OpenAI invalide';
      }

      return new Response(JSON.stringify({
        error: userMessage,
        details: `Status ${testResponse.status}`,
        suggestions: []
      }), {
        status: 200, // Return 200 but with error in payload
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If OpenAI works, return fallback suggestions for now
    return new Response(JSON.stringify({
      success: true,
      suggestions: [
        {
          title: 'Écouteurs Bluetooth',
          description: 'Écouteurs sans fil avec réduction de bruit active, parfaits pour la musique et les appels',
          estimatedPrice: budget || 50,
          confidence: 0.85,
          reasoning: 'Cadeau universel apprécié par tous',
          category: 'Technologie',
          alternatives: ['Casque audio', 'Enceinte portable'],
          purchaseLinks: ['https://www.amazon.fr/s?k=écouteurs+bluetooth'],
          brand: 'Diverses marques',
          amazonData: {
            searchUrl: 'https://www.amazon.fr/s?k=écouteurs+bluetooth',
            matchType: 'search'
          }
        }
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    
    return new Response(JSON.stringify({
      error: 'Erreur inattendue lors de la génération des suggestions',
      details: error?.message || 'Unknown error',
      suggestions: []
    }), {
      status: 200, // Return 200 but with error in payload
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});