'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowUpDown, ArrowDown } from 'lucide-react'
import type { MetricPrefs, SortKey, SortDir } from '@/lib/metric-prefs'

interface MetricSortControlsProps {
  prefs: MetricPrefs
  onChange: (prefs: MetricPrefs) => void
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'value', label: 'Value (High to Low)' },
  { value: 'trend', label: 'Trend' },
  { value: 'delta', label: 'Change %' },
  { value: 'name', label: 'Name (A-Z)' },
]

export function MetricSortControls({ prefs, onChange }: MetricSortControlsProps) {
  const toggleDirection = () => {
    onChange({
      ...prefs,
      sortDir: prefs.sortDir === 'desc' ? 'asc' : 'desc',
    })
  }

  const handleSortKeyChange = (key: SortKey) => {
    onChange({
      ...prefs,
      sortKey: key,
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={prefs.sortKey} onValueChange={handleSortKeyChange}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={toggleDirection}
        title={`Sort ${prefs.sortDir === 'desc' ? 'ascending' : 'descending'}`}
      >
        <ArrowDown className="h-4 w-4" style={{ transform: prefs.sortDir === 'asc' ? 'scaleY(-1)' : undefined }} />
      </Button>
    </div>
  )
}
