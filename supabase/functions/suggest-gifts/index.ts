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
    
    const systemPrompt = `Tu es un expert en suggestions de cadeaux personnalisés avec accès aux catalogues produits.
    Analyse le profil de la personne et génère 3 suggestions de PRODUITS CONCRETS avec noms de marques, modèles et références précises.
    
    IMPORTANT: 
    - Propose des PRODUITS RÉELS avec marques et modèles spécifiques (ex: "iPhone 15 Pro 128GB", "Casque Sony WH-1000XM5", "Montre Apple Watch Series 9")
    - Évite les descriptions vagues comme "une activité mémorable" ou "un objet utile"
    - Donne des noms de produits que l'on peut rechercher directement sur Amazon ou autres sites
    - Inclus des alternatives concrètes avec marques et modèles
    
    Réponds UNIQUEMENT avec un JSON valide contenant un array "suggestions" avec 3 objets ayant cette structure exacte :
    {
      "suggestions": [
        {
          "title": "Marque + Modèle précis du produit",
          "description": "Description détaillée du produit avec ses spécificités",
          "estimatedPrice": prix_en_euros_nombre,
          "confidence": score_0_a_1,
          "reasoning": "Pourquoi ce produit est parfait pour cette personne",
          "category": "Catégorie du produit", 
          "alternatives": ["Marque + Modèle alternatif 1", "Marque + Modèle alternatif 2"],
          "purchaseLinks": ["Recherche Amazon exacte", "Recherche Google Shopping exacte"]
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
    
    Génère 3 PRODUITS CONCRETS avec marques et modèles précis dans le budget de ${budget}€.
    Exemple de format attendu :
    - "Casque Bose QuietComfort 45" plutôt que "un casque audio de qualité"  
    - "Kindle Paperwhite 11e génération 16GB" plutôt que "une liseuse électronique"
    - "Montre Garmin Forerunner 255" plutôt que "une montre connectée"
    
    Pour les purchaseLinks, utilise des termes de recherche précis comme "Casque Bose QuietComfort 45 Amazon" ou "Kindle Paperwhite 16GB prix".
    `;

    // Helper: deterministic fallback when OpenAI is unavailable (quota/key/errors)
    const createFallbackSuggestions = (): GiftSuggestion[] => {
      const getConcreteProductsByInterest = (interest: string, budgetRange: number) => {
        const products: {[key: string]: Array<{title: string, description: string, category: string}>>} = {
          'Tech': [
            { title: 'Casque Sony WH-1000XM5', description: 'Casque à réduction de bruit active avec qualité audio premium et autonomie 30h', category: 'Audio' },
            { title: 'Kindle Paperwhite 11e génération', description: 'Liseuse numérique étanche avec éclairage réglable et écran 6.8 pouces', category: 'Lecture' },
            { title: 'AirPods Pro 2e génération', description: 'Écouteurs sans fil avec réduction de bruit active et audio spatial', category: 'Audio' }
          ],
          'Sport': [
            { title: 'Montre Garmin Forerunner 255', description: 'Montre GPS multisport avec suivi avancé et autonomie longue durée', category: 'Fitness' },
            { title: 'Tapis de yoga Manduka PRO', description: 'Tapis de yoga professionnel antidérapant 6mm d\'épaisseur', category: 'Yoga' },
            { title: 'Foam Roller TriggerPoint GRID', description: 'Rouleau de massage pour récupération musculaire et mobilité', category: 'Récupération' }
          ],
          'Cuisine': [
            { title: 'Thermomix TM6', description: 'Robot culinaire multifonction avec écran tactile et recettes guidées', category: 'Électroménager' },
            { title: 'Couteau Santoku Wüsthof Classic', description: 'Couteau japonais forgé en acier inoxydable avec lame 17cm', category: 'Ustensiles' },
            { title: 'Machine à café DeLonghi Magnifica S', description: 'Machine à expresso automatique avec broyeur intégré', category: 'Café' }
          ],
          'Lecture': [
            { title: 'Kindle Oasis 10e génération', description: 'Liseuse premium avec éclairage adaptatif et design ergonomique', category: 'Liseuse' },
            { title: 'Lampe de lecture Glocusent LED', description: 'Lampe de lecture à clip avec 6 LED et batterie rechargeable', category: 'Accessoire' },
            { title: 'Support de livre en bambou', description: 'Support ajustable en bambou écologique pour lecture confortable', category: 'Accessoire' }
          ]
        };

        const defaultProducts = [
          { title: 'Coffret cadeau Amazon', description: 'Carte cadeau Amazon dans un coffret élégant', category: 'Carte cadeau' },
          { title: 'Diffuseur d\'huiles essentielles Stadler Form', description: 'Diffuseur ultrasonique design avec éclairage LED', category: 'Bien-être' },
          { title: 'Bougie parfumée Diptyque Baies', description: 'Bougie premium aux notes de cassis et rose bulgare (190g)', category: 'Parfum' }
        ];

        return products[interest] || defaultProducts;
      };

      const primaryInterest = personContext.interests[0] || 'Tech';
      const productsPool = getConcreteProductsByInterest(primaryInterest, budget);
      
      return productsPool.slice(0, 3).map((product, idx) => ({
        title: product.title,
        description: product.description,
        estimatedPrice: Math.min(budget, [60, 120, 200][idx] || budget),
        confidence: 0.75,
        reasoning: `Produit sélectionné en fonction de l'intérêt principal "${primaryInterest}" et adapté au budget de ${budget}€.`,
        category: product.category,
        alternatives: [
          `Version similaire dans la même gamme`,
          `Alternative d'une autre marque reconnue`
        ],
        purchaseLinks: [
          `${product.title} Amazon`,
          `${product.title} prix comparateur`
        ]
      }));
    };

    console.log('Calling OpenAI API for gift suggestions...');

    let suggestions: GiftSuggestion[] | null = null;

    if (!openAIApiKey) {
      console.warn('OPENAI_API_KEY non configurée. Utilisation du fallback local.');
      suggestions = createFallbackSuggestions();
    } else {
      try {
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
            max_completion_tokens: 1200,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('OpenAI API error:', errorData);
          suggestions = createFallbackSuggestions();
        } else {
          const data = await response.json();
          const aiResponse = data.choices?.[0]?.message?.content ?? '';
          console.log('OpenAI response:', aiResponse);

          try {
            const parsed = JSON.parse(aiResponse);
            suggestions = parsed.suggestions;
          } catch (parseError) {
            console.error('Failed to parse AI response, using fallback:', parseError);
            suggestions = createFallbackSuggestions();
          }
        }
      } catch (e) {
        console.error('Erreur d'appel OpenAI, utilisation du fallback:', e);
        suggestions = createFallbackSuggestions();
      }
    }

    // Validate suggestions
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestions = createFallbackSuggestions();
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