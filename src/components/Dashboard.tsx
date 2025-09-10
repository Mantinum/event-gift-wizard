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
      case 'reviewing': return 'bg-ocean-blue text-white';
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
                <p className="text-sm text-muted-foreground">Achats à venir</p>
                <p className="text-2xl font-bold text-primary">{upcomingPurchases.length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-ocean-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">À valider</p>
                <p className="text-2xl font-bold text-warning">{reviewingPurchases}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Budget total</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalBudget)}</p>
              </div>
              <Euro className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Événements</p>
                <p className="text-2xl font-bold text-purple-accent">{events.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-accent" />
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