import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useProfile, UserRole } from '@/hooks/useProfile';
import { toast } from '@/hooks/use-toast';
import { User, Mail, MapPin, Crown, ArrowLeft, LogOut } from 'lucide-react';

const roleLabels = {
  admin: 'Administrateur',
  free: 'Gratuit',
  premium_1: 'Premium 1',
  premium_2: 'Premium 2',
};

const roleColors = {
  admin: 'bg-destructive text-white',
  free: 'bg-muted',
  premium_1: 'bg-success',
  premium_2: 'bg-purple-accent text-white',
};

const Account = () => {
  const navigate = useNavigate();
  const { profile, loading, updateProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setEmail(user.email || '');
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      setError(null);

      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        address: address,
      });

      setEditing(false);
    } catch (err) {
      setError('Impossible de mettre à jour le profil');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-white hover:bg-white/10 mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-3xl font-bold text-white">Mon compte</h1>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="text-white border-white/20 hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Informations personnelles
              </CardTitle>
              {profile?.role && (
                <Badge className={roleColors[profile.role]}>
                  <Crown className="w-3 h-3 mr-1" />
                  {roleLabels[profile.role]}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                      disabled={!editing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-10"
                      disabled={!editing}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    className="pl-10"
                    disabled
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  L'email ne peut pas être modifié pour des raisons de sécurité
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-10"
                    disabled={!editing}
                    placeholder="123 rue de la Paix, 75001 Paris"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                {editing ? (
                  <div className="space-x-2">
                    <Button
                      onClick={handleUpdate}
                      disabled={updating}
                      className="bg-gradient-primary text-white"
                    >
                      {updating ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        setError(null);
                        // Reset form
                        if (profile) {
                          setFirstName(profile.first_name || '');
                          setLastName(profile.last_name || '');
                          setAddress(profile.address || '');
                        }
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                  >
                    Modifier
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Informations du compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Type de compte
                  </Label>
                  <p className="text-sm font-medium">
                    {profile?.role ? roleLabels[profile.role] : 'Non défini'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Membre depuis
                  </Label>
                  <p className="text-sm font-medium">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString('fr-FR')
                      : 'Non défini'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Account;