// Expense category enum type matching database enum
export type ExpenseCategory =
  | 'food'
  | 'events'
  | 'materials'
  | 'tools'
  | 'travel'
  | 'apparel'
  | 'marketing'
  | 'other'

export interface Expense {
  id: string
  team_id: string
  description: string
  amount: number
  category: ExpenseCategory
  date: string
  created_at: string
  created_by: string
}

export interface NewExpense {
  description: string
  amount: number
  category: ExpenseCategory
  date: string
}

export const expenseCategories = [
  { id: 'food' as const, name: 'Food & Refreshments' },
  { id: 'events' as const, name: 'Events & Competition Fees' },
  { id: 'materials' as const, name: 'Robot Materials & Parts' },
  { id: 'tools' as const, name: 'Tools & Equipment' },
  { id: 'travel' as const, name: 'Travel & Transportation' },
  { id: 'apparel' as const, name: 'Team Apparel' },
  { id: 'marketing' as const, name: 'Marketing & Outreach' },
  { id: 'other' as const, name: 'Other' },
] as const

export type ExpenseCategoryInfo = typeof expenseCategories[number]
