import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Filter, X, ChevronDown, Users, Heart, Euro, Calendar, Cake, Sparkles } from 'lucide-react';
import { PersonFilters as PersonFiltersType } from '@/hooks/usePersonFilters';
import { RELATIONSHIP_TYPES, INTEREST_CATEGORIES } from '@/types';

interface PersonFiltersProps {
  filters: PersonFiltersType;
  updateFilter: (key: keyof PersonFiltersType, value: any) => void;
  clearFilters: () => void;
  activeFiltersCount: number;
}

const PersonFilters = ({ filters, updateFilter, clearFilters, activeFiltersCount }: PersonFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRelationshipToggle = (relationship: string) => {
    const newRelationships = filters.relationships.includes(relationship)
      ? filters.relationships.filter(r => r !== relationship)
      : [...filters.relationships, relationship];
    updateFilter('relationships', newRelationships);
  };

  const handleInterestToggle = (interest: string) => {
    const newInterests = filters.interests.includes(interest)
      ? filters.interests.filter(i => i !== interest)
      : [...filters.interests, interest];
    updateFilter('interests', newInterests);
  };

  return (
    <Card className="mb-6 shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-primary" />
            <span>Rechercher et filtrer</span>
          </CardTitle>
          {activeFiltersCount > 0 && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-primary text-white">
                {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-8"
              >
                <X className="h-3 w-3 mr-1" />
                Effacer
              </Button>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, notes ou centres d'intérêt..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between px-6 py-2">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filtres avancés</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Relations Filter */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Relations</Label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {RELATIONSHIP_TYPES.map(relationship => (
                  <div key={relationship} className="flex items-center space-x-2">
                    <Checkbox
                      id={`relationship-${relationship}`}
                      checked={filters.relationships.includes(relationship)}
                      onCheckedChange={() => handleRelationshipToggle(relationship)}
                    />
                    <Label
                      htmlFor={`relationship-${relationship}`}
                      className="text-sm cursor-pointer"
                    >
                      {relationship}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Range Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Euro className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Budget</Label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {filters.budgetRange[0]}€ - {filters.budgetRange[1]}€
                </span>
              </div>
              <Slider
                value={filters.budgetRange}
                onValueChange={(value) => updateFilter('budgetRange', value as [number, number])}
                max={5000}
                step={50}
                className="w-full"
              />
            </div>

            {/* Age Range Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Âge</Label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {filters.ageRange[0]} - {filters.ageRange[1]} ans
                </span>
              </div>
              <Slider
                value={filters.ageRange}
                onValueChange={(value) => updateFilter('ageRange', value as [number, number])}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Interests Filter */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Centres d'intérêt</Label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {INTEREST_CATEGORIES.map(interest => (
                  <div key={interest} className="flex items-center space-x-2">
                    <Checkbox
                      id={`interest-${interest}`}
                      checked={filters.interests.includes(interest)}
                      onCheckedChange={() => handleInterestToggle(interest)}
                    />
                    <Label
                      htmlFor={`interest-${interest}`}
                      className="text-sm cursor-pointer"
                    >
                      {interest}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Birthday Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cake className="h-4 w-4 text-primary" />
                <Label htmlFor="upcoming-birthday" className="text-sm font-medium">
                  Anniversaire dans les 30 prochains jours
                </Label>
              </div>
              <Switch
                id="upcoming-birthday"
                checked={filters.hasUpcomingBirthday}
                onCheckedChange={(checked) => updateFilter('hasUpcomingBirthday', checked)}
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PersonFilters;