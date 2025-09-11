import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Clock, 
  Euro, 
  Calendar,
  Loader2,
  Gift,
  ShoppingCart
} from 'lucide-react';
import { Event, Person } from '@/types';
import { useGiftSuggestions, GiftSuggestion } from '@/hooks/useGiftSuggestions';
import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

interface AutoGiftSuggestionsProps {
  events: Event[];
  persons: Person[];
}

const AutoGiftSuggestions = ({ events, persons }: AutoGiftSuggestionsProps) => {
  const { suggestions, loading, generateSuggestions } = useGiftSuggestions();
  const [generatedForEvent, setGeneratedForEvent] = useState<string | null>(null);

  // Filtrer les événements à venir dans les 30 prochains jours
  const upcomingEvents = events
    .filter(event => {
      const eventDate = parseISO(event.date);
      const daysUntil = differenceInCalendarDays(startOfDay(eventDate), startOfDay(new Date()));
      return daysUntil >= 0 && daysUntil <= 30;
    })
    .sort((a, b) => differenceInCalendarDays(startOfDay(parseISO(a.date)), startOfDay(new Date())) - differenceInCalendarDays(startOfDay(parseISO(b.date)), startOfDay(new Date())));

  const handleGenerateSuggestions = async (event: Event) => {
    const person = persons.find(p => p.id === event.personId);
    if (!person) return;

    setGeneratedForEvent(event.id);
    await generateSuggestions({
      personId: person.id,
      eventType: event.type,
      budget: event.budget,
      additionalContext: `Événement: ${event.title} le ${new Date(event.date).toLocaleDateString('fr-FR')}`
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-success';
    if (confidence >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getDaysUntilColor = (days: number) => {
    if (days <= 7) return 'text-destructive';
    if (days <= 14) return 'text-warning';
    return 'text-muted-foreground';
  };

  // Normalize confidence to a percentage (0-100)
  const normalizeConfidence = (c: number) => (c > 1 ? Math.round(c) : Math.round(c * 100));

  if (upcomingEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Aucun événement à venir</h3>
        <p className="text-muted-foreground">
          Les suggestions IA apparaîtront automatiquement pour les événements des 30 prochains jours
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcomingEvents.map((event) => {
        const person = persons.find(p => p.id === event.personId);
        const daysUntil = differenceInCalendarDays(startOfDay(parseISO(event.date)), startOfDay(new Date()));
        const hasGeneratedSuggestions = generatedForEvent === event.id && suggestions.length > 0;
        
        return (
          <Card 
            key={event.id} 
            className={`border-l-4 transition-all duration-300 hover:shadow-elegant ${
              daysUntil <= 7 ? 'border-l-destructive bg-destructive/5' :
              daysUntil <= 14 ? 'border-l-warning bg-warning/5' :
              'border-l-primary bg-primary/5'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-foreground">{event.title}</h4>
                    {person && (
                      <Badge variant="outline" className="text-xs">
                        {person.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span className={getDaysUntilColor(daysUntil)}>
                        {daysUntil === 0 ? "Aujourd'hui" : 
                         daysUntil === 1 ? "Demain" : 
                         `Dans ${daysUntil} jours`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Euro className="h-3 w-3" />
                      <span>{event.budget}€</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(event.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
                
                {!hasGeneratedSuggestions ? (
                  <Button
                    onClick={() => handleGenerateSuggestions(event)}
                    disabled={loading}
                    size="sm"
                    className="bg-gradient-primary text-white hover:shadow-glow transition-all duration-300"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Générer des idées IA
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleGenerateSuggestions(event)}
                    disabled={loading}
                    size="sm"
                    variant="outline"
                    className="hover:bg-primary hover:text-white transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Régénérer
                  </Button>
                )}
              </div>

              {hasGeneratedSuggestions && (
                <div className="space-y-3 mt-3">
                  <div className="text-sm font-medium text-foreground mb-3">
                    {suggestions.length} suggestions générées :
                  </div>
                  {suggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      className="border border-border rounded-lg p-3 bg-card"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-foreground">{suggestion.title}</h5>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.category}
                          </Badge>
                          <span className={`text-xs font-medium ${getConfidenceColor(normalizeConfidence(suggestion.confidence))}`}>
                            {normalizeConfidence(suggestion.confidence)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {suggestion.description}
                      </p>
                      
                      {/* Amazon data enrichment */}
                      {suggestion.amazonData && (
                        <div className="flex flex-wrap gap-2 mb-2">
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
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-success">~{suggestion.estimatedPrice}€</span>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const q = encodeURIComponent(suggestion.title);
                              window.open(`https://www.google.com/search?q=${q}+acheter+prix`, '_blank');
                            }}
                            className="text-xs"
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Google Shopping
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const q = encodeURIComponent(suggestion.title);
                              window.open(`https://www.amazon.fr/s?k=${q}`, '_blank');
                            }}
                            className="text-xs"
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Amazon
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const q = encodeURIComponent(suggestion.title);
                              window.open(`https://www.fnac.com/SearchResult/ResultList.aspx?Search=${q}`, '_blank');
                            }}
                            className="text-xs"
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Fnac
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AutoGiftSuggestions;