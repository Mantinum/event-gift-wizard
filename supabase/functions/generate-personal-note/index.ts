import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    const { name, gender, age, relationship, interests } = await req.json();
    
    // Validate required parameters
    if (!name || !relationship) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Les champs nom et relation sont requis'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuration manquante: clé OpenAI non configurée'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    // Create a contextual prompt for generating personal notes
    const interestsText = interests && interests.length > 0 ? interests.join(', ') : 'divers';
    const ageText = age ? `${age} ans` : 'un âge non précisé';
    const genderText = gender || 'non précisé';

    const prompt = `Génère une note personnelle de 2-3 phrases pour décrire ${name}, qui est ${relationship === 'Moi' ? 'la personne elle-même' : `mon/ma ${relationship.toLowerCase()}`}. 

Informations disponibles:
- Nom: ${name}
- Âge: ${ageText}
- Sexe: ${genderText}
- Relation: ${relationship}
- Centres d'intérêt: ${interestsText}

La note doit être personnelle, narrative et utile pour choisir des cadeaux. Évite les formulations génériques. Commence par "${name} est" et écris à la troisième personne. Sois naturel et chaleureux.

Exemple: "Sophie est ma sœur de 28 ans qui adore la cuisine créative et passe ses week-ends à expérimenter de nouvelles recettes. Elle apprécie les produits artisanaux et privilégie toujours la qualité à la quantité. C'est quelqu'un de très attentionné qui aime offrir des plats faits maison à ses proches."`;

    console.log('🤖 Generating personal note for:', name);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'Tu es un assistant qui génère des notes personnelles courtes et authentiques pour aider à mieux connaître les proches. Sois naturel, chaleureux et évite les clichés.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la génération de la note personnelle'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const data = await response.json();
    const generatedNote = data.choices?.[0]?.message?.content?.trim();

    if (!generatedNote) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Aucune note générée'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    console.log('✅ Personal note generated successfully');

    return new Response(JSON.stringify({
      success: true,
      personalNote: generatedNote
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in generate-personal-note function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur interne du serveur'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});