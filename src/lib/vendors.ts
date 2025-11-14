import { supabase } from './supabase'
import type { Vendor, NewVendor } from '@/types/vendor'

/**
 * Get all vendors for a team
 */
export async function getTeamVendors(teamId: string): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('team_id', teamId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching vendors:', error)
    throw error
  }

  return data || []
}

/**
 * Search vendors by name (for autocomplete)
 */
export async function searchVendors(teamId: string, searchQuery: string): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('team_id', teamId)
    .ilike('name', `%${searchQuery}%`)
    .order('name', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Error searching vendors:', error)
    throw error
  }

  return data || []
}

/**
 * Get or create a vendor by name
 * Returns the vendor ID
 */
export async function getOrCreateVendor(
  teamId: string,
  vendorName: string,
  userId?: string
): Promise<string> {
  if (!vendorName.trim()) {
    throw new Error('Vendor name is required')
  }

  const trimmedName = vendorName.trim()

  // First, try to find existing vendor (case-insensitive)
  const { data: existingVendors, error: searchError } = await supabase
    .from('vendors')
    .select('id')
    .eq('team_id', teamId)
    .ilike('name', trimmedName)
    .limit(1)

  if (searchError) {
    console.error('Error searching for vendor:', searchError)
    throw searchError
  }

  // If vendor exists, return its ID
  if (existingVendors && existingVendors.length > 0) {
    return existingVendors[0].id
  }

  // Otherwise, create new vendor
  const newVendor: NewVendor = {
    team_id: teamId,
    name: trimmedName,
    created_by: userId,
  }

  const { data: createdVendor, error: createError } = await supabase
    .from('vendors')
    .insert(newVendor)
    .select('id')
    .single()

  if (createError) {
    console.error('Error creating vendor:', createError)
    throw createError
  }

  if (!createdVendor) {
    throw new Error('Failed to create vendor')
  }

  return createdVendor.id
}

/**
 * Get vendor by ID
 */
export async function getVendorById(vendorId: string): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .single()

  if (error) {
    console.error('Error fetching vendor:', error)
    return null
  }

  return data
}
