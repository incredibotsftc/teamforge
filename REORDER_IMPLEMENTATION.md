# Notebook Page Reordering Implementation Guide

This guide provides the complete solution for implementing drag-and-drop page reordering in the notebook with proper sort_order management.

## Files Created/Modified

### 1. Database Migration (CREATED)
**File**: `database/migrations/0004_fix_sort_order.sql`
- Fixes all existing pages with sort_order = 0
- Assigns sequential sort_order values based on creation date
- Groups by team_id and folder_id

### 2. Migration Metadata (MODIFIED)
**File**: `database/migrations/metadata.json`
- Added version 1.3.0 with the new migration

### 3. API Endpoint (CREATED)
**File**: `src/app/api/notebook/reorder/route.ts`
- Handles POST requests to reorder pages
- Updates sort_order for all affected pages in a folder/root

### 4. Page Component (NEEDS MODIFICATION)
**File**: `src/app/notebook/[noteId]/page.tsx`

**Add this handler after `handleMovePageToFolder` (around line 145):**

```typescript
const handleReorderPage = useCallback(async (pageId: string, newPosition: number, folderId?: string) => {
  try {
    const response = await fetch('/api/notebook/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, newPosition, folderId })
    })

    if (!response.ok) {
      throw new Error('Failed to reorder page')
    }

    // Refresh the notebook data after reordering
    window.location.reload()
  } catch (error) {
    console.error('Error reordering page:', error)
  }
}, [])
```

**Update NotebookSidebar props (both mobile and desktop instances):**

Add `onReorderPage={handleReorderPage}` to both NotebookSidebar components:

1. **Mobile sidebar** (around line 310):
```typescript
<NotebookSidebar
  folders={folders}
  pages={pages}
  currentPage={currentPage}
  currentFolder={currentFolder}
  onCreatePage={handleCreatePage}
  onSelectPage={handleMobileSelectPage}
  onSelectFolder={handleSelectFolder}
  onDeletePage={handleDeletePage}
  onDeleteFolder={handleDeleteFolder}
  onUpdatePage={handleUpdatePageMetadata}
  onUpdateFolder={handleUpdateFolder}
  onMovePageToFolder={handleMovePageToFolder}
  onReorderPage={handleReorderPage} // ADD THIS LINE
/>
```

2. **Desktop sidebar** (around line 337):
```typescript
<NotebookSidebar
  folders={folders}
  pages={pages}
  currentPage={currentPage}
  currentFolder={currentFolder}
  onCreatePage={handleCreatePage}
  onSelectPage={handleSelectPage}
  onSelectFolder={handleSelectFolder}
  onDeletePage={handleDeletePage}
  onDeleteFolder={handleDeleteFolder}
  onUpdatePage={handleUpdatePageMetadata}
  onUpdateFolder={handleUpdateFolder}
  onMovePageToFolder={handleMovePageToFolder}
  onReorderPage={handleReorderPage} // ADD THIS LINE
/>
```

### 5. NotebookSidebar Component (NEEDS MODIFICATION)
**File**: `src/components/notebook/NotebookSidebar.tsx`

This file needs significant changes to support drag-and-drop reordering. The implementation is complex, so I'll create a complete updated version in the next file.

## Running the Migration

To apply the sort_order fix to existing data:

1. Go to your Supabase SQL Editor
2. Run the UP section from `database/migrations/0004_fix_sort_order.sql`
3. Or use the First Run Experience to re-run migrations (it will include this new migration)

## Testing the Implementation

1. After applying all changes, navigate to `/notebook`
2. Drag a page between other pages (not just to folders)
3. The page should reorder and maintain its new position
4. This should work both inside folders and at the root level

