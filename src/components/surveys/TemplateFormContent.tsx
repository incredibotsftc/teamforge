'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import type { SurveyTemplate } from '@/types/surveys'
import type { Block } from '@blocknote/core'

// Dynamically import Rich Text editor to avoid SSR issues
const SimpleRichTextEditor = dynamic(
  () => import('./SimpleRichTextEditor').then(mod => ({ default: mod.SimpleRichTextEditor })),
  {
    ssr: false,
    loading: () => <div className="h-48 bg-muted rounded-md animate-pulse" />
  }
)

interface TemplateFormContentProps {
  templateId?: string
  template?: SurveyTemplate
  mode: 'create' | 'edit'
  onSuccess: (templateId: string) => void
}

export function TemplateFormContent({
  templateId,
  template,
  mode = 'create',
  onSuccess
}: TemplateFormContentProps) {
  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [headerImageUrl, setHeaderImageUrl] = useState(template?.header_image_url || '')
  const [footerContent, setFooterContent] = useState<Block[] | null>(
    template?.footer_content ? (template.footer_content as unknown as Block[]) : null
  )
  const [footerHtml, setFooterHtml] = useState(template?.footer_html || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    setIsUploading(true)
    setUploadError('')

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/survey-templates/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload image')
      }

      const { url } = await response.json()
      setHeaderImageUrl(url)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  // Handle removing the header image
  const handleRemoveImage = () => {
    setHeaderImageUrl('')
  }

  // Handle footer content change from BlockNote
  const handleFooterChange = (content: Block[], html: string) => {
    setFooterContent(content)
    setFooterHtml(html)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert('Please enter a template name')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const templateData = {
        name: name.trim(),
        description: description.trim(),
        header_image_url: headerImageUrl || null,
        footer_content: footerContent,
        footer_html: footerHtml || null
      }

      let response
      if (mode === 'edit' && templateId) {
        response = await fetch(`/api/survey-templates/${templateId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(templateData)
        })
      } else {
        response = await fetch('/api/survey-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(templateData)
        })
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save template')
      }

      const { template: savedTemplate } = await response.json()
      onSuccess(savedTemplate.id)
    } catch (error) {
      console.error('Error saving template:', error)
      alert(error instanceof Error ? error.message : 'Failed to save template')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Template Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Standard Survey Template"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of when to use this template"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Header Image</Label>
        <p className="text-sm text-muted-foreground">
          Upload an image that will appear at the top of your surveys. The survey title will be overlaid on this image.
        </p>

        {headerImageUrl ? (
          <div className="relative">
            <div className="relative rounded-lg overflow-hidden border">
              <img
                src={headerImageUrl}
                alt="Header preview"
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                <p className="text-white text-2xl font-bold">Sample Survey Title</p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
              <Label htmlFor="image-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-primary hover:underline">
                  Click to upload
                </span>
                <span className="text-sm text-muted-foreground"> or drag and drop</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, GIF or WebP (max 5MB)
              </p>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
            </div>
          </div>
        )}

        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading image...
          </div>
        )}

        {uploadError && (
          <p className="text-sm text-destructive">{uploadError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Footer Content</Label>
        <p className="text-sm text-muted-foreground">
          Add rich text content that will appear at the bottom of your surveys. You can include formatted text, links, and more.
        </p>
        <div className="border rounded-md">
          <SimpleRichTextEditor
            content={footerContent}
            onChange={handleFooterChange}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="btn-accent">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'edit' ? 'Save Changes' : 'Create Template'}
        </Button>
      </div>
    </form>
  )
}