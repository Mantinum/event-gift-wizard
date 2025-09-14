import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingCart, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Gift,
  Euro,
  Sparkles,
  Wand2,
  Edit3,
  User
} from 'lucide-react';
import { Event, Person } from '@/types';
import AutoGiftSuggestions from './AutoGiftSuggestions';
import { ThemeToggle } from './ThemeToggle';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardProps {
  events: Event[];
  persons: Person[];
  onEditEvent?: (event: Event) => void;
}

const Dashboard = ({ events, persons, onEditEvent }: DashboardProps) => {
  // Calculs pour les statistiques
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    const today = new Date();
    const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 30;
  });
  
  const totalBudget = upcomingEvents.reduce((sum, event) => sum + event.budget, 0);
  const urgentEvents = upcomingEvents.filter(event => {
    const eventDate = new Date(event.date);
    const today = new Date();
    const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 3;
  }).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-white';
      case 'reviewing': return 'bg-primary text-white';
      case 'approved': return 'bg-success text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'reviewing': return 'À valider';
      case 'approved': return 'Approuvé';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getPersonName = (personId: string) => {
    const person = persons.find(p => p.id === personId);
    return person ? person.name : 'Personne inconnue';
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Achats planifiés</p>
                <p className="text-2xl font-bold text-primary">{upcomingEvents.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Dans les 30 prochains jours</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Urgents</p>
                <p className="text-2xl font-bold text-warning">{urgentEvents}</p>
                <p className="text-xs text-muted-foreground mt-1">≤ 3 jours restants</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Budget prévu</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalBudget)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total à dépenser</p>
              </div>
              <Euro className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Événements totaux</p>
                <p className="text-2xl font-bold text-accent">{events.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Tous événements</p>
              </div>
              <Calendar className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events List */}
      {upcomingEvents.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span>Événements à venir</span>
              <Badge variant="outline" className="text-xs">{upcomingEvents.length}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Cliquez sur un événement pour le modifier
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.slice(0, 5).map((event) => {
              const eventDate = new Date(event.date);
              const today = new Date();
              const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysUntil <= 3;
              
              return (
                <div
                  key={event.id}
                  onClick={() => onEditEvent?.(event)}
                  className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${isUrgent ? 'bg-warning/10' : 'bg-primary/10'}`}>
                      <Gift className={`h-4 w-4 ${isUrgent ? 'text-warning' : 'text-primary'}`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        {isUrgent && (
                          <Badge variant="destructive" className="text-xs">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{getPersonName(event.personId)}</span>
                        <span>•</span>
                        <span>{format(eventDate, 'dd/MM/yyyy', { locale: fr })}</span>
                        <span>•</span>
                        <span>{formatCurrency(event.budget)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {daysUntil === 1 ? 'Demain' : `${daysUntil} jours`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.type}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEvent?.(event);
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Gift suggestions with OpenAI */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wand2 className="h-5 w-5 text-primary" />
            <span>Générateur de cadeaux IA</span>
            <Badge variant="outline" className="text-xs">Powered by OpenAI</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Générez des suggestions personnalisées pour vos événements à venir
          </p>
        </CardHeader>
        <CardContent>
          <AutoGiftSuggestions events={events} persons={persons} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;