export interface NotebookFolder {
  id: string
  team_id: string
  season_id: string
  parent_folder_id?: string
  name: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string

  // Computed fields
  children?: NotebookFolder[]
  pages?: NotebookPage[]
  page_count?: number
}

export type LinkedEntityType = 'mentoring_session' | 'event' | 'task' | 'scouting_team'

export interface NotebookPage {
  id: string
  team_id: string
  season_id: string
  folder_id?: string
  title: string
  content?: unknown // JSONB content from the editor (legacy, being phased out)
  content_path?: string // Path to content file in storage
  content_size?: number // Size of content file in bytes
  content_text: string | null // Plain text for search
  is_pinned: boolean
  sort_order: number
  linked_entity_type?: LinkedEntityType
  linked_entity_id?: string
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
}

export interface CreateFolderData {
  name: string
  parent_folder_id?: string
  color?: string
}

export interface CreatePageData {
  title: string
  folder_id?: string
  content?: unknown
  linked_entity_type?: LinkedEntityType
  linked_entity_id?: string
}

export interface UpdatePageData {
  title?: string
  content?: unknown // Legacy, being phased out
  content_text?: string // Plain text for search
  content_path?: string // Path to storage file
  content_size?: number // Size of content file
  folder_id?: string
  is_pinned?: boolean
  sort_order?: number
  linked_entity_type?: LinkedEntityType
  linked_entity_id?: string
}

export interface UpdateFolderData {
  name?: string
  color?: string
  parent_folder_id?: string | null
  sort_order?: number
}

export interface NotebookState {
  folders: NotebookFolder[]
  pages: NotebookPage[]
  currentPage?: NotebookPage
  currentFolder?: NotebookFolder
  isLoading: boolean
  error?: string
}