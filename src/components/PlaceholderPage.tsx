'use client'

import React from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Construction, Lightbulb } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  description?: string
  features?: string[]
}

export function PlaceholderPage({ title, icon: Icon, description, features }: PlaceholderPageProps) {
  return (
    <DashboardLayout pageTitle={title} pageIcon={Icon}>
      <div className="space-y-6">
        {/* Coming Soon Banner */}
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Construction className="w-16 h-16 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Coming Soon</h1>
            <p className="text-muted-foreground text-lg mb-6">
              The <strong>{title}</strong> feature is currently under development.
            </p>
            {description && (
              <p className="text-muted-foreground max-w-2xl">
                {description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Planned Features */}
        {features && features.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Planned Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Development Timeline */}
        <Card className="bg-muted/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              This feature is planned for a future release. Stay tuned for updates!
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}