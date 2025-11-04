'use client'

import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClientWithDefaults } from '@/lib/queryClient'

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient instance once per component mount
  // This prevents recreating the client on every render
  const [queryClient] = useState(() => createQueryClientWithDefaults())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
