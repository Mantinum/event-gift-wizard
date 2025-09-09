import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Person } from '@/types';
import { toast } from '@/hooks/use-toast';

export function useSupabasePersons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch persons from Supabase
  const fetchPersons = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPersons([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('persons')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform database format to app format
      const transformedPersons: Person[] = (data || []).map(person => ({
        id: person.id,
        name: person.name,
        avatar: person.avatar || '',
        interests: person.interests || [],
        budget: person.budget,
        relationship: person.relationship,
        birthday: person.birthday,
        lastGift: person.last_gift || '',
        preferredCategories: person.preferred_categories || [],
        notes: person.notes || '',
        email: person.email || '',
        phone: person.phone || ''
      }));

      setPersons(transformedPersons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      toast({
        title: "Erreur",
        description: "Impossible de charger les profils",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Add or update person
  const savePerson = async (person: Person, isUpdate = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive"
        });
        return false;
      }

      // Transform app format to database format
      const dbPerson = {
        user_id: user.id,
        name: person.name,
        avatar: person.avatar || null,
        interests: person.interests,
        budget: person.budget,
        relationship: person.relationship,
        birthday: person.birthday,
        last_gift: person.lastGift || null,
        preferred_categories: person.preferredCategories,
        notes: person.notes || null,
        email: person.email || null,
        phone: person.phone || null
      };

      if (isUpdate) {
        const { error } = await supabase
          .from('persons')
          .update(dbPerson)
          .eq('id', person.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setPersons(prev => prev.map(p => p.id === person.id ? person : p));
        
        toast({
          title: "Succès",
          description: "Profil mis à jour avec succès"
        });
      } else {
        const { data, error } = await supabase
          .from('persons')
          .insert(dbPerson)
          .select()
          .single();

        if (error) throw error;

        const newPerson: Person = {
          ...person,
          id: data.id
        };

        setPersons(prev => [...prev, newPerson]);
        
        toast({
          title: "Succès",
          description: "Profil créé avec succès"
        });
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      toast({
        title: "Erreur",
        description: isUpdate ? "Impossible de mettre à jour le profil" : "Impossible de créer le profil",
        variant: "destructive"
      });
      return false;
    }
  };

  // Delete person
  const deletePerson = async (personId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('persons')
        .delete()
        .eq('id', personId)
        .eq('user_id', user.id);

      if (error) throw error;

      setPersons(prev => prev.filter(p => p.id !== personId));
      
      toast({
        title: "Succès",
        description: "Profil supprimé avec succès"
      });

      return true;
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le profil",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPersons();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchPersons();
      } else if (event === 'SIGNED_OUT') {
        setPersons([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    persons,
    loading,
    error,
    savePerson,
    deletePerson,
    refetch: fetchPersons
  };
}