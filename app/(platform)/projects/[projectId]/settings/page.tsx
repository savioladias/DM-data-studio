'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { Settings2, Upload, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { ProjectAvatar } from '@/components/project-avatar'
import { ChannelConnectionsSection } from '@/components/settings/channel-connections-section'
import { ScheduledReportsSection } from '@/components/settings/scheduled-reports-section'
import { ProjectTeamSection } from '@/components/settings/project-team-section'
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
  const router = useRouter()

  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  const handleDeleteProject = async () => {
    if (!deleteConfirmed) {
      setDeleteConfirmed(true)
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete project')
      toast.success('Project deleted successfully')
      router.push('/')
    } catch (error) {
      toast.error('Failed to delete project')
      setDeleteConfirmed(false)
    } finally {
      setDeleting(false)
    }
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
    <div className="p-6 space-y-10 max-w-3xl">
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
              <div className={logoUrl ? 'h-20 w-20 rounded-lg border border-border bg-muted overflow-hidden' : 'h-20 w-20 rounded-lg border border-dashed border-border'}>
                <ProjectAvatar
                  logoUrl={logoUrl}
                  clientName={formData.clientName}
                  size="lg"
                  className={logoUrl ? 'h-20 w-20' : ''}
                />
              </div>
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

          {/* Website */}
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

          {/* Brand Color */}
          <div className="space-y-2">
            <Label htmlFor="brandColor">Brand Colour</Label>
            <div className="flex items-center gap-2">
              <input
                id="brandColor"
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
                placeholder="#6366f1"
              />
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

          <div className="flex justify-end">
            <Button onClick={handleSaveProject} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Project Details'
              )}
            </Button>
          </div>
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
                      onClick={(e) => {
                        e.preventDefault()
                        toggleChannel(channel.id)
                      }}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleChannel(channel.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-sm flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                            style={{ backgroundColor: channel.color }}
                          >
                            {channel.label.charAt(0)}
                          </div>
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
                    <Badge key={id} variant="secondary" className="text-xs gap-1.5">
                      <div
                        className="h-3 w-3 rounded-sm flex items-center justify-center text-white text-[8px] font-semibold"
                        style={{ backgroundColor: ch.color }}
                      >
                        {ch.label.charAt(0)}
                      </div>
                      {ch.label}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSaveChannels} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Channels'
              )}
            </Button>
          </div>
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

      {/* Project Team Section */}
      <ProjectTeamSection projectId={projectId} />

      {/* Delete Project Card */}
      <Card className="border-red-500/20 bg-red-50/50 dark:bg-red-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Delete Project
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Once deleted, there is no going back. Please be certain.
          </p>
          {deleteConfirmed && (
            <div className="p-2 rounded-lg border border-red-500/30 bg-red-50/50 dark:bg-red-950/30">
              <p className="text-xs font-medium text-red-600 mb-2">
                This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setDeleteConfirmed(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleDeleteProject}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          {!deleteConfirmed && (
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              onClick={handleDeleteProject}
              disabled={deleting}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete Project
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
