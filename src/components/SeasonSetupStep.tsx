'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SeasonData {
  name: string
  start_year: number
  end_year: number
}

interface SeasonSetupStepProps {
  onSeasonChange: (seasonData: SeasonData) => void
  initialData?: SeasonData
}

const CURRENT_YEAR = new Date().getFullYear()

export function SeasonSetupStep({ onSeasonChange, initialData }: SeasonSetupStepProps) {
  const [seasonData, setSeasonData] = useState<SeasonData>(
    initialData || {
      name: '',
      start_year: CURRENT_YEAR,
      end_year: CURRENT_YEAR + 1
    }
  )

  const handleInputChange = (field: keyof SeasonData, value: string | number) => {
    const newData = {
      ...seasonData,
      [field]: value
    }
    setSeasonData(newData)
    onSeasonChange(newData)
  }

  return (
    <div className="space-y-4">
      {/* Season Name */}
      <div className="space-y-2">
        <Label htmlFor="seasonName">Season Name *</Label>
        <Input
          id="seasonName"
          type="text"
          placeholder="Enter the season name"
          value={seasonData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
        <p className="text-sm text-gray-500">
          Enter the name of the FTC season you are participating in
        </p>
      </div>

      {/* Year Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startYear">Start Year *</Label>
          <Input
            id="startYear"
            type="number"
            min="2020"
            max="2030"
            value={seasonData.start_year}
            onChange={(e) => handleInputChange('start_year', parseInt(e.target.value) || CURRENT_YEAR)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endYear">End Year *</Label>
          <Input
            id="endYear"
            type="number"
            min="2021"
            max="2031"
            value={seasonData.end_year}
            onChange={(e) => handleInputChange('end_year', parseInt(e.target.value) || CURRENT_YEAR + 1)}
            required
          />
        </div>
      </div>
    </div>
  )
}
