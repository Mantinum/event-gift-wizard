import { useState, useMemo } from 'react';
import { Person, RELATIONSHIP_TYPES, INTEREST_CATEGORIES } from '@/types';

export interface PersonFilters {
  searchQuery: string;
  relationships: string[];
  budgetRange: [number, number];
  interests: string[];
  ageRange: [number, number];
  hasUpcomingBirthday: boolean;
}

const initialFilters: PersonFilters = {
  searchQuery: '',
  relationships: [],
  budgetRange: [0, 5000],
  interests: [],
  ageRange: [0, 100],
  hasUpcomingBirthday: false
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
          person.email?.toLowerCase().includes(query) ||
          person.notes?.toLowerCase().includes(query) ||
          person.interests.some(interest => interest.toLowerCase().includes(query))
        );
        if (!matchesSearch) return false;
      }

      // Relationship filter
      if (filters.relationships.length > 0) {
        if (!filters.relationships.includes(person.relationship)) return false;
      }

      // Budget filter
      if (person.budget < filters.budgetRange[0] || person.budget > filters.budgetRange[1]) {
        return false;
      }

      // Interests filter
      if (filters.interests.length > 0) {
        const hasMatchingInterest = filters.interests.some(interest => 
          person.interests.includes(interest)
        );
        if (!hasMatchingInterest) return false;
      }

      // Age filter
      if (person.ageYears !== undefined) {
        if (person.ageYears < filters.ageRange[0] || person.ageYears > filters.ageRange[1]) {
          return false;
        }
      }

      // Upcoming birthday filter
      if (filters.hasUpcomingBirthday) {
        const today = new Date();
        const birthday = new Date(person.birthday);
        const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
        
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }
        
        const daysUntilBirthday = Math.ceil(
          (thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysUntilBirthday > 30) return false;
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
    if (filters.relationships.length > 0) count++;
    if (filters.budgetRange[0] > 0 || filters.budgetRange[1] < 5000) count++;
    if (filters.interests.length > 0) count++;
    if (filters.ageRange[0] > 0 || filters.ageRange[1] < 100) count++;
    if (filters.hasUpcomingBirthday) count++;
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