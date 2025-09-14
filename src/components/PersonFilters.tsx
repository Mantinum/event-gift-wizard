import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { PersonFilters as PersonFiltersType } from '@/hooks/usePersonFilters';
import { getRelationshipColor, Person } from '@/types';

interface PersonFiltersProps {
  filters: PersonFiltersType;
  updateFilter: (key: keyof PersonFiltersType, value: any) => void;
  clearFilters: () => void;
  activeFiltersCount: number;
  persons: Person[];
}

const mainRelationships = ['Famille', 'Ami(e) proche', 'Partenaire', 'Collègue', 'Voisin(e)', 'Connaissance', 'Autre'];

const PersonFilters = ({ filters, updateFilter, clearFilters, activeFiltersCount, persons }: PersonFiltersProps) => {
  const handleRelationshipToggle = (relationship: string) => {
    updateFilter('selectedRelationship', filters.selectedRelationship === relationship ? '' : relationship);
  };

  // Calculer les relations présentes dans les données
  const availableRelationships = useMemo(() => {
    const relationshipsInData = new Set<string>();
    
    // Parcourir toutes les personnes et collecter leurs relations
    const allPersons = filters.searchQuery 
      ? persons.filter(person => {
          const query = filters.searchQuery.toLowerCase();
          return person.name.toLowerCase().includes(query) || 
                 person.email?.toLowerCase().includes(query);
        })
      : persons;

    allPersons.forEach(person => {
      // Si c'est une relation familiale, l'ajouter à "Famille"
      if (['Famille', 'Enfant', 'Parent', 'Frère/Sœur', 'Cousin(e)'].includes(person.relationship)) {
        relationshipsInData.add('Famille');
      } else {
        relationshipsInData.add(person.relationship);
      }
    });

    // Filtrer les boutons principaux pour ne garder que ceux qui ont des données
    return mainRelationships.filter(rel => relationshipsInData.has(rel));
  }, [persons, filters.searchQuery]);

  return (
    <Card className="mb-6 shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-primary" />
            <span>Rechercher et filtrer</span>
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Effacer
            </Button>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {availableRelationships.map(relationship => (
              <Button
                key={relationship}
                variant={filters.selectedRelationship === relationship ? "default" : "outline"}
                size="sm"
                onClick={() => handleRelationshipToggle(relationship)}
                className={filters.selectedRelationship === relationship 
                  ? `${getRelationshipColor(relationship)} text-white border-0` 
                  : "hover:bg-muted"
                }
              >
                {relationship}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default PersonFilters;