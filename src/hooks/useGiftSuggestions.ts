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
  brand?: string;
  canonical_name?: string;
  search_queries?: string[];
  min_price?: number;
  max_price?: number;
  amazonData?: {
    asin?: string;
    rating?: number;
    reviewCount?: number;
    availability?: string;
    prime?: boolean;
    actualPrice?: number;
    imageUrl?: string;
    productUrl?: string;
    addToCartUrl?: string;
    searchUrl?: string;
    matchType?: 'exact' | 'relaxed' | 'search';
  };
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

      // Obtenir le token JWT pour l'authentification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Session non valide - reconnexion requise');
      }

      const { data, error } = await supabase.functions.invoke('suggest-gifts', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Erreur lors de la génération des suggestions');
      }

      // Check for success in response data
      if (!data.success) {
        throw new Error(data.error || 'Erreur inconnue');
      }

      if (!data.suggestions || !Array.isArray(data.suggestions)) {
        throw new Error('Format de réponse invalide');
      }

      setSuggestions(data.suggestions);
      console.log('🔎 Suggestions received (debug):', data.suggestions.map((s: any) => ({ title: s.title, asin: s.amazonData?.asin, purchaseLinks: s.purchaseLinks })));
      
      toast({
        title: "Suggestions générées !",
        description: `${data.suggestions.length} idées de cadeaux pour ${data.personName}`,
      });

      return data.suggestions;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur inattendue est survenue';
      
      // Handle usage limit error specifically
      if (errorMessage.includes('Limite quotidienne dépassée') || errorMessage.includes('Usage limit exceeded')) {
        setError('Limite quotidienne de générations IA atteinte. Revenez demain ou passez Premium pour un accès illimité.');
      } else {
        setError(errorMessage);
      }
      
      toast({
        title: "Erreur",
        description: errorMessage.includes('Limite quotidienne') 
          ? "Limite quotidienne atteinte - Revenez demain !" 
          : errorMessage,
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