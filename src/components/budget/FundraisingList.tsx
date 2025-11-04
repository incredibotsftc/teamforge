'use client'

import type { Fundraising } from '@/types/fundraising'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit } from 'lucide-react'
import { fundraisingSourceTypes, fundraisingStatuses } from '@/types/fundraising'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface FundraisingListProps {
  fundraising: Fundraising[]
  onEdit: (id: string) => void
  searchQuery: string
}

export function FundraisingList({ fundraising, onEdit, searchQuery }: FundraisingListProps) {

  const getSourceTypeName = (sourceType: string) => {
    return fundraisingSourceTypes.find(s => s.id === sourceType)?.name || sourceType
  }

  const getStatusInfo = (status: string) => {
    return fundraisingStatuses.find(s => s.id === status) || { name: status, description: '' }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-green-100 text-green-800'
      case 'committed': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'prospecting': return 'bg-purple-100 text-purple-800'
      case 'declined': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter fundraising based on search query
  const filteredFundraising = fundraising.filter((item) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const sourceName = item.source_name.toLowerCase()
    const sourceType = getSourceTypeName(item.source_type).toLowerCase()
    const contactName = (item.contact_name || '').toLowerCase()
    const status = getStatusInfo(item.status).name.toLowerCase()

    return (
      sourceName.includes(searchLower) ||
      sourceType.includes(searchLower) ||
      contactName.includes(searchLower) ||
      status.includes(searchLower)
    )
  })

  if (fundraising.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No fundraising records yet. Click &quot;Track Fundraising&quot; to get started.
      </p>
    )
  }

  if (filteredFundraising.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        {searchQuery ? 'No fundraising records match your search.' : 'No fundraising records yet.'}
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Committed</TableHead>
          <TableHead className="text-right">Received</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredFundraising.map((item) => (
          <TableRow
            key={item.id}
            className="cursor-pointer"
            onClick={() => onEdit(item.id)}
          >
            <TableCell className="font-medium">{item.source_name}</TableCell>
            <TableCell className="text-muted-foreground">
              {getSourceTypeName(item.source_type)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.contact_name || '-'}
            </TableCell>
            <TableCell>
              <Badge className={getStatusColor(item.status)} variant="secondary">
                {getStatusInfo(item.status).name}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {item.amount_committed ? `$${Number(item.amount_committed).toLocaleString()}` : '-'}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              ${Number(item.amount_received).toLocaleString()}
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              ${(Number(item.amount_received) + Number(item.amount_committed || 0)).toLocaleString()}
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(item.id)
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
