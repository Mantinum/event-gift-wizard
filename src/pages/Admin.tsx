import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Shield, Users, Trash2, Edit, Crown, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { toast } from '@/hooks/use-toast';
import { UserRole } from '@/hooks/useProfile';

const Admin = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { users, loading: usersLoading, updateUserRole, deleteUser, refreshUsers } = useAdminUsers();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Check authentication and admin role
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
      
      if (!user) {
        navigate('/auth');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Redirect if not admin
  useEffect(() => {
    if (!profileLoading && profile && profile.role !== 'admin') {
      toast({
        variant: 'destructive',
        title: 'Accès refusé',
        description: 'Vous devez être administrateur pour accéder à cette page',
      });
      navigate('/dashboard');
    }
  }, [profile, profileLoading, navigate]);

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    const success = await updateUserRole(userId, newRole);
    if (success) {
      toast({
        title: 'Rôle mis à jour',
        description: 'Le rôle utilisateur a été modifié avec succès',
      });
      refreshUsers();
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const success = await deleteUser(userId);
    if (success) {
      toast({
        title: 'Utilisateur supprimé',
        description: `${userName} a été supprimé avec succès`,
      });
      refreshUsers();
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="bg-red-500"><Crown className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'premium_1':
        return <Badge variant="secondary" className="bg-gold text-black"><Zap className="w-3 h-3 mr-1" />Premium</Badge>;
      case 'premium_2':
        return <Badge variant="secondary" className="bg-purple-500"><Zap className="w-3 h-3 mr-1" />Premium+</Badge>;
      default:
        return <Badge variant="outline">Gratuit</Badge>;
    }
  };

  const getUsageDisplay = (usage: any) => {
    if (!usage) return 'N/A';
    if (usage.isUnlimited) return 'Illimité';
    return `${usage.used}/${usage.dailyLimit}`;
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-hero text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au tableau de bord
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center">
                  <Shield className="w-8 h-8 mr-3" />
                  Administration
                </h1>
                <p className="text-white/80 mt-1">
                  Gestion des utilisateurs et des permissions
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/60">Connecté en tant que</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Gestion des utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Chargement des utilisateurs...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Usage IA quotidien</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userData) => (
                    <TableRow key={userData.profile.id}>
                      <TableCell className="font-medium">{userData.email}</TableCell>
                      <TableCell>
                        {userData.profile.first_name && userData.profile.last_name
                          ? `${userData.profile.first_name} ${userData.profile.last_name}`
                          : '-'}
                      </TableCell>
                      <TableCell>{getRoleBadge(userData.profile.role)}</TableCell>
                      <TableCell>{getUsageDisplay(userData.usage)}</TableCell>
                      <TableCell>{new Date(userData.profile.created_at).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={userData.profile.role}
                            onValueChange={(value: UserRole) => handleRoleUpdate(userData.profile.user_id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Gratuit</SelectItem>
                              <SelectItem value="premium_1">Premium</SelectItem>
                              <SelectItem value="premium_2">Premium+</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {userData.profile.user_id !== user.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer l'utilisateur {userData.email} ?
                                    Cette action est irréversible et supprimera toutes ses données.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(userData.profile.user_id, userData.email)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;