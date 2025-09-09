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
  Euro
} from 'lucide-react';

interface UpcomingPurchase {
  id: string;
  personName: string;
  eventTitle: string;
  daysUntil: number;
  budget: number;
  suggestedGift: string;
  confidence: number;
  status: 'pending' | 'reviewing' | 'approved';
}

const mockPurchases: UpcomingPurchase[] = [
  {
    id: '1',
    personName: 'Sophie',
    eventTitle: 'Anniversaire',
    daysUntil: 3,
    budget: 50,
    suggestedGift: 'Livre de cuisine végétarienne',
    confidence: 92,
    status: 'reviewing'
  },
  {
    id: '2',
    personName: 'Paul',
    eventTitle: 'Mariage',
    daysUntil: 10,
    budget: 150,
    suggestedGift: 'Coffret dégustation de vins',
    confidence: 88,
    status: 'pending'
  }
];

const Dashboard = () => {
  const totalBudget = mockPurchases.reduce((sum, purchase) => sum + purchase.budget, 0);
  const pendingPurchases = mockPurchases.filter(p => p.status === 'pending').length;
  const reviewingPurchases = mockPurchases.filter(p => p.status === 'reviewing').length;

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
                <p className="text-2xl font-bold text-primary">{mockPurchases.length}</p>
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
                <p className="text-2xl font-bold text-purple-accent">12</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Purchases */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-primary" />
            <span>Prochains achats automatiques</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockPurchases.map((purchase) => (
              <div key={purchase.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {purchase.suggestedGift}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Pour {purchase.personName} • {purchase.eventTitle}
                    </p>
                  </div>
                  <Badge className={getStatusColor(purchase.status)}>
                    {getStatusText(purchase.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-warning" />
                    <span>{purchase.daysUntil} jours</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Euro className="h-4 w-4 text-success" />
                    <span>{formatCurrency(purchase.budget)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span>{purchase.confidence}% confiance</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span>IA Suggestion</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">Niveau de confiance</span>
                    <span className="text-xs font-medium">{purchase.confidence}%</span>
                  </div>
                  <Progress value={purchase.confidence} className="h-2" />
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Modifier
                  </Button>
                  {purchase.status === 'reviewing' && (
                    <Button 
                      size="sm" 
                      className="flex-1 bg-gradient-primary text-white hover:shadow-glow transition-all duration-300"
                    >
                      Valider l'achat
                    </Button>
                  )}
                  {purchase.status === 'pending' && (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex-1"
                    >
                      Programmer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;