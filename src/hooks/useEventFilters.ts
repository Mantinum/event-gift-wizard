import { useState, useMemo } from 'react';
import { Event, Person } from '@/types';

export interface EventFilters {
  searchQuery: string;
  selectedPersonIds: string[];
  dateRange: {
    from: string;
    to: string;
  };
  budgetRange: {
    min: number;
    max: number;
  };
  eventTypes: string[];
  categories: string[];
}

const initialFilters: EventFilters = {
  searchQuery: '',
  selectedPersonIds: [],
  dateRange: { from: '', to: '' },
  budgetRange: { min: 0, max: 10000 },
  eventTypes: [],
  categories: [],
};

export function useEventFilters(events: Event[], persons: Person[]) {
  const [filters, setFilters] = useState<EventFilters>(initialFilters);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Recherche textuelle
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch = 
          event.title.toLowerCase().includes(query) ||
          event.person.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }

      // Filtre par personne
      if (filters.selectedPersonIds.length > 0) {
        const person = persons.find(p => p.name === event.person);
        if (!person || !filters.selectedPersonIds.includes(person.id)) {
          return false;
        }
      }

      // Filtre par plage de dates
      if (filters.dateRange.from && event.date < filters.dateRange.from) {
        return false;
      }
      if (filters.dateRange.to && event.date > filters.dateRange.to) {
        return false;
      }

      // Filtre par budget
      if (event.budget < filters.budgetRange.min || event.budget > filters.budgetRange.max) {
        return false;
      }

      // Filtre par type d'événement
      if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.type)) {
        return false;
      }

      // Filtre par catégories d'intérêts
      if (filters.categories.length > 0) {
        const person = persons.find(p => p.name === event.person);
        if (!person || !person.interests.some(interest => filters.categories.includes(interest))) {
          return false;
        }
      }

      return true;
    });
  }, [events, persons, filters]);

  const updateFilter = (key: keyof EventFilters, value: any) => {
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
    if (filters.searchQuery) count++;
    if (filters.selectedPersonIds.length > 0) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.budgetRange.min > 0 || filters.budgetRange.max < 10000) count++;
    if (filters.eventTypes.length > 0) count++;
    if (filters.categories.length > 0) count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredEvents,
    updateFilter,
    clearFilters,
    activeFiltersCount
  };
}