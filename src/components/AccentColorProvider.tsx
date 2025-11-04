'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

interface AccentColorContextType {
  accentColor: string;
  updateAccentColor: (color: string) => void;
  applyAccentColor: (color: string) => void;
}

const AccentColorContext = createContext<AccentColorContextType | undefined>(undefined);

export function useAccentColorContext() {
  const context = useContext(AccentColorContext);
  if (context === undefined) {
    throw new Error('useAccentColorContext must be used within an AccentColorProvider');
  }
  return context;
}

interface AccentColorProviderProps {
  children: ReactNode;
}

export function AccentColorProvider({ children }: AccentColorProviderProps) {
  const { accentColor, updateAccentColor, applyAccentColor } = useAccentColor();
  const { user } = useAuth();

  // Enhanced updateAccentColor that saves to database
  const updateAccentColorWithSave = async (color: string) => {
    // Update locally first
    updateAccentColor(color);

    // Save to database if user is logged in
    if (user?.id) {
      try {
        // Get the current user's session token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          return;
        }

        // Get current settings
        const getResponse = await fetch(`/api/user-settings?userId=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (getResponse.ok) {
          const getData = await getResponse.json();
          if (getData.success) {
            // Update settings with new accent color
            await fetch('/api/user-settings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                userId: user.id,
                settings: {
                  ...getData.settings,
                  accent_color: color
                }
              })
            });
          }
        }
      } catch {
        // Silently fail if settings can't be saved
      }
    }
  };

  // Load accent color from user settings if logged in
  useEffect(() => {
    const loadUserAccentColor = async () => {
      if (!user?.id) return;

      try {
        // Get the current user's session token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          return;
        }

        const response = await fetch(`/api/user-settings?userId=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings?.accent_color) {
            updateAccentColor(data.settings.accent_color);
          }
        }
      } catch {
        // Silently fail if settings can't be loaded
      }
    };

    loadUserAccentColor();
  // Only run when user.id changes, not when updateAccentColor changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <AccentColorContext.Provider 
      value={{ 
        accentColor, 
        updateAccentColor: updateAccentColorWithSave, 
        applyAccentColor 
      }}
    >
      {children}
    </AccentColorContext.Provider>
  );
}