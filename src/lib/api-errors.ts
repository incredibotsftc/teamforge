/**
 * Standardized API error handling utilities
 */

import { NextResponse } from 'next/server'

/**
 * Custom API error class with status codes
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Handles API errors consistently across all routes
 */
export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error)

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    // Don't expose internal error details in production
    const message = process.env.NODE_ENV === 'development'
      ? error.message
      : 'An unexpected error occurred'

    return NextResponse.json(
      {
        error: message,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    },
    { status: 500 }
  )
}

/**
 * Predefined authentication errors
 */
export const AuthError = {
  NO_TOKEN: () => new APIError(
    'No authentication token provided',
    401,
    'NO_TOKEN'
  ),
  INVALID_TOKEN: () => new APIError(
    'Invalid authentication token',
    401,
    'INVALID_TOKEN'
  ),
  NOT_TEAM_MEMBER: () => new APIError(
    'User is not a member of any active team',
    403,
    'NOT_TEAM_MEMBER'
  ),
  ADMIN_REQUIRED: () => new APIError(
    'Admin access required',
    403,
    'ADMIN_REQUIRED'
  ),
  MENTOR_REQUIRED: () => new APIError(
    'Mentor or Admin access required',
    403,
    'MENTOR_REQUIRED'
  ),
}

/**
 * Predefined validation errors
 */
export const ValidationError = {
  MISSING_FIELDS: (fields: string[]) => new APIError(
    `Missing required fields: ${fields.join(', ')}`,
    400,
    'MISSING_FIELDS'
  ),
  INVALID_FORMAT: (field: string, expected: string) => new APIError(
    `Invalid format for ${field}. Expected: ${expected}`,
    400,
    'INVALID_FORMAT'
  ),
}

/**
 * Predefined resource errors
 */
export const ResourceError = {
  NOT_FOUND: (resource: string) => new APIError(
    `${resource} not found`,
    404,
    'NOT_FOUND'
  ),
  ALREADY_EXISTS: (resource: string) => new APIError(
    `${resource} already exists`,
    409,
    'ALREADY_EXISTS'
  ),
  EXPIRED: (resource: string) => new APIError(
    `${resource} has expired`,
    410,
    'EXPIRED'
  ),
}
