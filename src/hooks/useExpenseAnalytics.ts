import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ExpenseData {
  month: string;
  budget: number;
  spent: number;
  events: number;
}

export interface CategoryData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface AnalyticsSummary {
  totalBudget: number;
  totalSpent: number;
  totalEvents: number;
  averagePerEvent: number;
  monthlyGrowth: number;
}

export function useExpenseAnalytics(months: number = 6) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [months]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = startOfMonth(subMonths(new Date(), months - 1));
      
      const [eventsResult, personsResult] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: true }),
        
        supabase
          .from('persons')
          .select('*')
          .eq('user_id', user.id)
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (personsResult.error) throw personsResult.error;

      setEvents(eventsResult.data || []);
      setPersons(personsResult.data || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, ExpenseData>();

    // Initialize months
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM yyyy', { locale: fr });
      
      monthlyMap.set(monthKey, {
        month: monthLabel,
        budget: 0,
        spent: 0,
        events: 0
      });
    }

    // Aggregate events data
    events.forEach(event => {
      const eventDate = new Date(event.date);
      const monthKey = format(eventDate, 'yyyy-MM');
      const data = monthlyMap.get(monthKey);
      
      if (data) {
        data.budget += event.budget || 0;
        data.events += 1;
        
        // For simplicity, assume 70% of budget is spent on average
        // In a real app, you'd track actual spending
        if (event.status === 'completed') {
          data.spent += (event.budget || 0) * 0.7;
        }
      }
    });

    return Array.from(monthlyMap.values());
  }, [events, months]);

  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, { amount: number; count: number }>();
    const totalBudget = events.reduce((sum, event) => sum + (event.budget || 0), 0);

    events.forEach(event => {
      const person = persons.find(p => p.id === event.person_id);
      const category = person?.relationship || 'Autre';
      const budget = event.budget || 0;
      
      const existing = categoryMap.get(category) || { amount: 0, count: 0 };
      categoryMap.set(category, {
        amount: existing.amount + budget,
        count: existing.count + 1
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalBudget > 0 ? (data.amount / totalBudget) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [events, persons]);

  const summary = useMemo((): AnalyticsSummary => {
    const totalBudget = events.reduce((sum, event) => sum + (event.budget || 0), 0);
    const completedEvents = events.filter(e => e.status === 'completed');
    const totalSpent = completedEvents.reduce((sum, event) => sum + (event.budget || 0) * 0.7, 0);
    const totalEvents = events.length;
    const averagePerEvent = totalEvents > 0 ? totalBudget / totalEvents : 0;

    // Calculate growth compared to previous period
    const currentMonth = new Date();
    const lastMonth = subMonths(currentMonth, 1);
    const currentMonthEvents = events.filter(e => 
      format(new Date(e.date), 'yyyy-MM') === format(currentMonth, 'yyyy-MM')
    );
    const lastMonthEvents = events.filter(e => 
      format(new Date(e.date), 'yyyy-MM') === format(lastMonth, 'yyyy-MM')
    );

    const currentMonthBudget = currentMonthEvents.reduce((sum, e) => sum + (e.budget || 0), 0);
    const lastMonthBudget = lastMonthEvents.reduce((sum, e) => sum + (e.budget || 0), 0);
    
    const monthlyGrowth = lastMonthBudget > 0 
      ? ((currentMonthBudget - lastMonthBudget) / lastMonthBudget) * 100 
      : 0;

    return {
      totalBudget,
      totalSpent,
      totalEvents,
      averagePerEvent,
      monthlyGrowth
    };
  }, [events]);

  return {
    monthlyData,
    categoryData,
    summary,
    loading,
    refetch: fetchData
  };
}