import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Calendar,
  User,
  Euro,
  Tag,
  Sparkles
} from 'lucide-react';
import { EVENT_TYPES, Person } from '@/types';
import { EventFilters } from '@/hooks/useEventFilters';

interface SearchFiltersProps {
  filters: EventFilters;
  updateFilter: (key: keyof EventFilters, value: any) => void;
  clearFilters: () => void;
  activeFiltersCount: number;
  persons: Person[];
}

const SearchFilters = ({ 
  filters, 
  updateFilter, 
  clearFilters, 
  activeFiltersCount, 
  persons 
}: SearchFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extraire toutes les catégories uniques des personnes
  const allCategories = Array.from(
    new Set(persons.flatMap(person => [...person.interests, ...person.preferredCategories]))
  ).filter(Boolean);

  const handlePersonToggle = (personId: string, checked: boolean) => {
    const newSelectedIds = checked 
      ? [...filters.selectedPersonIds, personId]
      : filters.selectedPersonIds.filter(id => id !== personId);
    updateFilter('selectedPersonIds', newSelectedIds);
  };

  const handleEventTypeToggle = (eventType: string, checked: boolean) => {
    const newEventTypes = checked
      ? [...filters.eventTypes, eventType]
      : filters.eventTypes.filter(type => type !== eventType);
    updateFilter('eventTypes', newEventTypes);
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter(cat => cat !== category);
    updateFilter('categories', newCategories);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Recherche et filtres</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Effacer
              </Button>
            )}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filtres
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barre de recherche principale */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, titre, description..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="pl-10"
          />
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-6">
            
            {/* Filtre par personnes */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2 text-sm font-medium">
                <User className="h-4 w-4" />
                <span>Personnes</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                {persons.map(person => (
                  <div key={person.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`person-${person.id}`}
                      checked={filters.selectedPersonIds.includes(person.id)}
                      onCheckedChange={(checked) => handlePersonToggle(person.id, !!checked)}
                    />
                    <label htmlFor={`person-${person.id}`} className="text-sm cursor-pointer">
                      {person.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Filtre par dates */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                <span>Période</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date-from" className="text-xs text-muted-foreground">Du</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={filters.dateRange.from}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, from: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="date-to" className="text-xs text-muted-foreground">Au</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={filters.dateRange.to}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, to: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Filtre par budget */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2 text-sm font-medium">
                <Euro className="h-4 w-4" />
                <span>Budget ({filters.budgetRange.min}€ - {filters.budgetRange.max}€)</span>
              </Label>
              <div className="px-2">
                <Slider
                  value={[filters.budgetRange.min, filters.budgetRange.max]}
                  onValueChange={([min, max]) => updateFilter('budgetRange', { min, max })}
                  max={10000}
                  min={0}
                  step={50}
                  className="w-full"
                />
              </div>
            </div>

            {/* Filtre par types d'événements */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2 text-sm font-medium">
                <Tag className="h-4 w-4" />
                <span>Types d'événements</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {EVENT_TYPES.map(eventType => (
                  <div key={eventType.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${eventType.value}`}
                      checked={filters.eventTypes.includes(eventType.value)}
                      onCheckedChange={(checked) => handleEventTypeToggle(eventType.value, !!checked)}
                    />
                    <label htmlFor={`type-${eventType.value}`} className="text-sm cursor-pointer">
                      {eventType.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Filtre par catégories/intérêts */}
            {allCategories.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center space-x-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  <span>Catégories/Intérêts</span>
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {allCategories.map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={filters.categories.includes(category)}
                        onCheckedChange={(checked) => handleCategoryToggle(category, !!checked)}
                      />
                      <label htmlFor={`category-${category}`} className="text-sm cursor-pointer">
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default SearchFilters;