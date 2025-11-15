"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, Printer, Loader2 } from 'lucide-react'
import { useAppData } from '@/components/AppDataProvider'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

type QuestionType = 'text' | 'number' | 'multiple-choice' | 'checkbox' | 'scale' | 'long-text' | 'image' | 'field'

interface Question {
  id: string
  text: string
  type?: QuestionType
  options?: string[]
  scaleMin?: number
  scaleMax?: number
}

function ScoutingSheetPrintContent() {
  const router = useRouter()
  const { team } = useAppData()
  const searchParams = useSearchParams()

  const printPreviewKey = `scouting_sheet_print_preview_${team?.team_number || 'anonymous'}`
  const templatesKey = `scouting_sheet_templates_${team?.team_number || 'anonymous'}`
  const storageKey = `scouting_sheet_questions_${team?.team_number || 'anonymous'}`

  const [templateName, setTemplateName] = useState<string>('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [fillingTeamNumber, setFillingTeamNumber] = useState<string>(team?.team_number ? String(team.team_number) : '')
  const [responses, setResponses] = useState<Record<string, string | number | string[]>>({})
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [eventCode, setEventCode] = useState<string>('')
  const { user } = useAuth()

  const responsesKeyFor = (filler: string) => `scouting_sheet_responses_${filler || 'anonymous'}`

  useEffect(() => {
    try {
      // prefer explicit print preview key
      const raw = localStorage.getItem(printPreviewKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        setTemplateName(parsed.templateName || '')
        setQuestions(parsed.questions || [])
        // load responses for current filler team
        try {
          const key = responsesKeyFor(fillingTeamNumber)
          const rawResp = localStorage.getItem(key)
          if (rawResp) setResponses(JSON.parse(rawResp))
        } catch {
          // ignore
        }
        return
      }

      // If a pageId is provided in the URL, load template from notebook_pages.content_text
      const pageId = searchParams.get('pageId')
      if (pageId) {
        ;(async () => {
          try {
            const { data, error } = await supabase
              .from('notebook_pages')
              .select('content_text, title')
              .eq('id', pageId)
              .maybeSingle()

            if (error) {
              console.error('Error fetching notebook page for print:', error)
            } else if (data && data.content_text) {
              try {
                const parsed = JSON.parse(data.content_text)
                setTemplateName(parsed.templateName || data.title || '')
                setQuestions(parsed.questions || [])
                try {
                  const key = responsesKeyFor(fillingTeamNumber)
                  const rawResp = localStorage.getItem(key)
                  if (rawResp) setResponses(JSON.parse(rawResp))
                } catch {
                  // ignore
                }
                return
              } catch (err) {
                console.error('Failed to parse content_text as JSON for print page', err)
              }
            }
          } catch (err) {
            console.error('Failed to load notebook page for print', err)
          }
        })()
      }

      // fallback to templates or session stored questions
      const rawTemplates = localStorage.getItem(templatesKey)
      if (rawTemplates) {
        const t = JSON.parse(rawTemplates)
        if (Array.isArray(t) && t.length > 0) {
          setTemplateName(t[0].name || '')
          setQuestions(t[0].questions || [])
          try {
            const key = responsesKeyFor(fillingTeamNumber)
            const rawResp = localStorage.getItem(key)
            if (rawResp) setResponses(JSON.parse(rawResp))
          } catch {
            // ignore
          }
          return
        }
      }

      const rawSession = sessionStorage.getItem(storageKey)
      if (rawSession) {
        setQuestions(JSON.parse(rawSession))
      }
    } catch (err) {
      console.error('Failed to load print preview data', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printPreviewKey, templatesKey, storageKey])

  // Load saved response + template from DB when eventCode and fillingTeamNumber change
  useEffect(() => {
    if (!eventCode.trim() || !fillingTeamNumber.trim()) {
      return
    }

    ;(async () => {
      try {
        console.log(`[DB Load] Querying with eventCode="${eventCode.trim()}" scouted_team_number=${Number(fillingTeamNumber)}`)
        
        const res = await supabase
          .from('scouting_responses')
          .select('responses, questions, template_id')
          .eq('event_code', eventCode.trim())
          .eq('scouted_team_number', Number(fillingTeamNumber))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        console.log('[DB Load] Full Supabase response:', res)

        if (res.error) {
          console.error('Failed to load saved responses from DB - error:', JSON.stringify(res.error, null, 2))
          return
        }

        if (res.data) {
          console.log('Loaded saved response from DB:', res.data)
          // restore both questions and responses from the saved record
          if (res.data.questions && Array.isArray(res.data.questions)) {
            setQuestions(res.data.questions)
          }
          if (res.data.responses) {
            setResponses(res.data.responses)
          }
        } else {
          console.log('[DB Load] No data found (record may not exist yet)')
        }
      } catch (err) {
        console.error('Error loading responses from DB:', err)
      }
    })()
  }, [eventCode, fillingTeamNumber])

  const handlePrint = () => {
    // simple print; user can choose "Save as PDF"
    window.print()
  }

  const setResponse = (questionId: string, value: string | number | string[]) => {
    setResponses(prev => {
      const next = { ...prev, [questionId]: value }
      try {
        if (fillingTeamNumber) {
          localStorage.setItem(responsesKeyFor(fillingTeamNumber), JSON.stringify(next))
        }
      } catch {
        // ignore
      }
      return next
    })
  }

  const saveResponsesToDb = async () => {
    if (!fillingTeamNumber) {
      setSavedMessage('Enter scouted team number')
      setTimeout(() => setSavedMessage(null), 2000)
      return
    }
    if (!eventCode.trim()) {
      setSavedMessage('Enter event code (required)')
      setTimeout(() => setSavedMessage(null), 2000)
      return
    }

    // require authenticated user to avoid RLS rejections
    if (!user || !user.id) {
      setSavedMessage('Sign in to save to DB')
      setTimeout(() => setSavedMessage(null), 2000)
      return
    }

    try {
      // keep local copy
      localStorage.setItem(responsesKeyFor(fillingTeamNumber), JSON.stringify(responses))

      console.log('[Save] eventCode state:', eventCode, '| trimmed:', eventCode.trim())
      
      const payload = {
        template_id: null as string | null,
        scouted_team_number: fillingTeamNumber ? Number(fillingTeamNumber) : null,
        event_code: eventCode.trim(),
        match_number: null as number | null,
        practice_match: false,
        responses: responses,
        notes: null,
        scout_team_id: team?.id || null,
        template_version: 1,
        created_by: user.id
      }

      console.log('[Save] Payload being sent:', payload)

      // Try to insert and return the created row(s)
      const res = await supabase.from('scouting_responses').insert([payload]).select('*')
      // log full response for debugging
      console.log('scouting_responses.insert result', res)
      if (res.error) {
        // Try to show useful details
        try {
          console.error('Failed to save responses to DB', JSON.stringify(res.error, null, 2))
        } catch {
          console.error('Failed to save responses to DB', res.error)
        }
        setSavedMessage('Failed to save to DB: ' + (res.error.message || 'unknown'))
      } else if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setSavedMessage('✓ Saved to DB')
      } else {
        // Unexpected empty response
        console.warn('Insert completed but no data returned', res)
        setSavedMessage('Saved (no server confirmation)')
      }
    } catch (err) {
      console.error('Failed to save responses', err)
      setSavedMessage('Failed to save')
    }

    setTimeout(() => setSavedMessage(null), 2500)
  }

  const exportResponses = () => {
    const payload = {
      fillerTeam: fillingTeamNumber || null,
      templateName: templateName || null,
      questions,
      responses,
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scouting_responses_${fillingTeamNumber || 'anon'}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/scouting/template')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">{templateName || 'Scouting Sheet'}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardContent>
            <div className="mb-6">
              <div className="text-sm text-muted-foreground">Team: {team?.team_number || '—'}</div>
              <div className="text-sm text-muted-foreground">Date: {new Date().toLocaleDateString()}</div>
            </div>

            {/* Controls for filling (hidden when printing) */}
            <div className="mb-4 no-print flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">Scouted team #</div>
                <Input value={fillingTeamNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFillingTeamNumber(e.target.value)} className="w-36" placeholder="Team number" />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">Event code</div>
                <Input value={eventCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEventCode(e.target.value)} className="w-40" placeholder="e.g., MABOS2025" />
              </div>
              <Button onClick={saveResponsesToDb} variant="outline" size="sm">Save Responses</Button>
              <Button onClick={exportResponses} variant="outline" size="sm">Export Responses</Button>
              {savedMessage && <div className="text-sm font-medium text-green-600 ml-2">{savedMessage}</div>}
            </div>

            {/* Field image option removed */}

            <div className="space-y-6">
              {questions.map((q, idx) => {
                const type = q.type || 'text'
                return (
                  <div key={q.id} className="">
                    <div className="mb-2 font-medium text-base">{idx+1}. {q.text}</div>
                    <div className="border rounded p-3 min-h-[4rem]">
                      {type === 'text' && (
                        <Input value={responses[q.id] || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResponse(q.id, e.target.value)} />
                      )}
                      {type === 'number' && (
                        <Input type="number" value={responses[q.id] ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResponse(q.id, e.target.value ? Number(e.target.value) : '')} />
                      )}
                      {type === 'long-text' && (
                        <textarea className="w-full h-24 p-2" value={responses[q.id] || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResponse(q.id, e.target.value)} />
                      )}
                      {type === 'multiple-choice' && q.options && (
                        <div className="space-y-2">
                            {q.options.filter(o => o).map((opt, i) => (
                            <label key={i} className="flex items-center gap-2">
                              <input type="radio" name={`mc-${q.id}`} checked={responses[q.id] === opt} onChange={() => setResponse(q.id, opt)} />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {type === 'checkbox' && q.options && (
                        <div className="space-y-2">
                          {q.options.filter(o => o).map((opt, i) => (
                            <label key={i} className="flex items-center gap-2">
                              <input type="checkbox" checked={Array.isArray(responses[q.id]) ? (responses[q.id] as string[]).includes(opt) : false} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const prev = Array.isArray(responses[q.id]) ? (responses[q.id] as string[]) : []
                                if (e.target.checked) setResponse(q.id, [...prev, opt])
                                else setResponse(q.id, prev.filter((x: string) => x !== opt))
                              }} />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {type === 'scale' && (
                        <div className="flex gap-2 flex-wrap">
                          {Array.from({ length: (q.scaleMax || 10) - (q.scaleMin || 1) + 1 }, (_, i) => (q.scaleMin || 1) + i).map((n) => (
                            <label key={n} className={`inline-flex items-center p-1 rounded ${responses[q.id] === n ? 'bg-primary/10' : ''}`}>
                              <input type="radio" name={`scale-${q.id}`} checked={responses[q.id] === n} onChange={() => setResponse(q.id, n)} />
                              <span className="ml-2 text-sm">{n}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {type === 'image' && (
                        <div className="border-2 border-dashed rounded p-4 text-center text-sm text-muted-foreground">
                          Image upload area
                        </div>
                      )}
                      {type === 'field' && (
                        <div className="border rounded overflow-hidden max-w-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/field.png" alt="Field diagram" className="w-full h-auto" />
                        </div>
                      )}
                      {/* Fallback empty area if no specific control */}
                      {!['text','number','long-text','multiple-choice','checkbox','scale','image','field'].includes(type) && (
                        <div style={{minHeight: '4rem'}} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <style jsx>{`
          @media print {
            body { -webkit-print-color-adjust: exact }
            .no-print { display: none }
            .page { margin: 0 }
          }
          @page { size: auto;  margin: 20mm; }
        `}</style>
      </div>
    </div>
  )
}

export default function ScoutingSheetPrint() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading scouting sheet...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <ScoutingSheetPrintContent />
    </Suspense>
  )
}
