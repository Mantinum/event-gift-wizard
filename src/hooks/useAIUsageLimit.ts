import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

export interface AIUsageInfo {
  dailyLimit: number;
  remaining: number;
  used: number;
  role: string;
  resetTime?: string;
  isUnlimited: boolean;
}

export const useAIUsageLimit = () => {
  const [usageInfo, setUsageInfo] = useState<AIUsageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useProfile();

  const fetchUsageInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUsageInfo(null);
        return;
      }

      // For premium users and admins, no limits
      if (profile?.role && ['admin', 'premium_1', 'premium_2'].includes(profile.role)) {
        setUsageInfo({
          dailyLimit: -1,
          remaining: -1,
          used: 0,
          role: profile.role,
          isUnlimited: true
        });
        return;
      }

      // Get today's usage for free users
      const { data: usageData, error: usageError } = await supabase
        .from('ai_usage_limits')
        .select('generation_count')
        .eq('user_id', user.id)
        .eq('usage_date', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (usageError) {
        throw usageError;
      }

      const dailyLimit = 5;
      const used = usageData?.generation_count || 0;
      const remaining = Math.max(0, dailyLimit - used);

      setUsageInfo({
        dailyLimit,
        remaining,
        used,
        role: profile?.role || 'free',
        isUnlimited: false,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    } catch (err) {
      console.error('Error fetching AI usage info:', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsage = () => {
    fetchUsageInfo();
  };

  useEffect(() => {
    if (profile) {
      fetchUsageInfo();
    }
  }, [profile]);

  return {
    usageInfo,
    loading,
    error,
    refreshUsage,
  };
};