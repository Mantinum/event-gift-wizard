import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface TaskWidgetProps {
  events: any[];
}

export function TaskWidget({ events }: TaskWidgetProps) {
  const upcomingEvents = events
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const getEventIcon = (date: string) => {
    const eventDate = new Date(date);
    if (isToday(eventDate)) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    } else if (isTomorrow(eventDate)) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getDateLabel = (date: string) => {
    const eventDate = new Date(date);
    if (isToday(eventDate)) {
      return "Aujourd'hui";
    } else if (isTomorrow(eventDate)) {
      return "Demain";
    }
    const days = differenceInDays(eventDate, new Date());
    return `Dans ${days} jours`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Prochaines Tâches</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Aucun événement à venir
          </p>
        ) : (
          upcomingEvents.map((event) => (
            <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                {getEventIcon(event.date)}
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.person_name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="mb-1">
                  {getDateLabel(event.date)}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.date), 'dd MMM', { locale: fr })}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}