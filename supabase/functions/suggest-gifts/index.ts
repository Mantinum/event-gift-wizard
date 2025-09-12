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

serve(async (req) => {
  console.log('=== FUNCTION START ===');
  
  if (req.method === 'OPTIONS') {
    console.log('CORS handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Step 1: Parse request');
    const body = await req.json();
    console.log('Request parsed:', body);
    
    const { personId, eventType, budget } = body as GiftSuggestionRequest;

    console.log('Step 2: Check environment');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase config missing');
    }

    console.log('Step 3: Get auth header');
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    console.log('Step 4: Create Supabase client');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    console.log('Step 5: Query person');
    const { data: person, error } = await supabase
      .from('persons')
      .select('name, interests')
      .eq('id', personId)
      .maybeSingle();

    if (error) {
      console.error('DB Error:', error);
      throw new Error(`DB error: ${error.message}`);
    }

    if (!person) {
      throw new Error('Person not found');
    }

    console.log('Step 6: Generate simple response');
    const suggestions = [
      {
        title: `Cadeau personnalisé pour ${person.name}`,
        description: `Suggestion basée sur les intérêts : ${person.interests?.join(', ') || 'aucun'}`,
        estimatedPrice: budget || 30,
        confidence: 0.8,
        reasoning: `Ce cadeau convient parfaitement à ${person.name} pour un ${eventType}`,
        category: "Personnalisé",
        alternatives: ["Alternative 1", "Alternative 2"],
        purchaseLinks: [`https://www.amazon.fr/s?k=cadeau+${eventType}`],
        brand: "Suggestion IA",
        amazonData: {
          searchUrl: `https://www.amazon.fr/s?k=cadeau+${eventType}`,
          matchType: "search"
        }
      }
    ];

    console.log('Step 7: Return response');
    return new Response(JSON.stringify({
      suggestions,
      personName: person.name,
      eventType,
      budget
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('ERROR:', error?.message);
    console.error('ERROR STACK:', error?.stack);
    
    return new Response(JSON.stringify({
      error: error?.message || 'Unknown error',
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});