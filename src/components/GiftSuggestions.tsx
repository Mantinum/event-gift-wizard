import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Lightbulb, Euro, Star, ShoppingCart, Wand2 } from 'lucide-react';
import { useGiftSuggestions, GiftSuggestion } from '@/hooks/useGiftSuggestions';
import { Person } from '@/types';
import { EVENT_TYPES } from '@/types';

interface GiftSuggestionsProps {
  persons: Person[];
}

const GiftSuggestions = ({ persons }: GiftSuggestionsProps) => {
  const { suggestions, loading, error, generateSuggestions, clearSuggestions } = useGiftSuggestions();
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [budget, setBudget] = useState(100);
  const [additionalContext, setAdditionalContext] = useState('');

  const selectedPerson = persons.find(p => p.id === selectedPersonId);

  const handleGenerateSuggestions = async () => {
    if (!selectedPersonId || !selectedEventType) {
      return;
    }

    await generateSuggestions({
      personId: selectedPersonId,
      eventType: selectedEventType,
      budget,
      additionalContext
    });
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

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Générateur IA de suggestions de cadeaux
          </CardTitle>
          <CardDescription>
            Laissez notre IA analyser les profils et générer des suggestions de cadeaux personnalisées
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="person-select">Personne</Label>
              <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une personne" />
                </SelectTrigger>
                <SelectContent>
                  {persons.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} ({person.relationship})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-select">Type d'événement</Label>
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un événement" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((eventType) => (
                    <SelectItem key={eventType.value} value={eventType.value}>
                      {eventType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget maximum: {budget}€</Label>
            <input
              type="range"
              id="budget"
              min="10"
              max="500"
              step="10"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-sm text-muted-foreground">
              Budget flexible entre 10€ et 500€
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Contexte additionnel (optionnel)</Label>
            <Textarea
              id="context"
              placeholder="ex: Pour fêter une promotion, aime les objets vintage, allergique aux parfums..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
            />
          </div>

          {selectedPerson && (
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Profil sélectionné :</h4>
              <div className="text-sm space-y-1">
                <p><strong>Intérêts :</strong> {selectedPerson.interests.join(', ')}</p>
                <p><strong>Relation :</strong> {selectedPerson.relationship}</p>
                <p><strong>Budget habituel :</strong> {selectedPerson.budget}€</p>
                {selectedPerson.notes && (
                  <p><strong>Notes :</strong> {selectedPerson.notes}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleGenerateSuggestions}
              disabled={!selectedPersonId || !selectedEventType || loading}
              className="bg-gradient-primary text-white shadow-elegant hover:shadow-glow"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer des suggestions IA
                </>
              )}
            </Button>
            
            {suggestions.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearSuggestions}>
                  Effacer les suggestions
                </Button>
                <Button
                  onClick={handleGenerateSuggestions}
                  disabled={loading}
                  variant="outline"
                  className="hover:bg-primary hover:text-white transition-colors"
                >
                  {loading ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Régénération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Régénérer
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-destructive">
              <strong>Erreur :</strong> {error}
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold">
              Suggestions IA pour {selectedPerson?.name}
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
                
                <CardDescription>
                  {suggestion.description}
                </CardDescription>
                
                {/* Amazon data enrichment */}
                {suggestion.amazonData && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {suggestion.amazonData.rating && (
                      <Badge variant="secondary" className="text-xs">
                        ⭐ {suggestion.amazonData.rating}/5
                        {suggestion.amazonData.reviewCount && ` (${suggestion.amazonData.reviewCount} avis)`}
                      </Badge>
                    )}
                    {suggestion.amazonData.prime && (
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                        Prime ✓
                      </Badge>
                    )}
                    {suggestion.amazonData.availability && suggestion.amazonData.availability !== 'Unknown' && (
                      <Badge variant={suggestion.amazonData.availability.toLowerCase().includes('stock') ? 'default' : 'destructive'} className="text-xs">
                        {suggestion.amazonData.availability}
                      </Badge>
                    )}
                    {suggestion.amazonData.actualPrice && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                        Prix réel: {suggestion.amazonData.actualPrice}€
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Product image */}
                {suggestion.amazonData?.imageUrl && (
                  <div className="mt-3">
                    <img 
                      src={suggestion.amazonData.imageUrl} 
                      alt={suggestion.title}
                      className="w-24 h-24 object-contain rounded-md border border-border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <h5 className="font-medium mb-2 text-sm">Pourquoi c'est un bon choix :</h5>
                    <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {/* Badge de type de match */}
                    {suggestion.amazonData?.matchType === 'exact' && (
                      <div className="w-full mb-2">
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          ✅ Produit exact trouvé sur Amazon
                        </span>
                      </div>
                    )}
                    {suggestion.amazonData?.matchType === 'relaxed' && (
                      <div className="w-full mb-2">
                        <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                          🔍 Produit similaire trouvé sur Amazon
                        </span>
                      </div>
                    )}
                    {suggestion.amazonData?.matchType === 'search' && (
                      <div className="w-full mb-2">
                        <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
                          🔍 Recherche Amazon disponible
                        </span>
                      </div>
                    )}
                    
                    {/* Boutons Amazon */}
                    {suggestion.amazonData?.productUrl ? (
                      <>
                        <Button 
                          onClick={() => window.open(suggestion.amazonData?.productUrl, '_blank')}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Voir sur Amazon
                        </Button>
                        
                        {suggestion.amazonData?.addToCartUrl && (
                          <Button 
                            onClick={() => window.open(suggestion.amazonData?.addToCartUrl, '_blank')}
                            variant="default"
                            size="sm" 
                            className="text-xs bg-gradient-primary text-white"
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Ajouter au panier
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button 
                        onClick={() => {
                          const url = suggestion.amazonData?.searchUrl || 
                                     `https://www.amazon.fr/s?k=${encodeURIComponent(suggestion.title)}`;
                          window.open(url, '_blank');
                        }}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Rechercher sur Amazon
                      </Button>
                    )}
                  </div>

                  {suggestion.alternatives.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2 text-sm">Alternatives :</h5>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {suggestion.alternatives.map((alt, altIndex) => (
                          <li key={altIndex} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                            {alt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Liens d'achat supplémentaires (non-Amazon) */}
                  {suggestion.purchaseLinks.filter(link => 
                    !link.includes('amazon.fr/dp/') && 
                    !link.includes('amazon.fr/gp/aws/cart/add') &&
                    !link.includes('amazon.fr/s?k=')
                  ).length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2 text-sm">Autres boutiques :</h5>
                      <div className="flex flex-wrap gap-2">
                        {suggestion.purchaseLinks
                          .filter(link => 
                            !link.includes('amazon.fr/dp/') && 
                            !link.includes('amazon.fr/gp/aws/cart/add') &&
                            !link.includes('amazon.fr/s?k=')
                          )
                          .map((link, linkIndex) => (
                            <Button
                              key={linkIndex}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => window.open(link, '_blank')}
                            >
                              {link.includes('galerieslafayette') ? 'Galeries Lafayette' :
                               link.includes('madeindesign') ? 'Made in Design' :
                               link.includes('lightonline') ? 'Light Online' :
                               link.includes('swarovski') ? 'Swarovski' :
                               link.includes('diptyqueparis') ? 'Diptyque' :
                               link.includes('nocibe') ? 'Nocibé' :
                               'Voir le produit'}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GiftSuggestions;