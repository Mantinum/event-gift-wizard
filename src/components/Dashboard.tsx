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
import { Event, Person, UpcomingPurchase } from '@/types';

interface DashboardProps {
  events: Event[];
  persons: Person[];
}

// Simulation des achats à venir basés sur les événements
const generateUpcomingPurchases = (events: Event[], persons: Person[]): UpcomingPurchase[] => {
  const today = new Date();
  
  return events
    .filter(event => {
      const eventDate = new Date(event.date);
      const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return daysUntil > 0 && daysUntil <= 30; // Événements dans les 30 prochains jours
    })
    .map(event => {
      const eventDate = new Date(event.date);
      const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      const person = persons.find(p => p.id === event.personId);
      
      // Simulation d'une suggestion de cadeau basée sur les intérêts
      const suggestedGifts = {
        'birthday': ['Livre sur ses centres d\'intérêt', 'Coffret bien-être', 'Accessoire pour ses hobbies'],
        'wedding': ['Coffret dégustation', 'Décoration maison', 'Expérience à deux'],
        'anniversary': ['Bijou personnalisé', 'Album photo', 'Sortie romantique'],
        'baptism': ['Peluche personnalisée', 'Livre d\'éveil', 'Cadre photo'],
        'christmas': ['selon ses centres d\'intérêts', 'Coffret gourmand', 'Accessoire tech'],
        'other': ['Carte cadeau', 'Expérience', 'Objet personnalisé']
      };

      const giftOptions = suggestedGifts[event.type as keyof typeof suggestedGifts] || suggestedGifts.other;
      const randomGift = giftOptions[Math.floor(Math.random() * giftOptions.length)];
      
      // Si on a les intérêts de la personne, on personnalise
      let personalizedGift = randomGift;
      if (person && person.interests.length > 0) {
        const interest = person.interests[0];
        personalizedGift = `${randomGift} lié à ${interest.toLowerCase()}`;
      }

      return {
        id: `purchase-${event.id}`,
        personName: event.person,
        personId: event.personId,
        eventTitle: event.title,
        eventId: event.id,
        daysUntil,
        budget: event.budget,
        suggestedGift: personalizedGift,
        confidence: Math.floor(Math.random() * 20) + 80, // 80-100%
        status: daysUntil <= 3 ? 'reviewing' : 'pending' as UpcomingPurchase['status'],
        aiReasoning: person ? `Basé sur ses intérêts: ${person.interests.slice(0, 3).join(', ')}` : 'Suggestion générale'
      };
    });
};

const Dashboard = ({ events, persons }: DashboardProps) => {
  const upcomingPurchases = generateUpcomingPurchases(events, persons);
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
            {upcomingPurchases.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Aucun achat programmé</h3>
                <p className="text-muted-foreground">
                  Ajoutez des événements pour voir les suggestions de cadeaux automatiques
                </p>
              </div>
            ) : (
              upcomingPurchases.map((purchase, index) => (
                <div 
                  key={purchase.id} 
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {purchase.suggestedGift}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Pour {purchase.personName} • {purchase.eventTitle}
                      </p>
                      {purchase.aiReasoning && (
                        <p className="text-xs text-primary mt-1">
                          IA: {purchase.aiReasoning}
                        </p>
                      )}
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;