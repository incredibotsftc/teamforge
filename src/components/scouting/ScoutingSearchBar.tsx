'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Loader2, Search, SlidersHorizontal } from 'lucide-react'

interface TeamInfo {
  teamNumber: number
  nameFull: string
  nameShort: string
  schoolName: string
  city: string
  stateProv: string
  country: string
  rookieYear: number
  website: string | null
}

interface FTCEventAPIResponse {
  eventId?: string
  code: string
  name: string
  type: string
  dateStart: string
  dateEnd: string
  city: string
  stateprov: string
  country: string
  venue: string
  website?: string
}

interface ScoutingSearchBarProps {
  selectedSeason: number
  availableSeasons: number[]
  onSeasonChange: (season: string) => void
  onError?: (error: string) => void
  onApiCredentialsError?: () => void
}

export function ScoutingSearchBar({
  selectedSeason,
  availableSeasons,
  onSeasonChange,
  onError,
  onApiCredentialsError
}: ScoutingSearchBarProps) {
  const router = useRouter()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'team' | 'event'>('team')
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSelectionDialog, setShowSelectionDialog] = useState(false)
  const [searchMatches, setSearchMatches] = useState<(FTCEventAPIResponse | TeamInfo)[]>([])
  const [selectionType, setSelectionType] = useState<'team' | 'event'>('event')

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearchLoading(true)

    try {
      // If searching for teams and it's a number, navigate directly
      if (searchType === 'team') {
        const teamNumber = parseInt(searchQuery.trim())
        if (!isNaN(teamNumber) && teamNumber > 0) {
          const params = new URLSearchParams()
          params.set('teamNumber', teamNumber.toString())
          params.set('season', selectedSeason.toString())
          router.push(`/scouting/teams?${params.toString()}`)
          setSearchLoading(false)
          return
        }
      }

      const response = await fetch(`/api/scouting/search?query=${encodeURIComponent(searchQuery.trim())}&type=${searchType}&season=${selectedSeason}`)

      if (!response.ok) {
        const errorData = await response.json()

        // Check if it's an API credentials error
        if (response.status === 401 && errorData.error === 'API_CREDENTIALS_MISSING') {
          onApiCredentialsError?.()
          setSearchLoading(false)
          return
        }

        throw new Error(errorData.error || 'Search failed')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error('Search failed')
      }

      if (data.matches.length === 0) {
        const errorMsg = `No ${searchType === 'team' ? 'teams' : 'events'} found matching "${searchQuery}"`
        onError?.(errorMsg)
        setSearchLoading(false)
        return
      }

      if (data.matches.length === 1 || data.exactMatch) {
        // Auto-navigate for single match
        if (searchType === 'team') {
          const teamInfo = data.matches[0] as TeamInfo
          const params = new URLSearchParams()
          params.set('teamNumber', teamInfo.teamNumber.toString())
          params.set('season', selectedSeason.toString())
          router.push(`/scouting/teams?${params.toString()}`)
        } else {
          const event = data.matches[0]
          const params = new URLSearchParams()
          params.set('season', selectedSeason.toString())
          router.push(`/scouting/events/${event.code}?${params.toString()}`)
        }
        setSearchLoading(false)
      } else {
        // Show selection dialog for multiple matches
        setSearchMatches(data.matches)
        setSelectionType(searchType)
        setShowSelectionDialog(true)
        setSearchLoading(false)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Search failed'
      onError?.(errorMsg)
      setSearchLoading(false)
    }
  }

  // Handle selection from dialog
  const handleSelectionClick = (selection: FTCEventAPIResponse | TeamInfo) => {
    setShowSelectionDialog(false)
    setSearchMatches([])

    if (selectionType === 'team') {
      const teamData = selection as TeamInfo
      const params = new URLSearchParams()
      params.set('teamNumber', teamData.teamNumber.toString())
      params.set('season', selectedSeason.toString())
      router.push(`/scouting/teams?${params.toString()}`)
    } else {
      const eventData = selection as FTCEventAPIResponse
      const params = new URLSearchParams()
      params.set('season', selectedSeason.toString())
      router.push(`/scouting/events/${eventData.code}?${params.toString()}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <>
      {/* Mobile View - Compact with Popover */}
      <div className="flex md:hidden items-center gap-2 w-full">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex-shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Season</label>
                <Select value={selectedSeason.toString()} onValueChange={onSeasonChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSeasons.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Search Type</label>
                <div className="flex gap-1">
                  <Button
                    variant={searchType === 'team' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchType('team')}
                    className={`flex-1 ${searchType === 'team' ? 'btn-accent' : ''}`}
                  >
                    Team
                  </Button>
                  <Button
                    variant={searchType === 'event' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchType('event')}
                    className={`flex-1 ${searchType === 'event' ? 'btn-accent' : ''}`}
                  >
                    Event
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Input
          type="text"
          placeholder={searchType === 'team' ? 'Team #...' : 'Event...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={searchLoading}
          className="flex-1 min-w-0"
        />
        <Button
          onClick={handleSearch}
          disabled={searchLoading || !searchQuery.trim()}
          className="btn-accent flex-shrink-0"
          size="sm"
        >
          {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {/* Desktop View - Full Horizontal Layout */}
      <div className="hidden md:flex items-center gap-2">
        <Select value={selectedSeason.toString()} onValueChange={onSeasonChange}>
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableSeasons.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <Button
            variant={searchType === 'team' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchType('team')}
            className={searchType === 'team' ? 'btn-accent' : ''}
          >
            Team
          </Button>
          <Button
            variant={searchType === 'event' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchType('event')}
            className={searchType === 'event' ? 'btn-accent' : ''}
          >
            Event
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={searchType === 'team' ? 'Team # or name...' : 'Event name or code...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={searchLoading}
            className="w-48"
          />
          <Button
            onClick={handleSearch}
            disabled={searchLoading || !searchQuery.trim()}
            className="btn-accent"
            size="sm"
          >
            {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Selection Dialog for Multiple Matches */}
      <Dialog open={showSelectionDialog} onOpenChange={setShowSelectionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Multiple {selectionType === 'team' ? 'Teams' : 'Events'} Found</DialogTitle>
            <DialogDescription>
              Found {searchMatches.length} {selectionType === 'team' ? 'teams' : 'events'} matching &quot;{searchQuery}&quot;. Select one to view details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {searchMatches.map((match) => {
              if (selectionType === 'team') {
                const teamMatch = match as TeamInfo
                return (
                  <button
                    key={teamMatch.teamNumber}
                    onClick={() => handleSelectionClick(match)}
                    className="w-full text-left p-4 rounded-lg border hover:bg-accent hover:border-primary transition-colors"
                  >
                    <div className="font-semibold">
                      Team {teamMatch.teamNumber} - {teamMatch.nameShort || teamMatch.nameFull}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {teamMatch.schoolName && <>{teamMatch.schoolName} • </>}
                      {teamMatch.city}, {teamMatch.stateProv}
                    </div>
                    {teamMatch.rookieYear && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Rookie Year: {teamMatch.rookieYear}
                      </div>
                    )}
                  </button>
                )
              } else {
                const eventMatch = match as FTCEventAPIResponse
                return (
                  <button
                    key={eventMatch.code}
                    onClick={() => handleSelectionClick(match)}
                    className="w-full text-left p-4 rounded-lg border hover:bg-accent hover:border-primary transition-colors"
                  >
                    <div className="font-semibold">{eventMatch.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Code: {eventMatch.code} • {eventMatch.city}, {eventMatch.stateprov}
                    </div>
                    {eventMatch.dateStart && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(eventMatch.dateStart).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {eventMatch.dateEnd && eventMatch.dateEnd !== eventMatch.dateStart && (
                          <> - {new Date(eventMatch.dateEnd).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}</>
                        )}
                      </div>
                    )}
                  </button>
                )
              }
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
