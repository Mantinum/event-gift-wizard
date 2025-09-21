import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function useAutoTheme() {
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours();
      const isDayTime = hour >= 6 && hour < 18;
      setTheme(isDayTime ? 'light' : 'dark');
    };

    // Only auto-update if theme preference is auto (you'd get this from preferences)
    // For now, we'll just provide the toggle functionality
    
  }, [setTheme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 
                    theme === 'dark' ? 'light' : 'light';
    setTheme(newTheme);
  };

  return {
    currentPreference: theme as 'light' | 'dark' | 'auto',
    toggleTheme
  };
}