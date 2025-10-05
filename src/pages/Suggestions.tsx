import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StepIndicator } from '@/components/StepIndicator';
import { useGiftSuggestions } from '@/hooks/useGiftSuggestions';
import { ArrowLeft, Sparkles, ShoppingCart, Star, Euro, Calendar, Lightbulb, ArrowRight } from 'lucide-react';

const Suggestions = () => {
  const navigate = useNavigate();
  const [budget, setBudget] = useState(100);
  const [hasGenerated, setHasGenerated] = useState(false);
  const { suggestions, loading, error, generateSuggestions } = useGiftSuggestions();

  const name = sessionStorage.getItem('onboarding-name') || '';
  const relationship = sessionStorage.getItem('onboarding-relationship') || '';
  const birthday = sessionStorage.getItem('onboarding-birthday') || '';
  const gender = sessionStorage.getItem('onboarding-gender') || '';
  const interests = JSON.parse(sessionStorage.getItem('onboarding-interests') || '[]');

  useEffect(() => {
    // Auto-generate suggestions when component mounts
    if (name && relationship && interests.length > 0 && !hasGenerated) {
      generateSuggestions({
        personId: 'onboarding-temp', // Temporary ID for onboarding
        eventType: 'birthday',
        budget,
        additionalContext: `Nom: ${name}, Relation: ${relationship}, Sexe: ${gender}, Intérêts: ${interests.join(', ')}`
      }).then(() => setHasGenerated(true));
    }
  }, []);

  const handleBack = () => {
    navigate('/preferences');
  };

  const handleCreateAccount = () => {
    // Clear onboarding data and redirect to auth
    sessionStorage.removeItem('onboarding-name');
    sessionStorage.removeItem('onboarding-relationship');
    sessionStorage.removeItem('onboarding-birthday');
    sessionStorage.removeItem('onboarding-interests');
    navigate('/auth');
  };

  const handleRegenerateSuggestions = () => {
    if (name && relationship && interests.length > 0) {
      generateSuggestions({
        personId: 'onboarding-temp',
        eventType: 'birthday',
        budget,
        additionalContext: `Nom: ${name}, Relation: ${relationship}, Sexe: ${gender}, Intérêts: ${interests.join(', ')}`
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-success';
    if (confidence >= 0.6) return 'bg-warning';
    return 'bg-muted';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'Excellent match';
    if (confidence >= 0.6) return 'Bon choix';
    return 'À considérer';
  };

  // --- Helpers liens Amazon ---
  const PARTNER_TAG = 'cadofy-21'; // ou process.env.VITE_AMZ_TAG si tu préfères

  const withAffiliate = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname.endsWith('amazon.fr')) {
        u.searchParams.set('tag', PARTNER_TAG);
        // optionnel : limiter le bruit
        const keep = new Set(['tag', 'language']);
        [...u.searchParams.keys()].forEach(k => { if (!keep.has(k)) u.searchParams.delete(k); });
      }
      return u.toString();
    } catch { return url; }
  };

  const pickAmazonLink = (s: any) => {
    // 1) lien produit direct fourni par l'enrichissement
    if (s?.amazonData?.productUrl) return withAffiliate(s.amazonData.productUrl);
    // 2) si on a l'ASIN, fabrique l'URL canonique
    if (s?.amazonData?.asin) return withAffiliate(`https://www.amazon.fr/dp/${s.amazonData.asin}`);
    // 3) sinon, fouille dans purchaseLinks pour un vrai /dp/
    const links = (s?.purchaseLinks || []).filter((l: string) => /amazon\.fr/.test(l));
    const dp = links.find((l: string) => /\/dp\/[A-Z0-9]{10}/i.test(l));
    if (dp) return withAffiliate(dp);
    // 4) à défaut, si le premier lien est une recherche mais qu'on a un productUrl, on le préfère
    const first = links[0];
    if (first && /\/s\?/.test(first) && s?.amazonData?.productUrl) return withAffiliate(s.amazonData.productUrl);
    // 5) dernier recours : recherche
    return first || `https://www.amazon.fr/s?k=${encodeURIComponent(s?.title || '')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Voici nos suggestions pour {name} ! 🎁
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Notre IA a analysé les goûts de votre {relationship.toLowerCase()} et trouvé ces idées cadeaux
          </p>
        </div>

        <StepIndicator 
          currentStep={4} 
          totalSteps={4} 
          stepTitles={['Qui ?', 'Anniversaire', 'Goûts', 'Suggestions']} 
        />

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Summary */}
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{name}</h3>
                  <p className="text-muted-foreground">{relationship}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {interests.slice(0, 4).map((interest: string) => (
                    <Badge key={interest} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                  {interests.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{interests.length - 4} autres
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget Display */}
          {hasGenerated && (
            <Card className="shadow-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-lg">Budget utilisé: {budget}€</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Créez un compte pour modifier le budget et générer de nouvelles suggestions
                    </p>
                  </div>
                  <Button 
                    onClick={handleCreateAccount}
                    variant="default"
                    size="sm"
                    className="bg-primary"
                  >
                    Créer un compte
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-lg font-medium">Notre IA analyse les goûts de {name}...</p>
                <p className="text-muted-foreground mt-2">Cela peut prendre quelques secondes</p>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Alert className="border-destructive">
              <AlertDescription>
                <strong>Erreur :</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold">
                  {suggestions.length} suggestions personnalisées
                </h3>
              </div>

              {suggestions.map((suggestion, index) => (
                <Card key={index} className="shadow-card hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 mb-2">
                          <ShoppingCart className="w-4 h-4 text-primary" />
                          {suggestion.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.category}
                          </Badge>
                          <Badge 
                            className={`text-xs text-white ${getConfidenceColor(suggestion.confidence)}`}
                          >
                            <Star className="w-3 h-3 mr-1" />
                            {getConfidenceText(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Euro className="w-3 h-3 mr-1" />
                            ~{suggestion.estimatedPrice}€
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground">{suggestion.description}</p>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="bg-muted/30 p-3 rounded-lg mb-4">
                      <h5 className="font-medium mb-2 text-sm">Pourquoi c'est parfait pour {name} :</h5>
                      <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
                    </div>

                    <Button
                      onClick={() => {
                        const amazonLink = pickAmazonLink(suggestion);
                        window.open(amazonLink, '_blank', 'noopener,noreferrer');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Voir sur Amazon
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {/* Call to Action */}
              <Card className="shadow-elegant bg-gradient-card border-primary/20">
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-bold mb-4">🎉 Ces suggestions vous plaisent ?</h3>
                  <p className="text-muted-foreground mb-6 max-w-2xl mx-auto text-lg">
                    <strong>Créez votre compte gratuit</strong> pour sauvegarder {name}, 
                    recevoir des rappels d'anniversaire, générer des suggestions illimitées 
                    et accéder à toutes les fonctionnalités avancées !
                  </p>
                  <Alert className="mb-6 bg-primary/10 border-primary/30">
                    <AlertDescription className="text-center text-sm">
                      ⚠️ Sans compte, vous ne pourrez plus régénérer de suggestions (limite API atteinte)
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={handleCreateAccount}
                    size="lg"
                    className="bg-gradient-primary text-white px-8 py-4 text-lg shadow-elegant hover:shadow-glow hover:scale-105 transition-all duration-300"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Créer mon compte gratuitement
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              onClick={handleBack}
              variant="outline"
              size="lg"
              className="px-8 py-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Suggestions;