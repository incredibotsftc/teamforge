/**
 * Utility functions for exporting data to CSV format
 */

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  // Create header row
  const headerRow = headers.map(h => h.label).join(',')

  // Create data rows
  const dataRows = data.map(item => {
    return headers
      .map(h => {
        const value = item[h.key]
        // Handle null/undefined
        if (value === null || value === undefined) return ''

        // Convert to string and escape
        const stringValue = String(value)

        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }

        return stringValue
      })
      .join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Download a CSV string as a file
 */
export function downloadCSV(csvContent: string, filename: string) {
  // Create blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  // Create download link
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  URL.revokeObjectURL(url)
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0]
}
