'use client'

import { NotebookProvider } from '@/components/NotebookProvider'

export default function NotebookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NotebookProvider>
      {children}
    </NotebookProvider>
  )
}
