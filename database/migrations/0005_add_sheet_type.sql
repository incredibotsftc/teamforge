-- Add page_type column to notebook_pages to differentiate between notes and sheets
-- Migration: 0005_add_sheet_type.sql

-- Add page_type column with default 'note'
ALTER TABLE notebook_pages 
ADD COLUMN page_type TEXT DEFAULT 'note' CHECK (page_type IN ('note', 'aggrid_sheet', 'luckysheet'));

-- Add index for faster filtering by page type
CREATE INDEX idx_notebook_pages_page_type ON notebook_pages(page_type);

-- Add comment for documentation
COMMENT ON COLUMN notebook_pages.page_type IS 'Type of page: note (default), aggrid_sheet, or luckysheet';
