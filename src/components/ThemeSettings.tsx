'use client'

import React from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      description: 'Light mode',
      icon: Sun
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      description: 'Dark mode',
      icon: Moon
    },
    {
      value: 'system' as const,
      label: 'System',
      description: 'Use system preference',
      icon: Monitor
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose how FTC TeamForge looks to you. Select a single theme, or sync with your system and automatically switch between day and night themes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="theme-selection">Theme</Label>
          <div id="theme-selection" className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon
              const isSelected = theme === option.value
              
              return (
                <Button
                  key={option.value}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme(option.value)}
                  className="h-auto flex-col gap-2 p-4"
                >
                  <Icon className="w-5 h-5" />
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
        
        {theme === 'system' && (
          <div className="text-sm text-muted-foreground">
            Currently using <strong>{resolvedTheme}</strong> theme based on your system preference.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
