import { supabase } from '@/lib/supabase'
import type { Fundraising, NewFundraising } from '@/types/fundraising'

/**
 * Get all fundraising records for a team in a specific season
 */
export async function getTeamFundraising(
  teamId: string,
  seasonId: string
): Promise<Fundraising[]> {
  const { data, error } = await supabase
    .from('fundraising')
    .select('*')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching fundraising:', error)
    throw error
  }

  return data || []
}

/**
 * Get a single fundraising record by ID
 */
export async function getFundraisingById(id: string): Promise<Fundraising | null> {
  const { data, error } = await supabase
    .from('fundraising')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching fundraising:', error)
    throw error
  }

  return data
}

/**
 * Create a new fundraising record
 */
export async function createFundraising(
  fundraisingData: NewFundraising,
  teamId: string,
  seasonId: string,
  userId: string
): Promise<Fundraising> {
  const { data, error } = await supabase
    .from('fundraising')
    .insert({
      ...fundraisingData,
      team_id: teamId,
      season_id: seasonId,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating fundraising:', error)
    throw error
  }

  return data
}

/**
 * Update an existing fundraising record
 */
export async function updateFundraising(
  id: string,
  fundraisingData: Partial<NewFundraising>,
  userId: string
): Promise<Fundraising> {
  const { data, error } = await supabase
    .from('fundraising')
    .update({
      ...fundraisingData,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating fundraising:', error)
    throw error
  }

  return data
}

/**
 * Delete a fundraising record
 */
export async function deleteFundraising(id: string): Promise<void> {
  const { error } = await supabase
    .from('fundraising')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting fundraising:', error)
    throw error
  }
}

/**
 * Get total funds raised for a team in a season
 */
export async function getTotalFundsRaised(
  teamId: string,
  seasonId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('fundraising')
    .select('amount_received')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)

  if (error) {
    console.error('Error calculating total funds raised:', error)
    throw error
  }

  return data?.reduce((sum, record) => sum + (record.amount_received || 0), 0) || 0
}

/**
 * Get fundraising summary by status
 */
export async function getFundraisingSummaryByStatus(
  teamId: string,
  seasonId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('fundraising')
    .select('status, amount_received')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)

  if (error) {
    console.error('Error fetching fundraising summary:', error)
    throw error
  }

  const summary: Record<string, number> = {}
  data?.forEach((record) => {
    const status = record.status
    summary[status] = (summary[status] || 0) + (record.amount_received || 0)
  })

  return summary
}

/**
 * Get fundraising summary by source type
 */
export async function getFundraisingSummaryBySource(
  teamId: string,
  seasonId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('fundraising')
    .select('source_type, amount_received')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)

  if (error) {
    console.error('Error fetching fundraising summary:', error)
    throw error
  }

  const summary: Record<string, number> = {}
  data?.forEach((record) => {
    const sourceType = record.source_type
    summary[sourceType] = (summary[sourceType] || 0) + (record.amount_received || 0)
  })

  return summary
}
