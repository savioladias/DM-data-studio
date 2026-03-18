'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MetricPrefs, SortKey, SortDir } from '@/lib/metric-prefs'

interface MetricSortControlsProps {
  prefs: MetricPrefs
  onChange: (prefs: MetricPrefs) => void
}

const SORT_OPTIONS: { key: SortKey; dir: SortDir; label: string }[] = [
  { key: 'value', dir: 'desc', label: 'Value (High to Low)' },
  { key: 'value', dir: 'asc', label: 'Value (Low to High)' },
  { key: 'trend', dir: 'desc', label: 'Trend (Best First)' },
  { key: 'trend', dir: 'asc', label: 'Trend (Worst First)' },
  { key: 'delta', dir: 'desc', label: 'Change % (Highest)' },
  { key: 'delta', dir: 'asc', label: 'Change % (Lowest)' },
  { key: 'name', dir: 'asc', label: 'Name (A-Z)' },
  { key: 'name', dir: 'desc', label: 'Name (Z-A)' },
]

export function MetricSortControls({ prefs, onChange }: MetricSortControlsProps) {
  const currentOption = SORT_OPTIONS.find(opt => opt.key === prefs.sortKey && opt.dir === prefs.sortDir)
  const currentValue = currentOption ? `${currentOption.key}-${currentOption.dir}` : 'value-desc'

  const handleChange = (value: string) => {
    const [key, dir] = value.split('-') as [SortKey, SortDir]
    onChange({ sortKey: key, sortDir: dir })
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Sort By" />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map(opt => (
          <SelectItem key={`${opt.key}-${opt.dir}`} value={`${opt.key}-${opt.dir}`}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
