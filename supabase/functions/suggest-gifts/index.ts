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
    console.log('STEP 1: Parse body');
    const body = await req.json();
    const { personId, eventType, budget } = body;
    console.log('Body parsed:', { personId, eventType, budget });

    console.log('STEP 2: Check OpenAI key');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI key exists:', !!openAIKey);
    console.log('OpenAI key prefix:', openAIKey?.substring(0, 10));

    if (!openAIKey) {
      throw new Error('No OpenAI key');
    }

    console.log('STEP 3: Test OpenAI API with simple request');
    
    const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say "Hello OpenAI" in JSON format: {"message": "..."}'
          }
        ]
      })
    });

    console.log('OpenAI response status:', testResponse.status);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('OpenAI error:', errorText);
      throw new Error(`OpenAI failed: ${testResponse.status} - ${errorText.substring(0, 200)}`);
    }

    const testData = await testResponse.json();
    console.log('OpenAI test response:', testData.choices[0].message.content);

    console.log('STEP 4: Return success');
    return new Response(JSON.stringify({
      success: true,
      openAITest: testData.choices[0].message.content,
      suggestions: [
        {
          title: 'Test cadeau',
          description: 'Ceci est un test de la fonction',
          estimatedPrice: budget || 30,
          confidence: 0.8,
          reasoning: 'Test reasoning',
          category: 'Test',
          alternatives: ['Alt 1', 'Alt 2'],
          purchaseLinks: ['https://www.amazon.fr/s?k=test'],
          brand: 'Test Brand',
          amazonData: {
            searchUrl: 'https://www.amazon.fr/s?k=test',
            matchType: 'search'
          }
        }
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('FUNCTION ERROR:', error?.message);
    console.error('ERROR STACK:', error?.stack);
    console.error('ERROR NAME:', error?.name);
    
    return new Response(JSON.stringify({
      error: error?.message || 'Unknown error',
      errorType: error?.name || 'UnknownError',
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});