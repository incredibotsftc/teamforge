import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

// GET - Fetch a single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params

    return await withAuth(request, async ({ teamMember, supabase }) => {
      const { data: template, error } = await supabase
        .from('survey_templates')
        .select('*')
        .eq('id', templateId)
        .eq('team_id', teamMember.team_id)
        .single()

      if (error || !template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ template })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

// PUT - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params

    return await withAuth(request, async ({ teamMember, supabase }) => {
      const body = await request.json()

      // Verify template belongs to team
      const { data: existingTemplate } = await supabase
        .from('survey_templates')
        .select('id')
        .eq('id', templateId)
        .eq('team_id', teamMember.team_id)
        .single()

      if (!existingTemplate) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      // Update the template
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      }

      if (body.name !== undefined) updateData.name = body.name.trim()
      if (body.description !== undefined) updateData.description = body.description?.trim()
      if (body.header_image_url !== undefined) updateData.header_image_url = body.header_image_url
      if (body.footer_content !== undefined) updateData.footer_content = body.footer_content
      if (body.footer_html !== undefined) updateData.footer_html = body.footer_html
      if (body.is_active !== undefined) updateData.is_active = body.is_active

      const { data: template, error } = await supabase
        .from('survey_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update template: ${error.message}`)
      }

      return NextResponse.json({
        template,
        message: 'Template updated successfully'
      })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

// DELETE - Delete a template (soft delete by marking inactive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params

    return await withAuth(request, async ({ teamMember, supabase }) => {
      // Verify template belongs to team
      const { data: existingTemplate } = await supabase
        .from('survey_templates')
        .select('id')
        .eq('id', templateId)
        .eq('team_id', teamMember.team_id)
        .single()

      if (!existingTemplate) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      // Soft delete by marking as inactive
      const { error } = await supabase
        .from('survey_templates')
        .update({ is_active: false })
        .eq('id', templateId)

      if (error) {
        throw new Error(`Failed to delete template: ${error.message}`)
      }

      return NextResponse.json({
        message: 'Template deleted successfully'
      })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}