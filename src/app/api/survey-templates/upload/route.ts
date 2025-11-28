import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError, ValidationError } from '@/lib/api-errors'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

// POST - Upload a header image for survey templates
export async function POST(request: NextRequest) {
  try {
    return await withAuth(request, async ({ teamMember, supabase }) => {
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        throw ValidationError.MISSING_FIELDS(['file'])
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' },
          { status: 400 }
        )
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 5MB.' },
          { status: 400 }
        )
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${teamMember.team_id}/${uuidv4()}.${fileExt}`

      // Convert File to ArrayBuffer then to Buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('survey-templates')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        throw new Error(`Failed to upload image: ${error.message}`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('survey-templates')
        .getPublicUrl(fileName)

      return NextResponse.json({
        url: publicUrl,
        path: data.path,
        message: 'Image uploaded successfully'
      })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

// DELETE - Delete an uploaded image
export async function DELETE(request: NextRequest) {
  try {
    return await withAuth(request, async ({ teamMember, supabase }) => {
      const body = await request.json()
      const { path } = body

      if (!path) {
        throw ValidationError.MISSING_FIELDS(['path'])
      }

      // Verify the path belongs to the team
      if (!path.startsWith(`${teamMember.team_id}/`)) {
        return NextResponse.json(
          { error: 'Unauthorized to delete this image' },
          { status: 403 }
        )
      }

      const { error } = await supabase.storage
        .from('survey-templates')
        .remove([path])

      if (error) {
        throw new Error(`Failed to delete image: ${error.message}`)
      }

      return NextResponse.json({
        message: 'Image deleted successfully'
      })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}