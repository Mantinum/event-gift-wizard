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

      {/* Upcoming Purchases List */}
      {upcomingPurchases.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span>Achats recommandés par l'IA</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Suggestions personnalisées basées sur les profils et événements
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingPurchases.slice(0, 5).map((purchase) => (
              <div key={purchase.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{purchase.personName}</h4>
                      <p className="text-sm text-muted-foreground">{purchase.eventTitle}</p>
                    </div>
                    <Badge className={getStatusColor(purchase.status)}>
                      {getStatusText(purchase.status)}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="font-medium text-primary">{purchase.suggestedGift}</p>
                    <p className="text-sm text-muted-foreground">{purchase.aiReasoning}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{purchase.daysUntil} jour{purchase.daysUntil > 1 ? 's' : ''}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Euro className="h-3 w-3" />
                        <span>{formatCurrency(purchase.budget)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Sparkles className="h-3 w-3" />
                        <span>{purchase.confidence}% confiance</span>
                      </span>
                    </div>
                  </div>
                </div>
                {purchase.status === 'reviewing' && (
                  <div className="ml-4 flex space-x-2">
                    <Button variant="outline" size="sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Valider
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {upcomingPurchases.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm">
                  Voir tous les achats ({upcomingPurchases.length})
                </Button>
              </div>
            )}
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