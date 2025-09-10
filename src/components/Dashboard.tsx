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
import { Event, Person, UpcomingPurchase } from '@/types';
import { generateAIUpcomingPurchases } from '@/utils/giftAI';
import AutoGiftSuggestions from './AutoGiftSuggestions';
import { ThemeToggle } from './ThemeToggle';

interface DashboardProps {
  events: Event[];
  persons: Person[];
}

const Dashboard = ({ events, persons }: DashboardProps) => {
  const upcomingPurchases = generateAIUpcomingPurchases(events, persons);
  const totalBudget = upcomingPurchases.reduce((sum, purchase) => sum + purchase.budget, 0);
  const reviewingPurchases = upcomingPurchases.filter(p => p.status === 'reviewing').length;

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
                <p className="text-2xl font-bold text-primary">{upcomingPurchases.length}</p>
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
                <p className="text-2xl font-bold text-warning">{reviewingPurchases}</p>
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

      {/* Prochains événements */}
      {upcomingPurchases.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gift className="h-5 w-5 text-primary" />
              <span>Prochains événements à prévoir</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Événements dans les 30 prochains jours avec suggestions de cadeaux
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingPurchases.slice(0, 6).map((purchase) => (
              <div key={purchase.id} className="p-4 rounded-lg border border-border bg-card/30 hover:bg-card/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-foreground">{purchase.personName}</h4>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{purchase.eventTitle}</span>
                    </div>
                    <p className="text-sm font-medium text-primary mb-1">{purchase.suggestedGift}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{purchase.daysUntil} jour{purchase.daysUntil > 1 ? 's' : ''}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Euro className="h-3 w-3" />
                        <span>{formatCurrency(purchase.budget)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {purchase.daysUntil <= 3 ? (
                      <Badge variant="destructive" className="text-xs">
                        Urgent
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        À prévoir
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
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