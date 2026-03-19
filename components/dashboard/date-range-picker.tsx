'use client'

import { useState } from 'react'
import { format, subDays, startOfYear } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Calendar } from 'lucide-react'
import type { DateRange, DateRangePreset } from '@/lib/types'

const PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 14 Days', value: '14d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'Year to Date', value: 'ytd' },
  { label: 'Custom', value: 'custom' },
]

function presetToDateRange(preset: DateRangePreset): Omit<DateRange, 'preset'> {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  switch (preset) {
    case '7d':
      return { startDate: format(subDays(today, 7), 'yyyy-MM-dd'), endDate: todayStr }
    case '14d':
      return { startDate: format(subDays(today, 14), 'yyyy-MM-dd'), endDate: todayStr }
    case '30d':
      return { startDate: format(subDays(today, 30), 'yyyy-MM-dd'), endDate: todayStr }
    case '90d':
      return { startDate: format(subDays(today, 90), 'yyyy-MM-dd'), endDate: todayStr }
    case 'ytd':
      return { startDate: format(startOfYear(today), 'yyyy-MM-dd'), endDate: todayStr }
    case 'custom':
      return { startDate: format(subDays(today, 30), 'yyyy-MM-dd'), endDate: todayStr }
  }
}

function getPriorPeriodLabel(preset: DateRangePreset): string {
  switch (preset) {
    case '7d':
      return 'prior 7 days'
    case '14d':
      return 'prior 14 days'
    case '30d':
      return 'prior 30 days'
    case '90d':
      return 'prior 90 days'
    case 'ytd':
      return 'prior year'
    case 'custom':
      return 'prior period'
  }
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [customStart, setCustomStart] = useState(value.startDate)
  const [customEnd, setCustomEnd] = useState(value.endDate)

  const handlePresetChange = (preset: DateRangePreset) => {
    const { startDate, endDate } = presetToDateRange(preset)
    onChange({ preset, startDate, endDate })
  }

  const handleCustomChange = () => {
    onChange({ preset: 'custom', startDate: customStart, endDate: customEnd })
  }

  return (
    <div className="flex items-center gap-3">
      <Select value={value.preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-40 hover:bg-primary hover:text-primary-foreground">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map(preset => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customStart}
            onChange={e => {
              setCustomStart(e.target.value)
              handleCustomChange()
            }}
            className="w-32"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={customEnd}
            onChange={e => {
              setCustomEnd(e.target.value)
              handleCustomChange()
            }}
            className="w-32"
          />
        </div>
      )}

      <span className="text-xs text-muted-foreground ml-2">
        Comparing to {getPriorPeriodLabel(value.preset)}
      </span>
    </div>
  )
}
