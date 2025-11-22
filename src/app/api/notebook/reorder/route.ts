import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { handleAPIError, ValidationError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    return await withAuth(request, async ({ teamMember, supabase }) => {
      const body = await request.json()
      const { pageId, newPosition, folderId } = body

      console.log('[API Reorder] Request:', { pageId, newPosition, folderId, teamId: teamMember.team_id })

      if (!pageId || typeof newPosition !== 'number') {
        throw ValidationError.MISSING_FIELDS(['pageId', 'newPosition'])
      }

      // Get the page to verify ownership
      const { data: page, error: pageError } = await supabase
        .from('notebook_pages')
        .select('id, team_id, folder_id')
        .eq('id', pageId)
        .single()

      if (pageError || !page) {
        throw new Error('Page not found')
      }

      // Verify page belongs to user's team
      if (page.team_id !== teamMember.team_id) {
        throw new Error('Access denied')
      }

      // Get all pages in the same folder (or root if folderId is null/undefined)
      let query = supabase
        .from('notebook_pages')
        .select('id, sort_order')
        .eq('team_id', page.team_id)

      if (folderId === null || folderId === undefined) {
        query = query.is('folder_id', null)
      } else {
        query = query.eq('folder_id', folderId)
      }

      const { data: pagesInFolder, error: pagesError } = await query.order('sort_order', { ascending: true })

      if (pagesError) {
        console.error('[API Reorder] Fetch error:', pagesError)
        throw new Error('Failed to fetch pages')
      }

      console.log('[API Reorder] Pages in folder:', pagesInFolder?.length, pagesInFolder)

      // Remove the dragged page from the list
      const otherPages = (pagesInFolder || []).filter(p => p.id !== pageId)
      console.log('[API Reorder] Other pages after filter:', otherPages.length)

      // Insert the dragged page at the new position
      const reorderedPages = [
        ...otherPages.slice(0, newPosition),
        { id: pageId, sort_order: newPosition },
        ...otherPages.slice(newPosition)
      ]

      // Update sort_order for all affected pages
      const updates = reorderedPages.map((p, index) => ({
        id: p.id,
        sort_order: index,
        folder_id: folderId === undefined ? null : folderId
      }))

      console.log('[API Reorder] Updates to apply:', updates)

      // Batch update all pages
      for (const update of updates) {
        // Only update folder_id if it's different from current
        const updateData: { sort_order: number; folder_id?: string | null } = {
          sort_order: update.sort_order
        }

        // Only include folder_id in update if it's changing
        if (update.id === pageId) {
          // For the dragged page, update folder_id if it's different
          if ((page.folder_id || null) !== (update.folder_id || null)) {
            updateData.folder_id = update.folder_id
          }
        }

        const { error: updateError } = await supabase
          .from('notebook_pages')
          .update(updateData)
          .eq('id', update.id)

        if (updateError) {
          console.error('[API Reorder] Update error:', updateError, 'for page:', update.id)
          throw new Error(`Failed to update page: ${updateError.message}`)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Page reordered successfully'
      })
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
