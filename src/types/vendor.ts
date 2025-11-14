export interface Vendor {
  id: string
  team_id: string
  name: string
  created_at: string
  created_by: string | null
}

export interface NewVendor {
  name: string
  team_id: string
  created_by?: string
}
