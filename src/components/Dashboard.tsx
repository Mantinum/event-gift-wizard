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
  Wand2
} from 'lucide-react';
import { Event, Person } from '@/types';
import AutoGiftSuggestions from './AutoGiftSuggestions';
import { ThemeToggle } from './ThemeToggle';

interface DashboardProps {
  events: Event[];
  persons: Person[];
}

const Dashboard = ({ events, persons }: DashboardProps) => {
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