import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type UserRole = 'admin' | 'free' | 'premium_1' | 'premium_2';

export interface Profile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      console.log('🔍 Fetching profile...');
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id);
      if (!user) {
        console.log('❌ No user found');
        setProfile(null);
        return;
      }

      console.log('📡 Making request to profiles table...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('📊 Profile data received:', data);
      console.log('❌ Profile error:', error);

      if (error) {
        throw error;
      }

      setProfile(data);
      console.log('✅ Profile set:', data);
    } catch (err) {
      console.error('❌ Profile fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger le profil',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été sauvegardées avec succès',
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de mettre à jour le profil',
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
};