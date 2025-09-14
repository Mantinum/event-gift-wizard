import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserRole } from '@/hooks/useProfile';

interface AdminUserData {
  email: string;
  profile: {
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    role: UserRole;
    created_at: string;
  };
  usage?: {
    dailyLimit: number;
    remaining: number;
    used: number;
    isUnlimited: boolean;
  };
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all profiles (admins can see all profiles thanks to RLS policy)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        throw profilesError;
      }

      // Get usage data for all users
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData, error: usageError } = await supabase
        .from('ai_usage_limits')
        .select('user_id, generation_count')
        .eq('usage_date', today);

      if (usageError) {
        console.error('Error fetching usage data:', usageError);
      }

      // Get emails for each user using our new function
      const usersWithEmails = await Promise.all(
        profiles.map(async (profile) => {
          const { data: email, error } = await supabase.rpc('get_user_email', { 
            user_uuid: profile.user_id 
          });

          const usage = usageData?.find(u => u.user_id === profile.user_id);
          
          let usageInfo;
          if (['admin', 'premium_1', 'premium_2'].includes(profile.role)) {
            usageInfo = {
              dailyLimit: -1,
              remaining: -1,
              used: 0,
              isUnlimited: true
            };
          } else {
            const dailyLimit = 5;
            const used = usage?.generation_count || 0;
            usageInfo = {
              dailyLimit,
              remaining: Math.max(0, dailyLimit - used),
              used,
              isUnlimited: false
            };
          }

          return {
            email: email || 'Email introuvable',
            profile,
            usage: usageInfo
          };
        })
      );

      setUsers(usersWithEmails);
    } catch (err) {
      console.error('Error fetching users:', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.profile.user_id === userId 
            ? { 
                ...user, 
                profile: { ...user.profile, role: newRole },
                // Update usage info based on new role
                usage: ['admin', 'premium_1', 'premium_2'].includes(newRole) 
                  ? { dailyLimit: -1, remaining: -1, used: 0, isUnlimited: true }
                  : user.usage
              }
            : user
        )
      );

      return true;
    } catch (err) {
      console.error('Error updating user role:', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de mettre à jour le rôle utilisateur',
      });
      return false;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Delete the user's profile (this will also cascade delete related data)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Update local state
      setUsers(prevUsers => prevUsers.filter(user => user.profile.user_id !== userId));

      return true;
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer l\'utilisateur',
      });
      return false;
    }
  };

  const refreshUsers = () => {
    fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    updateUserRole,
    deleteUser,
    refreshUsers,
  };
};