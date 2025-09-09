import { Person, Event, UpcomingPurchase } from '@/types';

interface GiftSuggestion {
  name: string;
  description: string;
  confidence: number;
  reasoning: string;
  priceRange: string;
  category: string;
}

// Base de données de suggestions par catégorie d'intérêt
const INTEREST_GIFTS: Record<string, GiftSuggestion[]> = {
  'Sport': [
    { name: 'Montre fitness connectée', description: 'Suivi activité et santé', confidence: 85, reasoning: 'Parfait pour le suivi sportif quotidien', priceRange: '€€€', category: 'Tech' },
    { name: 'Tenue de sport premium', description: 'Vêtements techniques respirants', confidence: 80, reasoning: 'Toujours utile pour la pratique sportive', priceRange: '€€', category: 'Vêtements' },
    { name: 'Accessoires récupération', description: 'Rouleau massage, bandes', confidence: 75, reasoning: 'Aide à la récupération musculaire', priceRange: '€', category: 'Bien-être' },
  ],
  'Lecture': [
    { name: 'Liseuse électronique', description: 'Kindle ou équivalent avec éclairage', confidence: 90, reasoning: 'Révolutionne l\'expérience de lecture', priceRange: '€€€', category: 'Tech' },
    { name: 'Coffret livres thématique', description: 'Sélection selon ses goûts littéraires', confidence: 85, reasoning: 'Découverte de nouveaux auteurs', priceRange: '€€', category: 'Culture' },
    { name: 'Lampe de lecture design', description: 'Éclairage optimal pour lire', confidence: 70, reasoning: 'Améliore le confort de lecture', priceRange: '€', category: 'Maison' },
  ],
  'Cuisine': [
    { name: 'Robot culinaire multifonction', description: 'Thermomix ou équivalent', confidence: 88, reasoning: 'Révolutionne la cuisine quotidienne', priceRange: '€€€€', category: 'Électroménager' },
    { name: 'Couteaux de chef professionnels', description: 'Set de couteaux japonais', confidence: 82, reasoning: 'Outils essentiels pour bien cuisiner', priceRange: '€€€', category: 'Ustensiles' },
    { name: 'Cours de cuisine avec chef', description: 'Expérience culinaire unique', confidence: 75, reasoning: 'Apprentissage avec un professionnel', priceRange: '€€€', category: 'Expérience' },
  ],
  'Voyage': [
    { name: 'Valise cabine premium', description: 'Ultra-légère avec roulettes 360°', confidence: 85, reasoning: 'Indispensable pour les voyageurs fréquents', priceRange: '€€€', category: 'Bagages' },
    { name: 'Appareil photo compact', description: 'Pour immortaliser les voyages', confidence: 80, reasoning: 'Capture les plus beaux moments', priceRange: '€€€', category: 'Tech' },
    { name: 'Guide voyage personnalisé', description: 'Destination de rêve', confidence: 70, reasoning: 'Inspiration pour le prochain voyage', priceRange: '€', category: 'Livres' },
  ],
  'Musique': [
    { name: 'Casque audio haute qualité', description: 'Sony, Bose ou équivalent', confidence: 90, reasoning: 'Expérience musicale immersive', priceRange: '€€€', category: 'Audio' },
    { name: 'Vinyles d\'artistes préférés', description: 'Collection vintage ou rééditions', confidence: 85, reasoning: 'Redécouverte de la musique analogique', priceRange: '€€', category: 'Collection' },
    { name: 'Cours d\'instrument', description: 'Guitare, piano selon préférence', confidence: 75, reasoning: 'Développement artistique personnel', priceRange: '€€€', category: 'Cours' },
  ],
  'Tech': [
    { name: 'Dernière tablette tactile', description: 'iPad ou équivalent Android', confidence: 88, reasoning: 'Polyvalence pour travail et loisirs', priceRange: '€€€€', category: 'Informatique' },
    { name: 'Accessoires tech innovants', description: 'Gadgets connectés tendance', confidence: 80, reasoning: 'Toujours curieux des nouveautés', priceRange: '€€', category: 'Gadgets' },
    { name: 'Abonnement services premium', description: 'Cloud, streaming, logiciels', confidence: 70, reasoning: 'Services utiles au quotidien', priceRange: '€', category: 'Services' },
  ],
  'Art': [
    { name: 'Matériel artistique professionnel', description: 'Pinceaux, couleurs, toiles', confidence: 85, reasoning: 'Outils de qualité pour créer', priceRange: '€€€', category: 'Fournitures' },
    { name: 'Atelier avec artiste local', description: 'Cours de peinture ou sculpture', confidence: 80, reasoning: 'Apprentissage avec un professionnel', priceRange: '€€€', category: 'Expérience' },
    { name: 'Livre d\'art de référence', description: 'Monographie d\'un grand maître', confidence: 75, reasoning: 'Source d\'inspiration artistique', priceRange: '€€', category: 'Livres' },
  ]
};

// Suggestions par type d'événement
const EVENT_GIFTS: Record<string, GiftSuggestion[]> = {
  'birthday': [
    { name: 'Expérience personnalisée', description: 'Selon ses passions', confidence: 80, reasoning: 'Les souvenirs valent plus que les objets', priceRange: '€€€', category: 'Expérience' },
    { name: 'Bijou personnalisé', description: 'Gravure avec message personnel', confidence: 75, reasoning: 'Cadeau unique et mémorable', priceRange: '€€€', category: 'Bijoux' },
  ],
  'wedding': [
    { name: 'Coffret dégustation vins', description: 'Sélection de grands crus', confidence: 85, reasoning: 'Parfait pour célébrer à deux', priceRange: '€€€€', category: 'Gastronomie' },
    { name: 'Objet déco maison design', description: 'Pour leur nouveau foyer', confidence: 80, reasoning: 'Utile pour décorer leur intérieur', priceRange: '€€€', category: 'Décoration' },
  ],
  'christmas': [
    { name: 'Coffret gourmand artisanal', description: 'Spécialités régionales', confidence: 75, reasoning: 'L\'esprit convivial de Noël', priceRange: '€€', category: 'Gastronomie' },
    { name: 'Livre ou BD collector', description: 'Edition limitée ou dédicacée', confidence: 70, reasoning: 'Parfait pour les fêtes cocooning', priceRange: '€€', category: 'Culture' },
  ]
};

// Analyse le profil et génère des suggestions intelligentes
export const generateSmartGiftSuggestions = (person: Person, event: Event): UpcomingPurchase => {
  const suggestions: GiftSuggestion[] = [];
  const confidence_factors: number[] = [];
  
  // Analyse des centres d'intérêt (poids: 60%)
  person.interests.forEach(interest => {
    if (INTEREST_GIFTS[interest]) {
      const interestSuggestions = INTEREST_GIFTS[interest].filter(
        suggestion => matchesBudget(suggestion.priceRange, event.budget)
      );
      suggestions.push(...interestSuggestions);
      confidence_factors.push(0.6);
    }
  });

  // Analyse du type d'événement (poids: 30%)
  if (EVENT_GIFTS[event.type]) {
    const eventSuggestions = EVENT_GIFTS[event.type].filter(
      suggestion => matchesBudget(suggestion.priceRange, event.budget)
    );
    suggestions.push(...eventSuggestions);
    confidence_factors.push(0.3);
  }

  // Sélection de la meilleure suggestion
  const bestSuggestion = suggestions.length > 0 
    ? suggestions.reduce((best, current) => current.confidence > best.confidence ? current : best)
    : generateFallbackSuggestion(event.budget, event.type);

  // Calcul de la confiance globale
  const baseConfidence = bestSuggestion.confidence;
  let adjustedConfidence = baseConfidence;

  // Bonus si plusieurs intérêts correspondent
  if (person.interests.length > 2) adjustedConfidence += 5;
  
  // Bonus si on a des notes personnelles
  if (person.notes && person.notes.length > 20) adjustedConfidence += 3;
  
  // Ajustement selon le budget
  if (event.budget >= 100) adjustedConfidence += 2;
  if (event.budget <= 30) adjustedConfidence -= 5;

  // Limitation à 95% max (l'IA n'est jamais sûre à 100%)
  adjustedConfidence = Math.min(adjustedConfidence, 95);

  // Génération d'alternatives
  const alternatives = suggestions
    .filter(s => s.name !== bestSuggestion.name)
    .slice(0, 2)
    .map(s => s.name);

  const today = new Date();
  const eventDate = new Date(event.date);
  const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

  return {
    id: `ai-purchase-${event.id}`,
    personName: event.person,
    personId: event.personId,
    eventTitle: event.title,
    eventId: event.id,
    daysUntil,
    budget: event.budget,
    suggestedGift: bestSuggestion.name,
    confidence: adjustedConfidence,
    status: daysUntil <= 3 ? 'reviewing' : 'pending',
    alternativeGifts: alternatives,
    aiReasoning: generateDetailedReasoning(person, event, bestSuggestion)
  };
};

// Vérifie si le prix correspond au budget
const matchesBudget = (priceRange: string, budget: number): boolean => {
  switch (priceRange) {
    case '€': return budget >= 10 && budget <= 50;
    case '€€': return budget >= 30 && budget <= 100;
    case '€€€': return budget >= 80 && budget <= 300;
    case '€€€€': return budget >= 200;
    default: return true;
  }
};

// Génère une suggestion de secours
const generateFallbackSuggestion = (budget: number, eventType: string): GiftSuggestion => {
  if (budget <= 30) {
    return {
      name: 'Carte cadeau personnalisée',
      description: 'Liberté de choix avec message personnel',
      confidence: 60,
      reasoning: 'Valeur sûre quand on connaît peu la personne',
      priceRange: '€',
      category: 'Générique'
    };
  } else if (budget <= 100) {
    return {
      name: 'Coffret bien-être',
      description: 'Produits de soin et relaxation',
      confidence: 65,
      reasoning: 'Apprécié par la plupart des personnes',
      priceRange: '€€',
      category: 'Bien-être'
    };
  } else {
    return {
      name: 'Expérience découverte',
      description: 'Atelier, dégustation ou sortie culturelle',
      confidence: 70,
      reasoning: 'Les expériences marquent plus que les objets',
      priceRange: '€€€',
      category: 'Expérience'
    };
  }
};

// Génère un raisonnement détaillé
const generateDetailedReasoning = (person: Person, event: Event, suggestion: GiftSuggestion): string => {
  const reasons: string[] = [];
  
  // Analyse des intérêts
  const matchingInterests = person.interests.filter(interest => 
    INTEREST_GIFTS[interest]?.some(gift => gift.name === suggestion.name)
  );
  
  if (matchingInterests.length > 0) {
    reasons.push(`Correspond à ${matchingInterests.length > 1 ? 'ses passions' : 'sa passion'}: ${matchingInterests.join(', ')}`);
  }

  // Analyse du budget
  if (event.budget >= 100) {
    reasons.push('Budget généreux permettant un cadeau de qualité');
  } else if (event.budget <= 50) {
    reasons.push('Choix adapté au budget défini');
  }

  // Analyse de l'événement
  if (event.type === 'birthday') {
    reasons.push('Parfait pour un anniversaire personnel');
  } else if (event.type === 'wedding') {
    reasons.push('Idéal pour célébrer une union');
  }

  // Utilisation des notes si disponibles
  if (person.notes && person.notes.length > 10) {
    reasons.push('Tient compte de ses préférences notées');
  }

  return reasons.length > 0 
    ? `🎯 ${reasons.join(' • ')}`
    : `💡 Suggestion basée sur le type d'événement et le budget disponible`;
};

// Fonction principale pour générer les achats à venir avec IA
export const generateAIUpcomingPurchases = (events: Event[], persons: Person[]): UpcomingPurchase[] => {
  const today = new Date();
  
  return events
    .filter(event => {
      const eventDate = new Date(event.date);
      const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return daysUntil > 0 && daysUntil <= 30; // Événements dans les 30 prochains jours
    })
    .map(event => {
      const person = persons.find(p => p.id === event.personId);
      if (person) {
        return generateSmartGiftSuggestions(person, event);
      } else {
        // Fallback si la personne n'existe pas
        const today = new Date();
        const eventDate = new Date(event.date);
        const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        
        return {
          id: `fallback-${event.id}`,
          personName: event.person,
          personId: event.personId,
          eventTitle: event.title,
          eventId: event.id,
          daysUntil,
          budget: event.budget,
          suggestedGift: 'Carte cadeau universelle',
          confidence: 45,
          status: 'pending' as const,
          alternativeGifts: ['Coffret bien-être', 'Livre sur ses centres d\'intérêt'],
          aiReasoning: '⚠️ Profil incomplet - suggestion générique'
        };
      }
    });
};