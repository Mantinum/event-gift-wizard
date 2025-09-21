import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Thermometer, Gift } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function WeatherWidget() {
  // Simuler des données de tendances saisonnières
  const currentMonth = format(new Date(), 'MMMM', { locale: fr });
  
  const seasonalTrends = [
    { category: 'Tech', trend: 'up', percentage: 15, reason: 'Nouvelles sorties' },
    { category: 'Mode', trend: 'down', percentage: 8, reason: 'Fin de saison' },
    { category: 'Maison', trend: 'up', percentage: 12, reason: 'Décoration automne' },
    { category: 'Sport', trend: 'stable', percentage: 0, reason: 'Stable' }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Thermometer className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Gift className="h-5 w-5" />
          <span>Météo Cadeaux</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
          <h3 className="font-semibold text-lg">Tendances {currentMonth}</h3>
          <p className="text-sm text-muted-foreground">
            Popularité des catégories de cadeaux
          </p>
        </div>

        <div className="space-y-3">
          {seasonalTrends.map((item) => (
            <div key={item.category} className="flex items-center justify-between p-2 rounded border">
              <div className="flex items-center space-x-2">
                {getTrendIcon(item.trend)}
                <span className="font-medium">{item.category}</span>
              </div>
              <div className="text-right">
                <Badge 
                  variant="outline" 
                  className={item.trend === 'up' ? 'border-green-200' : item.trend === 'down' ? 'border-red-200' : 'border-blue-200'}
                >
                  {item.trend === 'stable' ? 'Stable' : `${item.percentage > 0 ? '+' : ''}${item.percentage}%`}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.reason}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground border-t pt-3">
          <p>💡 Conseil : Les cadeaux tech sont en hausse ce mois-ci</p>
        </div>
      </CardContent>
    </Card>
  );
}