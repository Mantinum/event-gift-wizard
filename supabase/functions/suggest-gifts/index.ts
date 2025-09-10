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
      throw new Error('Personne non trouvee');
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
      gender: person.gender || 'Non spécifié',
      interests: person.interests || [],
      relationship: person.relationship,
      preferredCategories: person.preferred_categories || [],
      notes: person.notes || '',
      lastGift: person.last_gift || '',
      recentEvents: events || []
    };

    // Generate AI suggestions using OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    const systemPrompt = `Tu es un expert en suggestions de cadeaux personnalises avec acces aux catalogues produits.
    Analyse le profil de la personne et genere 3 suggestions de PRODUITS CONCRETS avec noms de marques, modeles et references precises.
    
    CONTRAINTE BUDGET: toutes les suggestions doivent respecter STRICTEMENT le budget (prix <= budget).
    Si un produit depasse le budget, propose automatiquement une alternative moins chere (variante, capacite inferieure, gamme precedente) qui rentre dans le budget.
    
    CONTRAINTE DIVERSITE: Les 3 suggestions DOIVENT etre dans des categories DIFFERENTES pour offrir de la variete.
    Exemples de categories diverses : Tech/Audio, Mode/Accessoires, Maison/Deco, Sport/Fitness, Lecture/Culture, Cuisine/Gastronomie, Jeux/Loisirs, Bien-etre/Beaute.
    
    VARIATION: Pour eviter de toujours proposer les memes produits, utilise ce timestamp comme source de variation : ${Date.now()}
    Explore differentes marques et gammes de produits selon les interets de la personne.
    
    IMPORTANT: 
    - Propose des PRODUITS REELS avec marques et modeles specifiques (ex: "iPhone 15 Pro 128GB", "Casque Sony WH-1000XM5", "Montre Apple Watch Series 9")
    - Evite les descriptions vagues comme "une activite memorable" ou "un objet utile"
    - Donne des noms de produits que l'on peut rechercher directement sur Amazon ou autres sites
    - Inclus des alternatives concretes avec marques et modeles
    - VARIE les suggestions meme pour la meme personne en explorant tous ses centres d'interet
    
    Reponds UNIQUEMENT avec un JSON valide contenant un array "suggestions" avec 3 objets ayant cette structure exacte :
    {
      "suggestions": [
        {
          "title": "Marque + Modele precis du produit",
          "description": "Description detaillee du produit avec ses specificites",
          "estimatedPrice": prix_en_euros_nombre,
          "confidence": score_0_a_1,
          "reasoning": "Pourquoi ce produit est parfait pour cette personne et respecte le budget",
          "category": "Categorie du produit", 
          "alternatives": ["Marque + Modele alternatif 1", "Marque + Modele alternatif 2"],
          "purchaseLinks": ["Recherche Amazon exacte", "Recherche Google Shopping exacte"]
        }
      ]
    }`;

    const userPrompt = `
    PROFIL DE LA PERSONNE :
    - Nom : ${personContext.name}
    - Age : ${personContext.age} ans
    - Sexe : ${personContext.gender}
    - Relation : ${personContext.relationship}
    - Centres d'interet : ${personContext.interests.join(', ')}
    - Categories preferees : ${personContext.preferredCategories.join(', ')}
    - Notes personnelles : ${personContext.notes}
    - Dernier cadeau offert : ${personContext.lastGift}
    
    CONTEXTE DE L'EVENEMENT :
    - Type d'evenement : ${eventType}
    - Budget maximum : ${budget}€
    - Contexte additionnel : ${additionalContext || 'Aucun'}
    
    HISTORIQUE RECENT :
    ${personContext.recentEvents.map(e => `- ${e.title} (${e.date})`).join('\n')}
    
    Genere 3 PRODUITS CONCRETS dans des CATEGORIES DIFFERENTES dans le budget de ${budget}€.
    IMPORTANT: Varie les categories pour offrir de la diversite (ex: une suggestion tech, une suggestion mode, une suggestion loisir).
    IMPORTANT: Tiens compte du sexe de la personne pour adapter les suggestions (couleurs, styles, preferences typiques).
    
    Exemple de format attendu :
    - "Casque Bose QuietComfort 45" plutot que "un casque audio de qualite"  
    - "Kindle Paperwhite 11e generation 16GB" plutot que "une liseuse electronique"
    - "Montre Garmin Forerunner 255" plutot que "une montre connectee"
    
    EXPLORE TOUS LES INTERETS de la personne pour proposer des categories variees.
    
    Pour les purchaseLinks, utilise des termes de recherche precis comme "Casque Bose QuietComfort 45 Amazon" ou "Kindle Paperwhite 16GB prix".
    `;

    // Helper: deterministic fallback when OpenAI is unavailable (quota/key/errors)
    const createFallbackSuggestions = (): GiftSuggestion[] => {
      // Viser 85% à 100% du budget
      const minTarget = Math.min(budget, Math.max(10, Math.round(budget * 0.85)));
      const targets = [minTarget, Math.round((minTarget + budget) / 2), budget];

      // 3 catégories variées
      const templates: Array<{ title: string; description: string; category: string }>[] = [
        [
          { title: 'Casque Bose QuietComfort 45', description: 'Casque Bluetooth à réduction de bruit active', category: 'Audio' },
          { title: 'Casque Sony WH-1000XM4', description: 'Casque premium ANC, idéal pour la musique et le télétravail', category: 'Audio' },
        ],
        [
          { title: 'Kindle Paperwhite 11e génération 16GB', description: 'Liseuse étanche avec éclairage réglable', category: 'Lecture' },
          { title: 'Kobo Clara 2E', description: 'Liseuse compacte et légère, très confortable', category: 'Lecture' },
        ],
        [
          { title: 'Garmin Forerunner 55', description: 'Montre GPS course à pied avec coaching', category: 'Fitness' },
          { title: 'Fitbit Charge 6', description: 'Tracker d’activité complet, cardio et sommeil', category: 'Fitness' },
        ],
      ];

      // Sélectionner un élément par catégorie en variant selon la seed
      const seed = Date.now();
      const picks = templates.map((cat, i) => cat[seed % 2]);

      return picks.map((p, i) => ({
        title: p.title,
        description: p.description,
        estimatedPrice: targets[Math.min(i, targets.length - 1)],
        confidence: 0.8,
        reasoning: `Suggestion fallback alignée sur le budget (${minTarget}€ - ${budget}€) et catégorie variée`,
        category: p.category,
        alternatives: [
          'Variante de la même gamme',
          "Modèle précédent pour ajuster le prix",
        ],
        purchaseLinks: [
          `${p.title} Amazon`,
          `${p.title} prix comparateur`,
        ],
      }));
    };

    console.log('Calling OpenAI API for gift suggestions...');

    let suggestions: GiftSuggestion[] | null = null;

    if (!openAIApiKey) {
      console.warn('OPENAI_API_KEY non configuree. Utilisation du fallback local.');
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
        console.error('Erreur d\'appel OpenAI, utilisation du fallback:', e);
        suggestions = createFallbackSuggestions();
      }
    }

    // Validate and enforce budget with 85%-100% range
    const enforceBudget = (suggs: GiftSuggestion[] | null | undefined, max: number): GiftSuggestion[] => {
      const min = Math.min(max, Math.max(10, Math.round(max * 0.85)));
      const safe = Array.isArray(suggs) ? suggs : [];
      return safe
        .map((s) => {
          let price = typeof s.estimatedPrice === 'number' && isFinite(s.estimatedPrice)
            ? Math.round(s.estimatedPrice)
            : min;
          price = Math.min(max, Math.max(min, price));
          return { ...s, estimatedPrice: price };
        })
        .filter((s) => s.estimatedPrice <= max);
    };

    suggestions = enforceBudget(suggestions, budget);
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
      error: error.message || 'Une erreur est survenue lors de la generation des suggestions' 
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