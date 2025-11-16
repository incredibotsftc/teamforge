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
  content_text: string // Plain text for search
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

export interface NotebookSheet {
  id: string
  team_id: string
  season_id: string
  folder_id?: string
  title: string
  sheet_data_path?: string // Path to Univer workbook JSON in storage
  sheet_data_size?: number // Size of sheet data file in bytes
  column_count?: number // Number of columns for quick metadata
  row_count?: number // Number of rows for quick metadata
  is_pinned: boolean
  sort_order: number
  linked_entity_type?: LinkedEntityType
  linked_entity_id?: string
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
}

export interface CreateSheetData {
  title: string
  folder_id?: string
  linked_entity_type?: LinkedEntityType
  linked_entity_id?: string
}

export interface UpdateSheetData {
  title?: string
  sheet_data_path?: string
  sheet_data_size?: number
  column_count?: number
  row_count?: number
  folder_id?: string
  is_pinned?: boolean
  sort_order?: number
  linked_entity_type?: LinkedEntityType
  linked_entity_id?: string
}

export interface NotebookState {
  folders: NotebookFolder[]
  pages: NotebookPage[]
  sheets: NotebookSheet[]
  currentPage?: NotebookPage
  currentSheet?: NotebookSheet
  currentFolder?: NotebookFolder
  isLoading: boolean
  error?: string
}