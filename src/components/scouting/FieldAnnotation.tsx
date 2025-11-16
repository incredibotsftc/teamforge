'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil, Eraser, Undo, Trash2 } from 'lucide-react'

interface FieldAnnotationProps {
  value?: string
  onChange: (imageDataUrl: string) => void
  disabled?: boolean
}

interface DrawingPoint {
  x: number
  y: number
  color: string
  size: number
  type: 'draw' | 'erase'
}

interface DrawingStroke {
  points: DrawingPoint[]
}

const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
]

export function FieldAnnotation({ value, onChange, disabled }: FieldAnnotationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#ef4444')
  const [tool, setTool] = useState<'draw' | 'erase'>('draw')
  const [strokes, setStrokes] = useState<DrawingStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<DrawingPoint[]>([])
  const [imageLoaded, setImageLoaded] = useState(false)
  const [baseAnnotation, setBaseAnnotation] = useState<string | null>(null)

  // Clear strokes when value changes (navigating to different response)
  useEffect(() => {
    setStrokes([])
    setCurrentStroke([])
  }, [value])

  const drawStrokes = useCallback((ctx: CanvasRenderingContext2D) => {
    // Redraw all strokes
    strokes.forEach(stroke => {
      if (stroke.points.length === 0) return

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      stroke.points.forEach((point, index) => {
        if (index === 0) {
          ctx.beginPath()
          ctx.moveTo(point.x, point.y)
        } else {
          if (point.type === 'erase') {
            ctx.globalCompositeOperation = 'destination-out'
            ctx.strokeStyle = 'rgba(0,0,0,1)'
            ctx.lineWidth = 20
          } else {
            ctx.globalCompositeOperation = 'source-over'
            ctx.strokeStyle = point.color
            ctx.lineWidth = point.size
          }

          ctx.lineTo(point.x, point.y)
          ctx.stroke()
        }
      })
    })

    // Draw current stroke
    if (currentStroke.length > 0) {
      ctx.beginPath()
      currentStroke.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y)
        } else {
          if (point.type === 'erase') {
            ctx.globalCompositeOperation = 'destination-out'
            ctx.strokeStyle = 'rgba(0,0,0,1)'
            ctx.lineWidth = 20
          } else {
            ctx.globalCompositeOperation = 'source-over'
            ctx.strokeStyle = point.color
            ctx.lineWidth = point.size
          }

          ctx.lineTo(point.x, point.y)
          ctx.stroke()
        }
      })
    }

    ctx.globalCompositeOperation = 'source-over'
  }, [strokes, currentStroke])

  // Load field image and existing annotations
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = '/field.png'

    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width
      canvas.height = img.height

      // Draw the field image
      ctx.drawImage(img, 0, 0)

      // If there's an existing annotation, load it and store as base
      if (value && value !== baseAnnotation) {
        setBaseAnnotation(value)
        const annotationImg = new Image()
        annotationImg.src = value
        annotationImg.onload = () => {
          ctx.drawImage(annotationImg, 0, 0)
          setImageLoaded(true)
        }
      } else {
        setImageLoaded(true)
      }
    }
  }, [value, baseAnnotation])

  // Redraw canvas when strokes change
  useEffect(() => {
    if (!imageLoaded) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Reload field image
    const img = new Image()
    img.src = '/field.png'
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      // If there's a base annotation, draw it first
      if (baseAnnotation) {
        const baseImg = new Image()
        baseImg.src = baseAnnotation
        baseImg.onload = () => {
          ctx.drawImage(baseImg, 0, 0)

          // Then draw new strokes on top
          drawStrokes(ctx)
        }
      } else {
        // No base annotation, just draw strokes
        drawStrokes(ctx)
      }
    }
  }, [strokes, currentStroke, imageLoaded, baseAnnotation, drawStrokes])

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      }
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return

    e.preventDefault()
    const coords = getCanvasCoordinates(e)
    setIsDrawing(true)
    setCurrentStroke([{
      x: coords.x,
      y: coords.y,
      color: selectedColor,
      size: 3,
      type: tool
    }])
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return

    e.preventDefault()
    const coords = getCanvasCoordinates(e)
    setCurrentStroke(prev => [...prev, {
      x: coords.x,
      y: coords.y,
      color: selectedColor,
      size: 3,
      type: tool
    }])
  }

  const stopDrawing = () => {
    if (!isDrawing) return

    setIsDrawing(false)
    if (currentStroke.length > 0) {
      setStrokes(prev => [...prev, { points: currentStroke }])
      setCurrentStroke([])

      // Save the canvas as image data and update base annotation
      const canvas = canvasRef.current
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png')
        setBaseAnnotation(dataUrl)
        onChange(dataUrl)
      }
    }
  }

  const handleUndo = () => {
    if (strokes.length === 0) return

    const newStrokes = strokes.slice(0, -1)
    setStrokes(newStrokes)

    // Update the saved annotation and base
    setTimeout(() => {
      const canvas = canvasRef.current
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png')
        setBaseAnnotation(dataUrl)
        onChange(dataUrl)
      }
    }, 100)
  }

  const handleClear = () => {
    setStrokes([])
    setCurrentStroke([])
    setBaseAnnotation(null)

    // Reset to just the field image
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = '/field.png'
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')
      onChange(dataUrl)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drawing Tools */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          type="button"
          variant={tool === 'draw' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('draw')}
          disabled={disabled}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Draw
        </Button>
        <Button
          type="button"
          variant={tool === 'erase' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('erase')}
          disabled={disabled}
        >
          <Eraser className="h-4 w-4 mr-2" />
          Erase
        </Button>

        <div className="h-6 w-px bg-border mx-2" />

        {/* Color Picker */}
        {tool === 'draw' && (
          <div className="flex gap-1">
            {COLORS.map(color => (
              <button
                key={color.value}
                type="button"
                onClick={() => setSelectedColor(color.value)}
                disabled={disabled}
                className={`w-8 h-8 rounded border-2 ${
                  selectedColor === color.value ? 'border-primary' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        )}

        <div className="h-6 w-px bg-border mx-2" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={disabled || strokes.length === 0}
        >
          <Undo className="h-4 w-4 mr-2" />
          Undo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Canvas */}
      <div className="border rounded-lg overflow-hidden bg-gray-100 max-w-full md:max-w-2xl">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="max-w-full h-auto touch-none cursor-crosshair"
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </div>
    </div>
  )
}
