import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Smartphone, Mail, Calendar } from "lucide-react";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

export function NotificationSettings() {
  const { preferences, updateNotificationSettings } = useDashboardPreferences();
  const { supported, permission, requestPermission, isGranted } = usePushNotifications();
  const { toast } = useToast();

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && !isGranted) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    
    updateNotificationSettings({ push_enabled: enabled });
  };

  const handleReminderDaysChange = (days: number, enabled: boolean) => {
    const currentDays = preferences.notification_settings.reminder_days;
    const newDays = enabled 
      ? [...currentDays, days].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a)
      : currentDays.filter(d => d !== days);
    
    updateNotificationSettings({ reminder_days: newDays });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Paramètres de Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="push-notifications">Notifications Push</Label>
                {!supported && <Badge variant="destructive">Non supporté</Badge>}
                {supported && isGranted && <Badge variant="default">Activé</Badge>}
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.notification_settings.push_enabled && isGranted}
                onCheckedChange={handlePushToggle}
                disabled={!supported}
              />
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Recevez des notifications directement sur votre appareil
            </p>
          </div>

          {/* Email Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email-notifications">Notifications Email</Label>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.notification_settings.email_enabled}
                onCheckedChange={(enabled) => updateNotificationSettings({ email_enabled: enabled })}
              />
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Recevez un récapitulatif hebdomadaire par email
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Rappels d'Événements</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choisissez quand vous souhaitez être rappelé avant vos événements
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { days: 14, label: "2 semaines avant" },
              { days: 7, label: "1 semaine avant" },
              { days: 3, label: "3 jours avant" },
              { days: 1, label: "1 jour avant" }
            ].map(({ days, label }) => (
              <div key={days} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Switch
                  checked={preferences.notification_settings.reminder_days.includes(days)}
                  onCheckedChange={(enabled) => handleReminderDaysChange(days, enabled)}
                />
                <Label className="flex-1">{label}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle>Test de Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              toast({
                title: "Test de notification",
                description: "Ceci est un test de notification dans l'application",
              });
            }}
            className="w-full"
          >
            Tester les notifications
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}