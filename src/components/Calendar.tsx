import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Plus, Gift, User, Calendar as CalendarIcon, List, Grid3x3 } from 'lucide-react';
import { Event, Person, EVENT_TYPES } from '@/types';
import { useEventFilters } from '@/hooks/useEventFilters';
import SearchFilters from '@/components/SearchFilters';
import EventsList from '@/components/EventsList';

interface CalendarProps {
  events: Event[];
  persons: Person[];
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
}

const Calendar = ({ events, persons, onEditEvent, onDeleteEvent }: CalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  
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
        <div key={day} className="h-24 p-2 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="font-medium text-sm mb-1">{day}</div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map(event => (
              <Badge 
                key={event.id} 
                className={`text-xs p-1 ${getEventTypeColor(event.type)} truncate block`}
              >
                <Gift className="w-3 h-3 inline mr-1" />
                {event.person}
              </Badge>
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

      {/* View Mode Toggle and Actions */}
      <div className="flex items-center justify-between">
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
        
        <Button className="bg-gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-300">
          <Plus className="w-4 h-4 mr-2" />
          Nouvel événement
        </Button>
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
    </div>
  );
};

export default Calendar;