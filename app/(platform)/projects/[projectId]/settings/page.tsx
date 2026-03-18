'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Settings2, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ChannelConnectionsSection } from '@/components/settings/channel-connections-section'
import { ScheduledReportsSection } from '@/components/settings/scheduled-reports-section'
import { INDUSTRIES, CURRENCIES } from '@/lib/constants'
import { CHANNEL_GROUPS, CHANNEL_CATEGORIES, getChannel } from '@/lib/channels'
import type { ChannelId, ChannelCategory } from '@/lib/channels'

interface ProjectData {
  id: string
  name: string
  clientName: string
  industry?: string
  website?: string
  currency: string
  brandColor: string
  timezone: string
  logoUrl?: string
  zohoProjectId?: string
  channels: { id: string; channel: string; enabled: boolean }[]
}

export default function ProjectSettingsPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    industry: '',
    website: '',
    currency: 'GBP',
    brandColor: '#6366f1',
    timezone: 'UTC',
    zohoProjectId: '',
  })

  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [logoUrl, setLogoUrl] = useState<string>('')

  // Load project
  useEffect(() => {
    const loadProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        if (!res.ok) throw new Error('Failed to load project')

        const data = await res.json()
        setProject(data)
        setFormData({
          name: data.name,
          clientName: data.clientName,
          industry: data.industry || '',
          website: data.website || '',
          currency: data.currency,
          brandColor: data.brandColor,
          timezone: data.timezone || 'UTC',
          zohoProjectId: data.zohoProjectId || '',
        })
        setLogoUrl(data.logoUrl || '')
        setSelectedChannels(data.channels.map((ch: any) => ch.channel))
      } catch (error) {
        toast.error('Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [projectId])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()
      setLogoUrl(url)
      toast.success('Logo uploaded')
    } catch (error) {
      toast.error('Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSaveProject = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Project name is required')
      return
    }
    if (!formData.clientName.trim()) {
      toast.error('Client name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          clientName: formData.clientName,
          industry: formData.industry || undefined,
          website: formData.website || undefined,
          currency: formData.currency,
          brandColor: formData.brandColor,
          timezone: formData.timezone,
          logoUrl: logoUrl || undefined,
          zohoProjectId: formData.zohoProjectId || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')
      toast.success('Project updated')
    } catch (error) {
      toast.error('Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveChannels = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/channels`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: selectedChannels }),
      })

      if (!res.ok) throw new Error('Failed to save channels')
      toast.success('Channels updated')
    } catch (error) {
      toast.error('Failed to save channels')
    } finally {
      setSaving(false)
    }
  }

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    )
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Project not found</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Project Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{project.name}</p>
      </div>

      {/* Project Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Information</CardTitle>
          <CardDescription>Update your project details and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-3">
            <Label>Company Logo</Label>
            <div className="flex items-start gap-4">
              {logoUrl ? (
                <div className="h-20 w-20 rounded-lg border border-border bg-muted overflow-hidden">
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border border-dashed border-border bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground text-center px-2">No logo</span>
                </div>
              )}
              <div className="flex-1">
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    asChild
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </>
                    )}
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-2">PNG, JPG, or WebP. Max 2MB.</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client / Brand Name *</Label>
              <Input
                id="client"
                value={formData.clientName}
                onChange={e => setFormData(d => ({ ...d, clientName: e.target.value }))}
                placeholder="Client name"
              />
            </div>
          </div>

          {/* Industry & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={formData.industry} onValueChange={v => setFormData(d => ({ ...d, industry: v }))}>
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(ind => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={v => setFormData(d => ({ ...d, currency: v }))}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Website & Brand Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={e => setFormData(d => ({ ...d, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Brand Colour</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.brandColor}
                  onChange={e => setFormData(d => ({ ...d, brandColor: e.target.value }))}
                  className="h-10 w-12 rounded cursor-pointer border border-border bg-transparent"
                />
                <Input
                  value={formData.brandColor}
                  onChange={e => setFormData(d => ({ ...d, brandColor: e.target.value }))}
                  className="font-mono text-sm flex-1"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Zoho Project ID */}
          <div className="space-y-2">
            <Label htmlFor="zoho">Zoho Project ID</Label>
            <Input
              id="zoho"
              value={formData.zohoProjectId}
              onChange={e => setFormData(d => ({ ...d, zohoProjectId: e.target.value }))}
              placeholder="Enter your Zoho Project ID"
            />
            <p className="text-xs text-muted-foreground">
              Link this project to your Zoho account for integrated project management
            </p>
          </div>

          <Separator />

          <Button onClick={handleSaveProject} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Project Details'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Channel Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Channels</CardTitle>
          <CardDescription>Select which marketing channels this project uses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {CHANNEL_CATEGORIES.map((category: ChannelCategory) => (
            <div key={category}>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">
                {category}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {CHANNEL_GROUPS[category].map(channel => {
                  const isSelected = selectedChannels.includes(channel.id)
                  return (
                    <label
                      key={channel.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleChannel(channel.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: channel.color }}
                          />
                          <span className="font-medium text-sm">{channel.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{channel.description}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          {selectedChannels.length > 0 && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-2">Selected ({selectedChannels.length}):</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedChannels.map(id => {
                  const ch = getChannel(id as ChannelId)
                  return ch ? (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {ch.label}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}

          <Separator />

          <Button onClick={handleSaveChannels} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Channels'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Channel Connections Section */}
      <ChannelConnectionsSection
        projectId={projectId}
        enabledChannels={selectedChannels as ChannelId[]}
      />

      {/* Scheduled Reports Section */}
      <ScheduledReportsSection
        projectId={projectId}
        enabledChannels={selectedChannels as ChannelId[]}
      />
    </div>
  )
}
