import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  MapPin, 
  Euro, 
  Gift,
  User,
  Clock,
  Edit,
  Trash2
} from 'lucide-react';
import { Event, Person, EVENT_TYPES } from '@/types';
import { format, parseISO, isBefore, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EventsListProps {
  events: Event[];
  persons: Person[];
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
}

const EventsList = ({ events, persons, onEditEvent, onDeleteEvent }: EventsListProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getEventTypeInfo = (type: string) => {
    return EVENT_TYPES.find(et => et.value === type) || EVENT_TYPES[0];
  };

  const getPerson = (personName: string) => {
    return persons.find(p => p.name === personName);
  };

  const getDaysUntilEvent = (eventDate: string) => {
    const today = new Date();
    const date = parseISO(eventDate);
    return differenceInDays(date, today);
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'text-muted-foreground'; // Passé
    if (daysUntil <= 7) return 'text-red-500'; // Urgent
    if (daysUntil <= 30) return 'text-orange-500'; // Bientôt
    return 'text-green-500'; // Plus tard
  };

  const getUrgencyText = (daysUntil: number) => {
    if (daysUntil < 0) return `Il y a ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''}`;
    if (daysUntil === 0) return "Aujourd'hui";
    if (daysUntil === 1) return "Demain";
    return `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`;
  };

  if (events.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center">
          <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Aucun événement trouvé
          </h3>
          <p className="text-sm text-muted-foreground">
            Essayez de modifier vos filtres ou d'ajouter un nouvel événement.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map(event => {
        const eventTypeInfo = getEventTypeInfo(event.type);
        const person = getPerson(event.person);
        const daysUntil = getDaysUntilEvent(event.date);
        
        return (
          <Card key={event.id} className="shadow-card hover:shadow-elegant transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  
                  {/* Avatar de la personne */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={person?.avatar} alt={event.person} />
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {event.person.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Informations principales */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold truncate">{event.title}</h3>
                      <Badge 
                        className={`${eventTypeInfo.color} text-white`}
                      >
                        {eventTypeInfo.label}
                      </Badge>
                      {daysUntil >= 0 && (
                        <Badge 
                          variant="outline" 
                          className={`border-current ${getUrgencyColor(daysUntil)}`}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {getUrgencyText(daysUntil)}
                        </Badge>
                      )}
                    </div>

                    {/* Détails de l'événement */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{event.person}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(parseISO(event.date), 'dd MMMM yyyy', { locale: fr })}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Euro className="h-4 w-4" />
                        <span className="font-medium text-primary">
                          {formatCurrency(event.budget)}
                        </span>
                      </div>
                    </div>

                    {/* Localisation si disponible */}
                    {event.location && (
                      <div className="flex items-center space-x-2 mt-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    )}

                    {/* Description si disponible */}
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {/* Intérêts de la personne */}
                    {person?.interests && person.interests.length > 0 && (
                      <div className="flex items-center space-x-2 mt-3">
                        <span className="text-xs text-muted-foreground">Intérêts:</span>
                        <div className="flex flex-wrap gap-1">
                          {person.interests.slice(0, 3).map(interest => (
                            <Badge key={interest} variant="secondary" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                          {person.interests.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{person.interests.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  {onEditEvent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditEvent(event)}
                      className="hover:bg-primary/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDeleteEvent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteEvent(event.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default EventsList;