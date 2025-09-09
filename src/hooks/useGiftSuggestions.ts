import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface GiftSuggestion {
  title: string;
  description: string;
  estimatedPrice: number;
  confidence: number;
  reasoning: string;
  category: string;
  alternatives: string[];
  purchaseLinks: string[];
}

export interface GiftSuggestionRequest {
  personId: string;
  eventType: string;
  budget: number;
  additionalContext?: string;
}

export function useGiftSuggestions() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GiftSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedFor, setLastGeneratedFor] = useState<string | null>(null);

  const generateSuggestions = async (request: GiftSuggestionRequest) => {
    setLoading(true);
    setError(null);
    
    // Ne clear les suggestions que si c'est pour une nouvelle personne/événement
    const requestKey = `${request.personId}-${request.eventType}`;
    if (lastGeneratedFor !== requestKey) {
      setSuggestions([]);
    }
    setLastGeneratedFor(requestKey);

    try {
      console.log('Generating gift suggestions for:', request);

      const { data, error } = await supabase.functions.invoke('suggest-gifts', {
        body: request
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Erreur lors de la génération des suggestions');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.suggestions || !Array.isArray(data.suggestions)) {
        throw new Error('Format de réponse invalide');
      }

      setSuggestions(data.suggestions);
      
      toast({
        title: "Suggestions générées !",
        description: `${data.suggestions.length} idées de cadeaux pour ${data.personName}`,
      });

      return data.suggestions;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur inattendue est survenue';
      setError(errorMessage);
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });

      console.error('Error generating suggestions:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setError(null);
    setLastGeneratedFor(null);
  };

  return {
    suggestions,
    loading,
    error,
    generateSuggestions,
    clearSuggestions,
    lastGeneratedFor
  };
}