'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Palette, ClipboardList } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Survey } from '@/types/surveys'
import { SurveyList } from '@/components/surveys/SurveyList'
import { SurveyFormContent } from '@/components/surveys/SurveyFormContent'
import { TemplateFormContent } from '@/components/surveys/TemplateFormContent'
import { useRouter } from 'next/navigation'
import { getTeamSurveys } from '@/lib/surveys'
import { useAppData } from '@/components/AppDataProvider'
import { useTeamData } from '@/hooks/useTeamData'
import { ProtectedRoute } from '@/components/ProtectedRoute'

function Page() {
  const router = useRouter()
  const { team: currentTeam } = useTeamData()
  const { currentSeason } = useAppData()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isTemplateSheetOpen, setIsTemplateSheetOpen] = useState(false)
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (currentTeam?.id && currentSeason?.id) {
      loadSurveys()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeam?.id, currentSeason?.id])

  const loadSurveys = async () => {
    console.log('loadSurveys - currentTeam:', currentTeam)
    console.log('loadSurveys - currentSeason:', currentSeason)

    if (!currentTeam?.id || !currentSeason?.id) {
      console.warn('Skipping survey load - missing team or season:', {
        hasTeam: !!currentTeam?.id,
        hasSeason: !!currentSeason?.id
      })
      return
    }

    try {
      setIsLoading(true)
      const data = await getTeamSurveys(currentTeam.id, currentSeason.id)
      setSurveys(data || [])
    } catch (error) {
      console.error('Error loading surveys:', error)
      alert('Failed to load surveys')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCreateSurvey = () => {
    setEditingSurveyId(null)
    setIsSheetOpen(true)
  }

  const handleOpenEditSurvey = (surveyId: string) => {
    router.push(`/surveys/${surveyId}`)
  }

  const handleViewResponses = (surveyId: string) => {
    router.push(`/surveys/${surveyId}/responses`)
  }

  const handleDeleteSurvey = async (surveyId: string) => {
    if (!confirm('Are you sure you want to delete this survey? This will also delete all responses.')) {
      return
    }

    try {
      const { deleteSurvey } = await import('@/lib/surveys')
      await deleteSurvey(surveyId)
      await loadSurveys()
    } catch (error) {
      console.error('Error deleting survey:', error)
      alert('Failed to delete survey')
    }
  }

  const handleSuccess = async (surveyId?: string) => {
    setIsSheetOpen(false)
    setEditingSurveyId(null)

    if (surveyId) {
      // Redirect to builder page for newly created survey
      router.push(`/surveys/${surveyId}`)
    } else {
      // Just reload the list for updates
      await loadSurveys()
    }
  }

  const handleOpenTemplateCreation = () => {
    setIsTemplateSheetOpen(true)
  }

  const handleTemplateSuccess = () => {
    setIsTemplateSheetOpen(false)
    // Optionally show a success message
    alert('Template created successfully!')
  }

  const actions = (
    <div className="flex gap-2">
      <Button onClick={handleOpenTemplateCreation} className="btn-accent">
        <Palette className="h-4 w-4 mr-2" />
        Create Template
      </Button>
      <Button onClick={handleOpenCreateSurvey} className="btn-accent">
        <Plus className="h-4 w-4 mr-2" />
        Create Survey
      </Button>
    </div>
  )

  return (
    <ProtectedRoute>
      <DashboardLayout
        pageTitle="Surveys"
        pageIcon={ClipboardList}
        actions={actions}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Surveys</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search surveys..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading surveys...</p>
            ) : (
              <SurveyList
                surveys={surveys}
                onEdit={handleOpenEditSurvey}
                onDelete={handleDeleteSurvey}
                onViewResponses={handleViewResponses}
                searchQuery={searchQuery}
              />
            )}
          </CardContent>
        </Card>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
            <SheetHeader className="p-0 mb-1">
              <SheetTitle>
                {editingSurveyId ? 'Edit Survey' : 'Create New Survey'}
              </SheetTitle>
            </SheetHeader>
            <SurveyFormContent
              surveyId={editingSurveyId || undefined}
              mode={editingSurveyId ? 'edit' : 'create'}
              onSuccess={handleSuccess}
            />
          </SheetContent>
        </Sheet>

        <Sheet open={isTemplateSheetOpen} onOpenChange={setIsTemplateSheetOpen}>
          <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-6">
            <SheetHeader className="p-0 mb-1">
              <SheetTitle>Create Survey Template</SheetTitle>
            </SheetHeader>
            <TemplateFormContent
              mode="create"
              onSuccess={handleTemplateSuccess}
            />
          </SheetContent>
        </Sheet>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

export default Page
