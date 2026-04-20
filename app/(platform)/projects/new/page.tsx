'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, ArrowRight, Check, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { CHANNEL_GROUPS, CHANNEL_CATEGORIES, getChannel } from '@/lib/channels'
import type { ChannelId, ChannelCategory } from '@/lib/channels'
import { INDUSTRIES, CURRENCIES } from '@/lib/constants'

interface WizardData {
  name: string
  clientName: string
  industry: string
  website: string
  brandColor: string
  currency: string
  channels: ChannelId[]
}

const STEPS = [
  { label: 'Project details', description: 'Basic info about this project' },
  { label: 'Select channels', description: 'Choose what this project uses' },
  { label: 'Review', description: 'Confirm and create your project' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [data, setData] = useState<WizardData>({
    name: '',
    clientName: '',
    industry: '',
    website: '',
    brandColor: '#6366f1',
    currency: 'GBP',
    channels: [],
  })

  const update = (patch: Partial<WizardData>) => setData(d => ({ ...d, ...patch }))

  const toggleChannel = (id: ChannelId) => {
    setData(d => ({
      ...d,
      channels: d.channels.includes(id)
        ? d.channels.filter(c => c !== id)
        : [...d.channels, id],
    }))
  }

  const canProceed = () => {
    if (step === 0) return data.name.trim() && data.clientName.trim()
    if (step === 1) return data.channels.length > 0
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        clientName: data.clientName,
        industry: data.industry || undefined,
        website: data.website || undefined,
        brandColor: data.brandColor,
        currency: data.currency,
        channels: data.channels,
      }),
    })

    if (!res.ok) {
      toast.error('Failed to create project')
      setLoading(false)
      return
    }

    const project = await res.json()
    toast.success('Project created!')
    router.push(`/projects/${project.id}`)
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to projects
        </Button>

        {/* Numbered Stepper */}
        <div className="mb-8 flex justify-between">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-start flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm mb-2 transition-colors ${
                  i <= step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium text-center transition-colors ${
                  i === step ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mt-5 mx-2 transition-colors ${
                  i < step ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <Card className="relative min-h-[600px] flex flex-col">
          <CardHeader className="pb-6">
            <CardTitle>{STEPS[step].label}</CardTitle>
            <CardDescription>{STEPS[step].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 pb-24">

            {/* Step 0: Project details */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Acme Corp Q1"
                      value={data.name}
                      onChange={e => update({ name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">Client / Brand name *</Label>
                    <Input
                      id="client"
                      placeholder="e.g. Acme Corp"
                      value={data.clientName}
                      onChange={e => update({ clientName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={data.industry} onValueChange={v => update({ industry: v })}>
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Select an industry" />
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
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    value={data.website}
                    onChange={e => update({ website: e.target.value })}
                  />
                </div>


                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={data.currency} onValueChange={v => update({ currency: v })}>
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
            )}

            {/* Step 1: Select channels */}
            {step === 1 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Select the marketing channels this project uses. You can change this later in settings.
                </p>
                {CHANNEL_CATEGORIES.map((category: ChannelCategory) => (
                  <div key={category} className="mt-6 first:mt-0">
                    <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wider">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {CHANNEL_GROUPS[category].map(channel => {
                        const checked = data.channels.includes(channel.id)
                        return (
                          <div
                            key={channel.id}
                            onClick={() => toggleChannel(channel.id)}
                            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                              checked
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border hover:border-primary/30 hover:bg-muted/30'
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => {}}
                              className="mt-1"
                              onClick={e => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-6 w-6 rounded-md flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                                  style={{ backgroundColor: channel.color }}
                                  title={channel.label}
                                >
                                  {channel.label.slice(0, 1)}
                                </div>
                                <span className="font-medium text-sm">{channel.label}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{channel.description}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {category !== CHANNEL_CATEGORIES[CHANNEL_CATEGORIES.length - 1] && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                ))}

                {data.channels.length > 0 && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Selected ({data.channels.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {data.channels.map(id => {
                        const ch = getChannel(id)
                        return ch ? (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {ch.label}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className="h-14 w-14 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: data.brandColor }}
                    >
                      {data.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-base">{data.name}</p>
                      <p className="text-sm text-muted-foreground">{data.clientName}</p>
                    </div>
                  </div>

                  <Separator className="mb-6" />

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {data.industry && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">Industry</p>
                        <p className="text-sm font-semibold">{data.industry}</p>
                      </div>
                    )}
                    {data.website && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">Website</p>
                        <p className="text-sm font-semibold truncate">{data.website}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Currency</p>
                      <p className="text-sm font-semibold">
                        {CURRENCIES.find(c => c.code === data.currency)?.label || data.currency}
                      </p>
                    </div>
                  </div>

                  <Separator className="mb-6" />

                  <div>
                    <p className="text-sm font-medium mb-3">Channels ({data.channels.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {data.channels.map(id => {
                        const ch = getChannel(id)
                        return ch ? (
                          <Badge key={id} variant="secondary" className="text-xs flex items-center gap-1.5">
                            <div
                              className="h-3 w-3 rounded-sm"
                              style={{ backgroundColor: ch.color }}
                            />
                            {ch.label}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>

                <Alert variant="info">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Your dashboard will show only metrics for the channels you selected. You can connect API accounts in the project settings after creation.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>

          {/* Pinned Navigation */}
          <div className="absolute bottom-0 left-0 right-0 border-t bg-card p-4 rounded-b-lg flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex-1"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Create Project
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
