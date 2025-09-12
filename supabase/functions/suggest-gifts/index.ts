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

    // Get person data from Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    let personData = null;
    if (supabaseUrl && supabaseKey && personId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from('persons')
          .select('*')
          .eq('id', personId)
          .single();
        personData = data;
      } catch (error) {
        console.error('Error fetching person data:', error);
      }
    }

    // Generate gift suggestions using OpenAI
    const giftResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en suggestions de cadeaux. Tu dois suggérer 3 cadeaux concrets avec des LIENS DIRECTS vers des produits spécifiques sur Amazon.fr ou d'autres sites français.

IMPORTANT: Pour chaque suggestion, tu DOIS fournir:
1. Un lien direct vers un produit spécifique (pas une recherche)
2. Un prix précis basé sur le produit réel
3. Une justification personnalisée

Format de réponse en JSON:
{
  "suggestions": [
    {
      "title": "Nom précis du produit",
      "description": "Description détaillée du produit",
      "estimatedPrice": 29.99,
      "confidence": 0.9,
      "reasoning": "Pourquoi ce cadeau convient à cette personne",
      "category": "Catégorie du produit",
      "alternatives": ["Alternative 1", "Alternative 2"],
      "purchaseLinks": ["https://www.amazon.fr/dp/ASINXXXXX", "https://www.fnac.com/..."],
      "brand": "Marque du produit",
      "amazonData": {
        "searchUrl": "https://www.amazon.fr/dp/ASINXXXXX",
        "matchType": "direct"
      }
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Génère 3 suggestions de cadeaux pour:
- Type d'événement: ${eventType}
- Budget approximatif: ${budget}€
- Informations sur la personne: ${personData ? JSON.stringify(personData) : 'Informations limitées'}

Trouve des produits RÉELS avec des liens directs vers Amazon.fr, Fnac, Darty, etc. Utilise tes connaissances des produits populaires et leurs ASINs Amazon pour créer des liens directs valides.

Exemples de liens directs valides:
- https://www.amazon.fr/dp/B08N5WRWNW (Echo Dot)
- https://www.amazon.fr/dp/B07PHPXHQS (Kindle)
- https://www.amazon.fr/dp/B08C1W5N87 (iPad)

Génère des suggestions avec de vrais liens directs similaires.`
          }
        ]
      })
    });

    if (!giftResponse.ok) {
      const errorText = await giftResponse.text();
      console.error('OpenAI gift generation error:', giftResponse.status, errorText);
      
      // Return fallback suggestions if OpenAI fails
      return new Response(JSON.stringify({
        success: true,
        suggestions: [
          {
            title: 'Écouteurs Sony WH-CH720N',
            description: 'Casque sans fil avec réduction de bruit, autonomie 35h, parfait pour la musique et les appels',
            estimatedPrice: budget || 89,
            confidence: 0.8,
            reasoning: 'Cadeau technologique apprécié par tous',
            category: 'Audio',
            alternatives: ['AirPods', 'JBL Tune 760NC'],
            purchaseLinks: ['https://www.amazon.fr/dp/B0BTYGHG7L'],
            brand: 'Sony',
            amazonData: {
              searchUrl: 'https://www.amazon.fr/dp/B0BTYGHG7L',
              matchType: 'direct'
            }
          }
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const giftData = await giftResponse.json();
    let suggestions = [];
    
    try {
      const content = giftData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.suggestions || [];
      }
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
    }

    // If parsing failed, return fallback
    if (suggestions.length === 0) {
      suggestions = [
        {
          title: 'Livre bestseller récent',
          description: 'Une sélection parmi les livres les plus populaires du moment',
          estimatedPrice: budget || 20,
          confidence: 0.7,
          reasoning: 'Cadeau universel et enrichissant',
          category: 'Littérature',
          alternatives: ['BD', 'Magazine'],
          purchaseLinks: ['https://www.amazon.fr/dp/B08FHHQK4Q'],
          brand: 'Diverses',
          amazonData: {
            searchUrl: 'https://www.amazon.fr/dp/B08FHHQK4Q',
            matchType: 'direct'
          }
        }
      ];
    }

    return new Response(JSON.stringify({
      success: true,
      suggestions: suggestions
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