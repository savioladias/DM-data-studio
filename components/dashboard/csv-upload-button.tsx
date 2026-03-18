'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, AlertCircle, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { ChannelId } from '@/lib/channels'

interface CsvUploadButtonProps {
  projectId: string
  channelId: ChannelId
  onUploadSuccess?: () => void
}

export function CsvUploadButton({
  projectId,
  channelId,
  onUploadSuccess,
}: CsvUploadButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setStatus('idle')
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('channel', channelId)

      const res = await fetch(
        `/api/projects/${projectId}/csv-upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(`Successfully uploaded ${data.rowCount} metrics`)
        setTimeout(() => {
          setOpen(false)
          onUploadSuccess?.()
        }, 1500)
      } else {
        setStatus('error')
        setMessage(data.error || 'Upload failed')
      }
    } catch (err) {
      setStatus('error')
      setMessage('Network error during upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          <Upload className="h-3 w-3" />
          Upload CSV
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload CSV Data</DialogTitle>
          <DialogDescription>
            Upload historical metrics data for {channelId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format instructions */}
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <p className="text-xs font-semibold">CSV Format:</p>
            <code className="text-xs bg-background p-2 rounded block overflow-auto">
              date,metricKey,value{'\n'}
              2024-01-01,impressions,1500{'\n'}
              2024-01-01,clicks,120{'\n'}
              2024-01-01,conversions,15
            </code>
            <p className="text-xs text-muted-foreground">
              Date format: YYYY-MM-DD
            </p>
          </div>

          {/* File input */}
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={loading}
              className="block w-full text-sm cursor-pointer"
            />
          </div>

          {/* Status messages */}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-3 rounded">
              <Check className="h-4 w-4 flex-shrink-0" />
              {message}
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {message}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
