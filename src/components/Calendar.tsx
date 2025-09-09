import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Gift, User, Calendar as CalendarIcon } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: string;
  type: 'birthday' | 'wedding' | 'anniversary' | 'baptism' | 'other';
  person: string;
  budget: number;
  status: 'upcoming' | 'ordered' | 'completed';
}

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Anniversaire Sophie',
    date: '2024-09-15',
    type: 'birthday',
    person: 'Sophie',
    budget: 50,
    status: 'upcoming'
  },
  {
    id: '2',
    title: 'Mariage Paul & Marie',
    date: '2024-09-22',
    type: 'wedding',
    person: 'Paul',
    budget: 150,
    status: 'ordered'
  }
];

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events] = useState<Event[]>(mockEvents);

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
    return events.filter(event => event.date === dateStr);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'birthday': return 'bg-ocean-blue text-white';
      case 'wedding': return 'bg-purple-accent text-white';
      case 'anniversary': return 'bg-accent text-accent-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
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
          <Button className="bg-gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-300">
            <Plus className="w-4 h-4 mr-2" />
            Nouvel événement
          </Button>
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
  );
};

export default Calendar;