'use client'

import React, { useEffect } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { useTheme } from '@/components/ThemeProvider'
import type { Block } from '@blocknote/core'

interface SimpleRichTextEditorProps {
  content: Block[] | null | undefined
  onChange: (content: Block[], html: string) => void
}

export function SimpleRichTextEditor({
  content,
  onChange
}: SimpleRichTextEditorProps) {
  const { resolvedTheme } = useTheme()

  const editor = useCreateBlockNote({
    initialContent: content as Block[] | undefined,
    uploadFile: undefined // Disable file uploads for simplicity
  })

  // Handle content changes
  useEffect(() => {
    const handleChange = async () => {
      const blocks = editor.document
      const html = await editor.blocksToHTMLLossy(blocks)
      onChange(blocks, html)
    }

    editor.onChange(handleChange)
  }, [editor, onChange])

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      data-theming-css
      editable={true}
    />
  )
}