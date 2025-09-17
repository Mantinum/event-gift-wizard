import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface GenerateNoteRequest {
  name: string;
  gender?: string;
  age?: number;
  relationship: string;
  interests: string[];
}

export const usePersonalNoteGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<string>('');

  const generatePersonalNote = async (request: GenerateNoteRequest): Promise<string | null> => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-personal-note', {
        body: request
      });

      if (error) {
        console.error('Error generating personal note:', error);
        toast({
          title: "Erreur",
          description: "Impossible de générer la note personnelle",
          variant: "destructive",
        });
        return null;
      }

      if (data?.success && data?.personalNote) {
        setGeneratedNote(data.personalNote);
        return data.personalNote;
      } else {
        toast({
          title: "Erreur",
          description: data?.error || "Aucune note générée",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error('Error calling generate-personal-note function:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération de la note",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const clearGeneratedNote = () => {
    setGeneratedNote('');
  };

  return {
    isGenerating,
    generatedNote,
    generatePersonalNote,
    clearGeneratedNote
  };
};