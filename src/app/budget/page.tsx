'use client'

import { ExpenseFormContent } from '@/components/budget/ExpenseFormContent'
import { FundraisingFormContent } from '@/components/budget/FundraisingFormContent'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { getTeamExpenses } from '@/lib/expenses'
import { getTeamFundraising } from '@/lib/fundraising'
import { useTeamData } from '@/hooks/useTeamData'
import { useAppData } from '@/components/AppDataProvider'
import { useState, useEffect } from 'react'
import type { Expense } from '@/types/budget'
import type { Fundraising } from '@/types/fundraising'
import { ExpenseList } from '@/components/budget/ExpenseList'
import { ExpensePieChart } from '@/components/budget/ExpensePieChart'
import { ExpenseBarChart } from '@/components/budget/ExpenseBarChart'
import { FundraisingList } from '@/components/budget/FundraisingList'
import { FundraisingSourceChart } from '@/components/budget/FundraisingSourceChart'
import { Plus, DollarSign, TrendingUp } from 'lucide-react'

function Page() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [fundraising, setFundraising] = useState<Fundraising[]>([])
  const { team: currentTeam } = useTeamData()
  const { currentSeason } = useAppData()
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false)
  const [isFundraisingSheetOpen, setIsFundraisingSheetOpen] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingFundraisingId, setEditingFundraisingId] = useState<string | null>(null)
  const [fundraisingSearch, setFundraisingSearch] = useState('')
  const [expenseSearch, setExpenseSearch] = useState('')

  useEffect(() => {
    if (currentTeam?.id && currentSeason?.id) {
      loadExpenses()
      loadFundraising()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeam?.id, currentSeason?.id])

  const loadExpenses = async () => {
    if (!currentTeam?.id || !currentSeason?.id) return
    try {
      const data = await getTeamExpenses(currentTeam.id, currentSeason.id)
      setExpenses(data)
    } catch (error) {
      console.error('Error loading expenses:', error)
      alert('Failed to load expenses')
    }
  }

  const loadFundraising = async () => {
    if (!currentTeam?.id || !currentSeason?.id) return
    try {
      const data = await getTeamFundraising(currentTeam.id, currentSeason.id)
      setFundraising(data)
    } catch (error) {
      console.error('Error loading fundraising:', error)
      alert('Failed to load fundraising')
    }
  }

  const handleOpenCreateExpense = () => {
    setEditingExpenseId(null)
    setIsExpenseSheetOpen(true)
  }

  const handleOpenEditExpense = (expenseId: string) => {
    setEditingExpenseId(expenseId)
    setIsExpenseSheetOpen(true)
  }

  const handleSuccess = async () => {
    setIsExpenseSheetOpen(false)
    setEditingExpenseId(null)
    // Refresh expenses after successful save/delete
    await loadExpenses()
  }

  const handleCloseSheet = () => {
    setIsExpenseSheetOpen(false)
    setEditingExpenseId(null)
  }

  const handleOpenCreateFundraising = () => {
    setEditingFundraisingId(null)
    setIsFundraisingSheetOpen(true)
  }

  const handleOpenEditFundraising = (fundraisingId: string) => {
    setEditingFundraisingId(fundraisingId)
    setIsFundraisingSheetOpen(true)
  }

  const handleFundraisingSuccess = async () => {
    setIsFundraisingSheetOpen(false)
    setEditingFundraisingId(null)
    await loadFundraising()
  }

  const handleCloseFundraisingSheet = () => {
    setIsFundraisingSheetOpen(false)
    setEditingFundraisingId(null)
  }

  const totalFundsRaised = fundraising.reduce((sum, item) => sum + Number(item.amount_received), 0)

  const actions = (
    <div className="flex gap-2">
      <Button className="btn-accent" onClick={handleOpenCreateFundraising}>
        <TrendingUp className="w-4 h-4 mr-2" />
        Track Fundraising
      </Button>
      <Button className="btn-accent" onClick={handleOpenCreateExpense}>
        <Plus className="w-4 h-4 mr-2" />
        Add Expense
      </Button>
    </div>
  )

  return (
    <DashboardLayout
      pageTitle="Budget & Expenses"
      pageIcon={DollarSign}
      actions={actions}
    >
      <div className="space-y-4">

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Total Funds Raised</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="text-3xl font-bold text-green-600">
                ${totalFundsRaised.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="text-3xl font-bold text-red-600">
                ${expenses.reduce((sum, exp) => sum + Number(exp.amount), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Net Balance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="text-3xl font-bold">
                ${(totalFundsRaised - expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Financial Overview</h2>

          {/* All Charts in One Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {/* Fundraising by Source */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Funds by Source</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <FundraisingSourceChart fundraising={fundraising} />
              </CardContent>
            </Card>

            {/* Expense Category Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Expense Categories</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <ExpensePieChart expenses={expenses} />
              </CardContent>
            </Card>

            {/* Monthly Expenses */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Expenses Per Month</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <ExpenseBarChart expenses={expenses} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fundraising Section */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Fundraising</h2>

          {/* Fundraising List */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base font-medium">Fundraising Records</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={fundraisingSearch}
                    onChange={(e) => setFundraisingSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <FundraisingList
                fundraising={fundraising}
                onEdit={handleOpenEditFundraising}
                searchQuery={fundraisingSearch}
              />
            </CardContent>
          </Card>
        </div>

        {/* Expenses Section */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Expenses</h2>

        {/* Expense List */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base font-medium">Recent Expenses</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ExpenseList
              expenses={expenses}
              onEdit={handleOpenEditExpense}
              searchQuery={expenseSearch}
            />
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Expense Sheet */}
      <Sheet open={isExpenseSheetOpen} onOpenChange={(open) => {
        if (!open) handleCloseSheet()
      }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
          <SheetHeader className="p-0 mb-1">
            <SheetTitle>{editingExpenseId ? 'Edit Expense' : 'Create Expense'}</SheetTitle>
          </SheetHeader>
          <ExpenseFormContent
            mode={editingExpenseId ? 'edit' : 'create'}
            expenseId={editingExpenseId || undefined}
            onSuccess={handleSuccess}
          />
        </SheetContent>
      </Sheet>

      {/* Fundraising Sheet */}
      <Sheet open={isFundraisingSheetOpen} onOpenChange={(open) => {
        if (!open) handleCloseFundraisingSheet()
      }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
          <SheetHeader className="p-0 mb-1">
            <SheetTitle>{editingFundraisingId ? 'Edit Fundraising' : 'Track Fundraising'}</SheetTitle>
          </SheetHeader>
          <FundraisingFormContent
            mode={editingFundraisingId ? 'edit' : 'create'}
            fundraisingId={editingFundraisingId || undefined}
            onSuccess={handleFundraisingSuccess}
          />
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  )
}

export default Page
