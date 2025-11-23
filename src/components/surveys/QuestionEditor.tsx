'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { QuestionType } from '@/types/surveys'
import { Plus, X } from 'lucide-react'

interface QuestionEditorProps {
  onSave: (question: {
    question_text: string
    question_type: QuestionType
    options?: string[]
    is_required: boolean
  }) => void
  onCancel: () => void
  initialData?: {
    question_text: string
    question_type: QuestionType
    options?: string[]
    is_required: boolean
  }
  mode?: 'add' | 'edit'
}

export function QuestionEditor({ onSave, onCancel, initialData, mode = 'add' }: QuestionEditorProps) {
  const [questionText, setQuestionText] = useState(initialData?.question_text || '')
  const [questionType, setQuestionType] = useState<QuestionType>(initialData?.question_type || 'short_answer')
  const [isRequired, setIsRequired] = useState(initialData?.is_required || false)
  const [options, setOptions] = useState<string[]>(initialData?.options || [''])

  const choiceTypes: QuestionType[] = ['multiple_choice', 'dropdown', 'checkboxes']
  const needsOptions = choiceTypes.includes(questionType)

  const handleAddOption = () => {
    setOptions([...options, ''])
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const filteredOptions = needsOptions
      ? options.filter(opt => opt.trim() !== '')
      : undefined

    onSave({
      question_text: questionText,
      question_type: questionType,
      options: filteredOptions,
      is_required: isRequired
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
      <div className="space-y-2">
        <Label htmlFor="questionText">Question *</Label>
        <Input
          id="questionText"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Enter your question"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="questionType">Question Type *</Label>
        <Select value={questionType} onValueChange={(value) => setQuestionType(value as QuestionType)}>
          <SelectTrigger id="questionType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short_answer">Short Answer</SelectItem>
            <SelectItem value="long_answer">Long Answer</SelectItem>
            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
            <SelectItem value="dropdown">Dropdown</SelectItem>
            <SelectItem value="checkboxes">Checkboxes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {needsOptions && (
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
              />
              {options.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveOption(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={handleAddOption}>
            <Plus className="h-4 w-4 mr-1" /> Add Option
          </Button>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isRequired"
          checked={isRequired}
          onCheckedChange={(checked) => setIsRequired(checked as boolean)}
        />
        <Label htmlFor="isRequired" className="font-normal cursor-pointer">
          Required question
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="btn-accent">
          {mode === 'edit' ? 'Save Changes' : 'Add Question'}
        </Button>
      </div>
    </form>
  )
}
