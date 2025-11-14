import { useState, useEffect } from 'react';

// Helper function to convert hex to RGB values
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '59, 130, 246'; // Default blue RGB
  
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ].join(', ');
}

// Helper function to lighten/darken a hex color
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

export function useAccentColor() {
  const [accentColor, setAccentColor] = useState('#3b82f6');

  // Apply accent color to CSS variables
  const applyAccentColor = (color: string) => {
    try {
      if (!color || typeof color !== 'string') return;

      const root = document.documentElement;
      const rgb = hexToRgb(color);

      // Set main accent color
      root.style.setProperty('--accent-color', color);
      root.style.setProperty('--accent-color-rgb', rgb);

      // Generate hover and light/dark variants
      const hoverColor = adjustBrightness(color, 10);
      const lightColor = adjustBrightness(color, 40);
      const darkColor = adjustBrightness(color, -40);

      root.style.setProperty('--accent-color-hover', hoverColor);
      root.style.setProperty('--accent-color-light', lightColor);
      root.style.setProperty('--accent-color-dark', darkColor);
    } catch (error) {
      console.error('Error applying accent color:', error);
    }
  };

  // Update accent color and apply to DOM
  const updateAccentColor = async (color: string) => {
    setAccentColor(color);
    applyAccentColor(color);
    
    // Save to localStorage for immediate persistence
    localStorage.setItem('accent-color', color);
    
    // Save to database - we'll get the user ID from the settings page
    // This will be called from components that have access to user context
  };

  // Load saved accent color from localStorage on mount
  useEffect(() => {
    const savedColor = localStorage.getItem('accent-color');
    if (savedColor) {
      setAccentColor(savedColor);
      applyAccentColor(savedColor);
    } else {
      // Apply default color
      applyAccentColor('#3b82f6');
    }
  }, []);

  // Save to localStorage whenever color changes
  useEffect(() => {
    localStorage.setItem('accent-color', accentColor);
  }, [accentColor]);

  return {
    accentColor,
    updateAccentColor,
    applyAccentColor
  };
}