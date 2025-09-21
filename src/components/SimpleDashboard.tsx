import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Calendar, 
  Clock, 
  Euro,
  Gift,
  TrendingUp
} from 'lucide-react';
import { Event, Person } from '@/types';
import AutoGiftSuggestions from './AutoGiftSuggestions';

interface SimpleDashboardProps {
  events: Event[];
  persons: Person[];
  onEditEvent?: (event: Event) => void;
}

export function SimpleDashboard({ events, persons, onEditEvent }: SimpleDashboardProps) {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Statistics Cards - Simplified Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Achats prévus</p>
                <p className="text-2xl font-bold">{upcomingEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Urgents</p>
                <p className="text-2xl font-bold text-orange-600">{urgentEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Euro className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-blue-600">{events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Gift Suggestions - Cleaner Design */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <Gift className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Suggestions Cadeaux IA</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Générez des idées personnalisées pour vos événements
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              <TrendingUp className="h-3 w-3 mr-1" />
              IA
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <AutoGiftSuggestions 
            events={events} 
            persons={persons} 
            onEditEvent={onEditEvent} 
          />
        </CardContent>
      </Card>
    </div>
  );
}