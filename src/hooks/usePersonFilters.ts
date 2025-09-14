import { useState, useMemo } from 'react';
import { Person, RELATIONSHIP_TYPES, INTEREST_CATEGORIES } from '@/types';

export interface PersonFilters {
  searchQuery: string;
  selectedRelationship: string;
}

const initialFilters: PersonFilters = {
  searchQuery: '',
  selectedRelationship: ''
};

export function usePersonFilters(persons: Person[]) {
  const [filters, setFilters] = useState<PersonFilters>(initialFilters);

  const filteredPersons = useMemo(() => {
    return persons.filter(person => {
      // Search query filter
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch = (
          person.name.toLowerCase().includes(query) ||
          person.email?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      // Relationship filter
      if (filters.selectedRelationship) {
        if (person.relationship !== filters.selectedRelationship) return false;
      }

      return true;
    });
  }, [persons, filters]);

  const updateFilter = (key: keyof PersonFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.selectedRelationship) count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredPersons,
    updateFilter,
    clearFilters,
    activeFiltersCount
  };
}