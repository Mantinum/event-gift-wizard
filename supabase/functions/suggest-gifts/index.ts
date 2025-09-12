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
  brand?: string;
  amazonData?: {
    asin?: string;
    rating?: number;
    reviewCount?: number;
    availability?: string;
    prime?: boolean;
    actualPrice?: number;
    imageUrl?: string;
    productUrl?: string;
    addToCartUrl?: string;
    searchUrl?: string;
    matchType?: 'exact' | 'relaxed' | 'search';
  };
}

serve(async (req) => {
  console.log('=== EDGE FUNCTION START ===');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Returning CORS response');
    return new Response(null, { headers: corsHeaders });
  }

  let step = 'INIT';
  try {
    step = 'PARSE_BODY';
    console.log('📥 Step: PARSE_BODY');
    const body = await req.json();
    console.log('📊 Request body received:', JSON.stringify(body));
    
    step = 'EXTRACT_PARAMS';
    console.log('📥 Step: EXTRACT_PARAMS');
    const { personId, eventType, budget, additionalContext } = body as GiftSuggestionRequest;
    console.log('🔍 Params extracted:', { personId, eventType, budget, additionalContext });
    
    step = 'CHECK_ENV';
    console.log('📥 Step: CHECK_ENV');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('🔑 Environment variables:', {
      openAI: openAIApiKey ? `SET (${openAIApiKey.substring(0, 10)}...)` : 'MISSING',
      supabaseUrl: supabaseUrl ? `SET (${supabaseUrl})` : 'MISSING',
      supabaseKey: supabaseKey ? `SET (${supabaseKey.substring(0, 10)}...)` : 'MISSING'
    });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }
    if (!supabaseKey) {
      throw new Error('Supabase key not configured');
    }

    step = 'CHECK_AUTH';
    console.log('📥 Step: CHECK_AUTH');
    const authHeader = req.headers.get('authorization');
    console.log('🔐 Auth header:', authHeader ? `PRESENT (${authHeader.substring(0, 20)}...)` : 'MISSING');
    
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    step = 'INIT_SUPABASE';
    console.log('📥 Step: INIT_SUPABASE');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    console.log('✅ Supabase client created');

    step = 'FETCH_PERSON';
    console.log('📥 Step: FETCH_PERSON');
    console.log(`🔍 Querying person with ID: ${personId}`);
    
    const { data: person, error: personError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .maybeSingle();

    console.log('👤 Person query completed');
    console.log('👤 Person data:', person ? `Found: ${person.name}` : 'Not found');
    console.log('👤 Person error:', personError ? JSON.stringify(personError) : 'None');

    if (personError) {
      throw new Error(`Person query failed: ${JSON.stringify(personError)}`);
    }

    if (!person) {
      throw new Error(`Person with ID ${personId} not found`);
    }

    step = 'SUCCESS_RESPONSE';
    console.log('📥 Step: SUCCESS_RESPONSE');
    
    // Return a simple success response for now to isolate the issue
    const result = {
      success: true,
      message: 'Function executed successfully',
      personName: person.name,
      step: step,
      suggestions: [
        {
          title: "Test Suggestion",
          description: "This is a test suggestion",
          estimatedPrice: 25,
          confidence: 0.8,
          reasoning: "Test reasoning",
          category: "Test",
          alternatives: ["Alternative 1"],
          purchaseLinks: ["https://www.amazon.fr/s?k=test"],
          brand: "Test Brand",
          amazonData: {
            searchUrl: "https://www.amazon.fr/s?k=test",
            matchType: "search" as const
          }
        }
      ]
    };
    
    console.log('✅ Returning success response');
    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('💥 ERROR at step:', step);
    console.error('💥 Error type:', error?.constructor?.name);
    console.error('💥 Error message:', error?.message);
    console.error('💥 Error stack:', error?.stack);
    
    const errorResponse = { 
      success: false,
      error: error?.message || 'Unknown error occurred',
      step: step,
      suggestions: [],
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error?.constructor?.name || 'UnknownError',
        step: step
      }
    };
    
    console.log('❌ Returning error response:', JSON.stringify(errorResponse));
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});