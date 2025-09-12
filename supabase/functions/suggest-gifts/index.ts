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
      .select('*')
      .eq('id', personId)
      .maybeSingle();

    if (error) {
      console.error('DB Error:', error);
      throw new Error(`DB error: ${error.message}`);
    }

    if (!person) {
      throw new Error('Person not found');
    }

    console.log('Step 6: Call OpenAI for real suggestions');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key missing');
    }

    // Calculate age
    const birth = new Date(person.birthday);
    const age = new Date().getFullYear() - birth.getFullYear();
    
    const interests = Array.isArray(person.interests) ? person.interests.join(', ') : '';
    
    const prompt = `Génère 3 suggestions de cadeaux réalistes pour ${person.name}, ${age} ans, intérêts: ${interests}.
Budget: ${budget}€, Événement: ${eventType}

IMPORTANT: 
- Propose des produits réels disponibles sur Amazon
- Reste dans le budget
- Adapte aux intérêts de la personne
- Pour les liens, utilise des termes de recherche précis

Format JSON UNIQUEMENT:
{
  "suggestions": [
    {
      "title": "Nom précis du produit",
      "description": "Description courte du produit et pourquoi il convient",
      "estimatedPrice": ${Math.min(budget, 50)},
      "confidence": 0.85,
      "reasoning": "Pourquoi ce cadeau convient à ${person.name}",
      "category": "Catégorie",
      "alternatives": ["Alt1", "Alt2"],
      "purchaseLinks": ["https://www.amazon.fr/s?k=terme+de+recherche+précis"],
      "brand": "Marque",
      "amazonData": {
        "searchUrl": "https://www.amazon.fr/s?k=terme+de+recherche+précis",
        "matchType": "search"
      }
    }
  ]
}`;

    console.log('Calling OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2500,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en cadeaux. Réponds UNIQUEMENT avec du JSON valide, pas de texte avant/après.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Clean up potential markdown formatting
    content = content.replace(/```json\n?/g, '').replace(/```$/g, '');
    
    console.log('OpenAI response preview:', content.substring(0, 200));

    let suggestions;
    try {
      const parsed = JSON.parse(content);
      suggestions = parsed.suggestions || [];
    } catch (parseError) {
      console.error('JSON parse failed:', parseError);
      console.error('Raw content:', content);
      
      // Fallback to manual suggestions if OpenAI JSON fails
      suggestions = [
        {
          title: interests.includes('Tech') ? 'Écouteurs Bluetooth' : interests.includes('Sport') ? 'Bouteille d\'eau sport' : 'Livre bestseller',
          description: `Cadeau parfait pour ${person.name} qui aime ${interests || 'découvrir de nouvelles choses'}`,
          estimatedPrice: Math.min(budget, 40),
          confidence: 0.75,
          reasoning: `Ce cadeau correspond aux intérêts de ${person.name} et reste dans le budget`,
          category: interests.includes('Tech') ? 'Technologie' : interests.includes('Sport') ? 'Sport' : 'Culture',
          alternatives: ['Variante premium', 'Version économique'],
          purchaseLinks: [`https://www.amazon.fr/s?k=${interests.includes('Tech') ? 'ecouteurs+bluetooth' : interests.includes('Sport') ? 'bouteille+sport' : 'livre+bestseller'}`],
          brand: 'Suggestion',
          amazonData: {
            searchUrl: `https://www.amazon.fr/s?k=${interests.includes('Tech') ? 'ecouteurs+bluetooth' : interests.includes('Sport') ? 'bouteille+sport' : 'livre+bestseller'}`,
            matchType: 'search'
          }
        }
      ];
    }

    console.log(`Generated ${suggestions.length} suggestions`);

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