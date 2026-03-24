'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Settings2, Upload, Loader2, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ProjectAvatar } from '@/components/project-avatar'
import { ProjectTeamSection } from '@/components/settings/project-team-section'
import { INDUSTRIES, CURRENCIES } from '@/lib/constants'
import { CHANNEL_GROUPS, CHANNEL_CATEGORIES, getChannel } from '@/lib/channels'
import type { ChannelId, ChannelCategory } from '@/lib/channels'
import { GA4PropertyPicker } from '@/components/ga4-property-picker'
import { GSCSitePicker } from '@/components/gsc-site-picker'

interface ChannelConnection {
  channel: ChannelId
  connected: boolean
  accountName?: string
  accountId?: string
}

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
  const [connections, setConnections] = useState<Map<ChannelId, ChannelConnection>>(new Map())
  const [connecting, setConnecting] = useState<ChannelId | null>(null)
  const [ga4PickerOpen, setGa4PickerOpen] = useState(false)
  const [gscPickerOpen, setGscPickerOpen] = useState(false)
  const pickerAutoOpened = useRef(false)

  // Auto-open pickers after OAuth redirect
  useEffect(() => {
    if (pickerAutoOpened.current) return
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    if (params.get('success') === 'true') {
      pickerAutoOpened.current = true
      if (connected === 'GOOGLE_ANALYTICS') setGa4PickerOpen(true)
      if (connected === 'GOOGLE_SEARCH_CONSOLE') setGscPickerOpen(true)
    }
  }, [])

  const parseConnections = (data: any) => {
    if (data.credentials) {
      const map = new Map<ChannelId, ChannelConnection>()
      for (const cred of data.credentials) {
        map.set(cred.channel as ChannelId, {
          channel: cred.channel,
          connected: !!cred.accessToken,
          accountName: cred.accountName,
          accountId: cred.accountId,
        })
      }
      setConnections(map)
    }
  }

  const handleConnect = async (channelId: ChannelId) => {
    setConnecting(channelId)
    window.location.href = `/api/integrations/authorize?platform=${channelId}&projectId=${projectId}`
  }

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
        parseConnections(data)
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
              <ProjectAvatar
                logoUrl={logoUrl}
                clientName={formData.clientName}
                size="lg"
                className="h-20 w-20 border border-dashed border-border text-2xl"
              />
              <div className="flex-1">
                <input
                  id="logo-upload"
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
                  onClick={() => document.getElementById('logo-upload')?.click()}
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
                  const connection = connections.get(channel.id as ChannelId)
                  const isConnected = connection?.connected ?? false
                  return (
                    <div
                      key={channel.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isSelected ? 'border-primary bg-primary/8' : 'border-border'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleChannel(channel.id)}
                        className="mt-0.5 flex-shrink-0 cursor-pointer"
                      />
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => toggleChannel(channel.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-sm flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                            style={{ backgroundColor: channel.color }}
                          >
                            {channel.label.charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{channel.label}</span>
                          {isSelected && isConnected && (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isSelected && isConnected && connection?.accountName && connection.accountId !== 'pending-property-selection'
                            ? connection.accountName
                            : channel.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isConnected && channel.id === 'GOOGLE_ANALYTICS' && (() => {
                            const needsSelection = !connection?.accountId || connection.accountId === 'pending-property-selection'
                            return (
                              <Button
                                onClick={() => setGa4PickerOpen(true)}
                                size="sm"
                                variant={needsSelection ? 'default' : 'outline'}
                                className="cursor-pointer"
                              >
                                {needsSelection ? 'Select Property' : 'Change'}
                              </Button>
                            )
                          })()}
                          {isConnected && channel.id === 'GOOGLE_SEARCH_CONSOLE' && (() => {
                            const needsSelection = !connection?.accountId || connection.accountId === 'pending-site-selection'
                            return (
                              <Button
                                onClick={() => setGscPickerOpen(true)}
                                size="sm"
                                variant={needsSelection ? 'default' : 'outline'}
                                className="cursor-pointer"
                              >
                                {needsSelection ? 'Select Site' : 'Change'}
                              </Button>
                            )
                          })()}
                          <Button
                            onClick={() => handleConnect(channel.id as ChannelId)}
                            disabled={connecting === channel.id}
                            variant={isConnected ? 'outline' : 'default'}
                            size="sm"
                            className="cursor-pointer"
                          >
                            {connecting === channel.id ? (
                              <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Connecting...</>
                            ) : isConnected ? 'Reconnect' : 'Connect'}
                          </Button>
                        </div>
                      )}
                    </div>
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
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              ) : 'Save Channels'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <GA4PropertyPicker
        projectId={projectId}
        open={ga4PickerOpen}
        onClose={() => setGa4PickerOpen(false)}
        onSaved={async () => {
          const res = await fetch(`/api/projects/${projectId}`)
          if (res.ok) parseConnections(await res.json())
        }}
      />

      <GSCSitePicker
        projectId={projectId}
        open={gscPickerOpen}
        onClose={async () => {
          setGscPickerOpen(false)
          const res = await fetch(`/api/projects/${projectId}`)
          if (res.ok) parseConnections(await res.json())
        }}
      />

      {/* Scheduled Reports Section */}
      {/* <ScheduledReportsSection
        projectId={projectId}
        enabledChannels={selectedChannels as ChannelId[]}
      /> */}

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
