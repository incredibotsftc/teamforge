export async function updateExpense(id: string, updates: Partial<Expense>) {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExpense(id: string) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('Supabase delete error:', error)
    throw error
  }
}
import { supabase } from './supabase'
import type { Expense, NewExpense } from '@/types/budget'

export async function createExpense(expense: Omit<NewExpense, 'teamId'>, teamId: string, seasonId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      ...expense,
      team_id: teamId,
      season_id: seasonId,
      amount: Number(expense.amount)
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating expense:', error)
    throw error
  }

  return data
}

export async function getTeamExpenses(teamId: string, seasonId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching expenses:', error)
    throw error
  }

  return data
}
