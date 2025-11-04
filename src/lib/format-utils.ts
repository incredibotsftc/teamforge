/**
 * Shared formatting utilities for consistent data display across the app
 */

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Formats a role string for display
 * @example formatRole('admin') => 'Admin'
 */
export function formatRole(role: string): string {
  return capitalize(role)
}

/**
 * Formats a date string for display
 * @example formatDate('2024-01-15') => 'January 15, 2024'
 */
export function formatDate(
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('en-US', options)
}

/**
 * Formats a date with time
 * @example formatDateTime('2024-01-15T10:30:00') => 'January 15, 2024 at 10:30 AM'
 */
export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

/**
 * Gets initials from first and last name
 * @example getInitials('John', 'Doe') => 'JD'
 */
export function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0) || ''
  const last = lastName?.charAt(0) || ''
  return `${first}${last}`.toUpperCase()
}

/**
 * Gets Tailwind CSS classes for role badge color
 */
export function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    mentor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    student: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    guest: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }
  return roleColors[role.toLowerCase()] || roleColors.guest
}

/**
 * Formats a number as currency
 * @example formatCurrency(1234.56) => '$1,234.56'
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * Formats a percentage
 * @example formatPercentage(0.756) => '75.6%'
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Formats a relative time string
 * @example formatRelativeTime(new Date(Date.now() - 3600000)) => '1 hour ago'
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return formatDate(dateObj)
}
