'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NotebookFolder } from '@/types/notebook'
import { FolderPlus, Loader2 } from 'lucide-react'

interface FolderDialogProps {
  folders: NotebookFolder[]
  onCreateFolder: (data: { name: string; parent_folder_id?: string; color?: string }) => Promise<void>
  onUpdateFolder?: (id: string, data: { name?: string; parent_folder_id?: string | null; color?: string }) => Promise<void>
  trigger?: React.ReactNode
  editFolder?: NotebookFolder
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const FOLDER_COLORS = [
  { name: 'Blue', value: '#6366f1' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Gray', value: '#6b7280' },
]

export function FolderDialog({ folders, onCreateFolder, onUpdateFolder, trigger, editFolder, open: controlledOpen, onOpenChange: controlledOnOpenChange }: FolderDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [name, setName] = useState('')
  const [parentFolderId, setParentFolderId] = useState<string>('__root__')
  const [color, setColor] = useState(FOLDER_COLORS[0].value)
  const [isLoading, setIsLoading] = useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen

  // Update form when editFolder changes
  React.useEffect(() => {
    if (editFolder && open) {
      setName(editFolder.name)
      setParentFolderId(editFolder.parent_folder_id || '__root__')
      setColor(editFolder.color)
    } else if (!open) {
      // Reset form when dialog closes
      setName('')
      setParentFolderId('__root__')
      setColor(FOLDER_COLORS[0].value)
    }
  }, [editFolder, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      if (editFolder && onUpdateFolder) {
        // Update existing folder
        await onUpdateFolder(editFolder.id, {
          name: name.trim(),
          parent_folder_id: parentFolderId === '__root__' ? null : (parentFolderId || null),
          color
        })
      } else {
        // Create new folder
        await onCreateFolder({
          name: name.trim(),
          parent_folder_id: parentFolderId === '__root__' ? undefined : parentFolderId || undefined,
          color
        })
      }

      // Reset form
      setName('')
      setParentFolderId('__root__')
      setColor(FOLDER_COLORS[0].value)
      setOpen(false)
    } catch (error) {
      console.error('Error saving folder:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Flatten folders for parent selection (recursive)
  const getFlatFolders = (folders: NotebookFolder[], level = 0): Array<{ folder: NotebookFolder; level: number }> => {
    const result: Array<{ folder: NotebookFolder; level: number }> = []

    folders.forEach(folder => {
      result.push({ folder, level })
      if (folder.children && folder.children.length > 0) {
        result.push(...getFlatFolders(folder.children, level + 1))
      }
    })

    return result
  }

  const flatFolders = getFlatFolders(folders)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" size="sm">
            <FolderPlus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">New Folder</span>
            <span className="sm:hidden">Folder</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editFolder ? 'Edit Folder' : 'Create New Folder'}</DialogTitle>
          <DialogDescription>
            {editFolder ? 'Update folder name, color, or parent folder.' : 'Organize your notes by creating folders and subfolders.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent-folder">Parent Folder (Optional)</Label>
            <Select value={parentFolderId} onValueChange={setParentFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">No parent (root level)</SelectItem>
                {flatFolders.map(({ folder, level }) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <span style={{ paddingLeft: `${level * 16}px` }}>
                      {'  '.repeat(level)}📁 {folder.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder-color">Color</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === colorOption.value
                      ? 'border-foreground scale-110'
                      : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editFolder ? 'Update Folder' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}