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

      // Get auth users data - Note: This requires service role key
      // For now, we'll use email from user metadata or profile data
      const authUsersMap = new Map();

      // Get additional user data if needed
      // Note: We'll need to get email from auth.users table or store it in profiles

      // Get usage data for all users
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData, error: usageError } = await supabase
        .from('ai_usage_limits')
        .select('user_id, generation_count')
        .eq('usage_date', today);

      if (usageError) {
        console.error('Error fetching usage data:', usageError);
      }

      // Combine the data
      const combinedUsers: AdminUserData[] = profiles.map(profile => {
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
          email: profile.user_id, // We'll show user_id for now, could be enhanced with email lookup
          profile,
          usage: usageInfo
        };
      });

      setUsers(combinedUsers);
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
      // Delete from auth.users (this will cascade delete profile due to foreign key)
      const { error } = await supabase.auth.admin.deleteUser(userId);

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