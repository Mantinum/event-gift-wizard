import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, ChevronRight, Plus, Gift, User, Calendar as CalendarIcon, List, Grid3x3, Eye, Edit, Trash2, MapPin, Euro, Heart } from 'lucide-react';
import { Event, Person, EVENT_TYPES, getRelationshipColor } from '@/types';
import { useEventFilters } from '@/hooks/useEventFilters';
import SearchFilters from '@/components/SearchFilters';
import EventsList from '@/components/EventsList';
import PersonProfileViewModal from '@/components/PersonProfileViewModal';

// Event Popover Content Component
interface EventPopoverContentProps {
  event: Event;
  person?: Person;
  onViewProfile: (person: Person) => void;
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
}

const EventPopoverContent = ({ event, person, onViewProfile, onEditEvent, onDeleteEvent }: EventPopoverContentProps) => {
  const getEventTypeLabel = (type: string) => {
    const eventType = EVENT_TYPES.find(et => et.value === type);
    return eventType ? eventType.label : type;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Event Header */}
      <div>
        <h3 className="font-semibold text-lg text-foreground mb-1">{event.title}</h3>
        <Badge className={`text-xs ${EVENT_TYPES.find(et => et.value === event.type)?.color || 'bg-muted'} text-white`}>
          {getEventTypeLabel(event.type)}
        </Badge>
      </div>

      <Separator />

      {/* Event Details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <span>{formatDate(event.date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Euro className="w-4 h-4 text-muted-foreground" />
          <span>Budget: {event.budget}€</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{event.location}</span>
          </div>
        )}
        {event.description && (
          <div className="text-muted-foreground">
            <p>{event.description}</p>
          </div>
        )}
      </div>

      {/* Person Info */}
      {person && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={person.avatar} alt={person.name} />
                <AvatarFallback className="bg-gradient-primary text-white text-sm">
                  {getInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{person.name}</p>
                <Badge variant="outline" className={`text-xs ${getRelationshipColor(person.relationship)}`}>
                  <Heart className="w-3 h-3 mr-1" />
                  {person.relationship}
                </Badge>
              </div>
            </div>
            
            {person.interests.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Centres d'intérêt:</p>
                <div className="flex flex-wrap gap-1">
                  {person.interests.slice(0, 3).map((interest, index) => (
                    <Badge key={index} variant="outline" className="text-xs py-0 px-2">
                      {interest}
                    </Badge>
                  ))}
                  {person.interests.length > 3 && (
                    <Badge variant="outline" className="text-xs py-0 px-2">
                      +{person.interests.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      <Separator />
      <div className="flex gap-2">
        {person && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onViewProfile(person)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Voir le profil
          </Button>
        )}
        {onEditEvent && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onEditEvent(event)}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        )}
      </div>
    </div>
  );
};

interface CalendarProps {
  events: Event[];
  persons: Person[];
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
}

const Calendar = ({ events, persons, onEditEvent, onDeleteEvent }: CalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Use the event filters hook
  const {
    filters,
    filteredEvents,
    updateFilter,
    clearFilters,
    activeFiltersCount
  } = useEventFilters(events, persons);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter(event => event.date === dateStr);
  };

  const getEventTypeColor = (type: string) => {
    const eventType = EVENT_TYPES.find(et => et.value === type);
    return eventType ? `${eventType.color} text-white` : 'bg-secondary text-secondary-foreground';
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      days.push(
        <div key={day} className="h-24 p-2 border border-border rounded-lg hover:bg-muted/50 transition-colors">
          <div className="font-medium text-sm mb-1">{day}</div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map(event => (
              <Popover key={event.id}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={`h-auto py-0 px-2 w-full justify-start ${getEventTypeColor(event.type)} hover:opacity-90`}
                  >
                    <Gift className="w-3 h-3 mr-1" />
                    {event.person}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" side="right" align="start">
                  <EventPopoverContent 
                    event={event}
                    person={persons.find(p => p.id === event.personId)}
                    onViewProfile={(person) => {
                      setSelectedPerson(person);
                      setShowProfileModal(true);
                    }}
                    onEditEvent={onEditEvent}
                    onDeleteEvent={onDeleteEvent}
                  />
                </PopoverContent>
              </Popover>
            ))}
            {dayEvents.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{dayEvents.length - 2} autres
              </Badge>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <SearchFilters 
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
        activeFiltersCount={activeFiltersCount}
        persons={persons}
      />

      {/* View Mode Toggle */}
      <div className="flex items-center justify-center">
        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center space-x-2">
              <Grid3x3 className="w-4 h-4" />
              <span>Calendrier</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center space-x-2">
              <List className="w-4 h-4" />
              <span>Liste ({filteredEvents.length})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'calendar' ? (
        <Card className="w-full shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''} 
                {activeFiltersCount > 0 && ' (filtré)'}
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-center font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {renderCalendarDays()}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EventsList 
          events={filteredEvents}
          persons={persons}
          onEditEvent={onEditEvent}
          onDeleteEvent={onDeleteEvent}
        />
      )}

      {/* Profile Modal */}
      <PersonProfileViewModal
        person={selectedPerson}
        isOpen={showProfileModal}
        onOpenChange={setShowProfileModal}
      />
    </div>
  );
};

export default Calendar;