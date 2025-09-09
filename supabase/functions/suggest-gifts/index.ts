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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personId, eventType, budget, additionalContext }: GiftSuggestionRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get person details from database
    const { data: person, error: personError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .single();

    if (personError || !person) {
      throw new Error('Personne non trouvée');
    }

    // Get person's event history for better context
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('person_id', personId)
      .order('date', { ascending: false })
      .limit(5);

    // Prepare context for AI
    const personContext = {
      name: person.name,
      age: calculateAge(person.birthday),
      interests: person.interests || [],
      relationship: person.relationship,
      preferredCategories: person.preferred_categories || [],
      notes: person.notes || '',
      lastGift: person.last_gift || '',
      recentEvents: events || []
    };

    // Generate AI suggestions using OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    const systemPrompt = `Tu es un expert en suggestions de cadeaux personnalisés. 
    Analyse le profil de la personne et génère 3 suggestions de cadeaux parfaitement adaptées.
    
    Réponds UNIQUEMENT avec un JSON valide contenant un array "suggestions" avec 3 objets ayant cette structure exacte :
    {
      "suggestions": [
        {
          "title": "Nom du cadeau",
          "description": "Description détaillée du cadeau",
          "estimatedPrice": prix_en_euros_nombre,
          "confidence": score_0_a_1,
          "reasoning": "Pourquoi ce cadeau est parfait pour cette personne",
          "category": "Catégorie du cadeau", 
          "alternatives": ["Alternative 1", "Alternative 2"],
          "purchaseLinks": ["Suggestion de recherche 1", "Suggestion de recherche 2"]
        }
      ]
    }`;

    const userPrompt = `
    PROFIL DE LA PERSONNE :
    - Nom : ${personContext.name}
    - Âge : ${personContext.age} ans
    - Relation : ${personContext.relationship}
    - Centres d'intérêt : ${personContext.interests.join(', ')}
    - Catégories préférées : ${personContext.preferredCategories.join(', ')}
    - Notes personnelles : ${personContext.notes}
    - Dernier cadeau offert : ${personContext.lastGift}
    
    CONTEXTE DE L'ÉVÉNEMENT :
    - Type d'événement : ${eventType}
    - Budget maximum : ${budget}€
    - Contexte additionnel : ${additionalContext || 'Aucun'}
    
    HISTORIQUE RÉCENT :
    ${personContext.recentEvents.map(e => `- ${e.title} (${e.date})`).join('\n')}
    
    Génère 3 suggestions de cadeaux créatives et personnalisées qui correspondent parfaitement à cette personne, son budget et l'occasion.
    `;

    console.log('Calling OpenAI API for gift suggestions...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('OpenAI response:', aiResponse);

    // Parse AI response
    let suggestions: GiftSuggestion[];
    try {
      const parsed = JSON.parse(aiResponse);
      suggestions = parsed.suggestions;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Réponse IA invalide');
    }

    // Validate suggestions
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Aucune suggestion générée');
    }

    // Store suggestions in database for future reference
    const purchaseRecords = suggestions.map(suggestion => ({
      user_id: person.user_id,
      person_id: personId,
      person_name: person.name,
      event_title: `${eventType} - ${person.name}`,
      event_id: null, // Will be linked when event is created
      days_until: calculateDaysUntilNextEvent(eventType, person.birthday),
      budget: suggestion.estimatedPrice,
      suggested_gift: suggestion.title,
      confidence: suggestion.confidence,
      status: 'pending' as const,
      alternative_gifts: suggestion.alternatives,
      ai_reasoning: suggestion.reasoning
    }));

    const { error: insertError } = await supabase
      .from('upcoming_purchases')
      .insert(purchaseRecords);

    if (insertError) {
      console.error('Error storing suggestions:', insertError);
      // Don't throw - we still want to return the suggestions
    }

    return new Response(JSON.stringify({ 
      success: true, 
      suggestions,
      personName: person.name 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-gifts function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Une erreur est survenue lors de la génération des suggestions' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateAge(birthday: string): number {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function calculateDaysUntilNextEvent(eventType: string, birthday: string): number {
  if (eventType === 'birthday') {
    const today = new Date();
    const birthDate = new Date(birthday);
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = thisYearBirthday.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  return 30; // Default for other event types
}