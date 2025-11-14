'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { getTeamVendors } from '@/lib/vendors'
import type { Vendor } from '@/types/vendor'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VendorAutocompleteProps {
  teamId: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function VendorAutocomplete({
  teamId,
  value,
  onChange,
  placeholder = 'Enter vendor name',
  disabled = false,
}: VendorAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(value)
  const [allVendors, setAllVendors] = useState<Vendor[]>([])
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const justSelectedRef = useRef(false)

  // Update search query when external value changes
  useEffect(() => {
    setSearchQuery(value)
  }, [value])

  // Load all vendors once when component mounts
  useEffect(() => {
    if (!teamId) return

    const loadVendors = async () => {
      try {
        const vendors = await getTeamVendors(teamId)
        setAllVendors(vendors)
      } catch (error) {
        console.error('Error loading vendors:', error)
        setAllVendors([])
      }
    }

    loadVendors()
  }, [teamId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter vendors client-side as user types (instant, no delay needed)
  useEffect(() => {
    // Skip filtering if we just selected a vendor
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }

    if (searchQuery && searchQuery.trim().length >= 1) {
      const query = searchQuery.toLowerCase()
      const matches = allVendors.filter(vendor =>
        vendor.name.toLowerCase().includes(query)
      )
      setFilteredVendors(matches)
      // Only open dropdown if there are matching vendors
      setOpen(matches.length > 0)
    } else {
      setFilteredVendors([])
      setOpen(false)
    }
  }, [searchQuery, allVendors])

  const handleInputChange = (newValue: string) => {
    setSearchQuery(newValue)
    onChange(newValue)
  }

  const handleSelectVendor = (vendorName: string) => {
    // Set flag to prevent the filter effect from reopening dropdown
    justSelectedRef.current = true
    setOpen(false)
    setSearchQuery(vendorName)
    onChange(vendorName)
    // Keep focus on input
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
    }
    // Prevent Enter from submitting the form
    if (e.key === 'Enter') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        ref={inputRef}
        value={searchQuery}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
        autoComplete="off"
      />

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Existing Vendors
          </div>
          {filteredVendors.map((vendor) => (
            <button
              key={vendor.id}
              onClick={() => handleSelectVendor(vendor.name)}
              className="w-full flex items-center px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  searchQuery.toLowerCase() === vendor.name.toLowerCase()
                    ? 'opacity-100'
                    : 'opacity-0'
                )}
              />
              {vendor.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
