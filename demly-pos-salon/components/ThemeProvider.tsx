"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserId } from '@/hooks/useUserId';

type ThemeMode = 'dark' | 'light' | 'auto';
type ThemeColor = 'emerald' | 'blue' | 'purple' | 'rose' | 'amber' | 'slate';

interface ThemeSettings {
  mode: ThemeMode;
  color: ThemeColor;
  sidebarCollapsed: boolean;
  animationsEnabled: boolean;
}

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (updates: Partial<ThemeSettings>) => Promise<void>;
  toggleSidebar: () => void;
  toggleAnimations: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const userId = useUserId();
  const [settings, setSettings] = useState<ThemeSettings>({
    mode: 'dark',
    color: 'emerald',
    sidebarCollapsed: false,
    animationsEnabled: true,
  });

  // Load theme settings
  useEffect(() => {
    if (!userId) return;

    const loadSettings = async () => {
      const { data } = await supabase
        .from('settings')
        .select('theme_mode, theme_color, sidebar_collapsed, animations_enabled')
        .eq('user_id', userId)
        .single();

      if (data) {
        setSettings({
          mode: (data.theme_mode as ThemeMode) || 'dark',
          color: (data.theme_color as ThemeColor) || 'emerald',
          sidebarCollapsed: data.sidebar_collapsed || false,
          animationsEnabled: data.animations_enabled ?? true,
        });
      }
    };

    loadSettings();
  }, [userId]);

  // Apply theme class to html element
  useEffect(() => {
    const html = document.documentElement;
    
    // Remove all theme classes
    html.classList.remove('dark', 'light');
    
    // Apply current theme
    if (settings.mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      html.classList.add(settings.mode);
    }

    // Apply color scheme class for custom properties
    html.setAttribute('data-theme-color', settings.color);
  }, [settings.mode, settings.color]);

  const updateSettings = async (updates: Partial<ThemeSettings>) => {
    if (!userId) return;

    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    await supabase
      .from('settings')
      .upsert({
        user_id: userId,
        theme_mode: newSettings.mode,
        theme_color: newSettings.color,
        sidebar_collapsed: newSettings.sidebarCollapsed,
        animations_enabled: newSettings.animationsEnabled,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
  };

  const toggleSidebar = () => {
    updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed });
  };

  const toggleAnimations = () => {
    updateSettings({ animationsEnabled: !settings.animationsEnabled });
  };

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, toggleSidebar, toggleAnimations }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};