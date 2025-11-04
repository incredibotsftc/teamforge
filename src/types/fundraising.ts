export type FundraisingSourceType =
  | 'corporate_sponsor'
  | 'grant'
  | 'individual_donation'
  | 'fundraiser_event'
  | 'crowdfunding'
  | 'merchandise_sales'
  | 'parent_organization'
  | 'other'

export type FundraisingStatus =
  | 'prospecting'      // Initial contact/research phase
  | 'pending'          // Application/proposal submitted
  | 'committed'        // Commitment received but funds not yet received
  | 'received'         // Funds received
  | 'declined'         // Proposal declined
  | 'cancelled'        // Cancelled by either party

export interface Fundraising {
  id: string
  team_id: string
  season_id: string

  // Source information
  source_type: FundraisingSourceType
  source_name: string           // Company/Organization/Individual name

  // Contact information
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null

  // Financial details
  amount_requested?: number | null
  amount_committed?: number | null
  amount_received: number

  // Timeline
  date_contacted?: string | null
  date_committed?: string | null
  date_received?: string | null
  deadline?: string | null       // Application/proposal deadline

  // Status and tracking
  status: FundraisingStatus

  // Additional details
  description?: string | null    // What the sponsorship/grant is for
  notes?: string | null
  recognition_type?: string | null // How sponsor wants to be recognized
  recurring?: boolean            // Is this a recurring sponsorship?

  // Metadata
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
}

export interface NewFundraising {
  source_type: FundraisingSourceType
  source_name: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  amount_requested?: number
  amount_committed?: number
  amount_received: number
  date_contacted?: string
  date_committed?: string
  date_received?: string
  deadline?: string
  status: FundraisingStatus
  description?: string
  notes?: string
  recognition_type?: string
  recurring?: boolean
}

export const fundraisingSourceTypes = [
  { id: 'corporate_sponsor', name: 'Corporate Sponsor' },
  { id: 'grant', name: 'Grant' },
  { id: 'individual_donation', name: 'Individual Donation' },
  { id: 'fundraiser_event', name: 'Fundraiser Event' },
  { id: 'crowdfunding', name: 'Crowdfunding' },
  { id: 'merchandise_sales', name: 'Merchandise Sales' },
  { id: 'parent_organization', name: 'Parent Organization' },
  { id: 'other', name: 'Other' },
] as const

export const fundraisingStatuses = [
  { id: 'prospecting', name: 'Prospecting', description: 'Initial contact/research phase' },
  { id: 'pending', name: 'Pending', description: 'Application/proposal submitted' },
  { id: 'committed', name: 'Committed', description: 'Commitment received, awaiting funds' },
  { id: 'received', name: 'Received', description: 'Funds received' },
  { id: 'declined', name: 'Declined', description: 'Proposal declined' },
  { id: 'cancelled', name: 'Cancelled', description: 'Cancelled by either party' },
] as const
