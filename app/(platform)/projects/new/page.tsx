'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, ArrowRight, Check, Loader2, BarChart3 } from 'lucide-react'
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

  const progressPercent = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to projects
        </Button>

        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-sm font-medium">{STEPS[step].label}</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
          <div className="flex justify-between mt-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full transition-colors ${
                  i < step ? 'bg-primary' : i === step ? 'bg-primary' : 'bg-muted'
                }`} />
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-16 transition-colors ${i < step ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step].label}</CardTitle>
            <CardDescription>{STEPS[step].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Step 0: Project details */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project name *</Label>
                    <Input placeholder="e.g. Acme Corp Q1" value={data.name} onChange={e => update({ name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Client / Brand name *</Label>
                    <Input placeholder="e.g. Acme Corp" value={data.clientName} onChange={e => update({ clientName: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Industry</Label>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRIES.map(ind => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => update({ industry: ind })}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          data.industry === ind
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input placeholder="https://example.com" value={data.website} onChange={e => update({ website: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Brand colour</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={data.brandColor}
                        onChange={e => update({ brandColor: e.target.value })}
                        className="h-10 w-12 rounded cursor-pointer border border-border bg-transparent"
                      />
                      <Input
                        value={data.brandColor}
                        onChange={e => update({ brandColor: e.target.value })}
                        className="font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <div className="flex flex-wrap gap-2">
                      {CURRENCIES.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => update({ currency: c.code })}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            data.currency === c.code
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
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
                  <div key={category}>
                    <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {CHANNEL_GROUPS[category].map(channel => {
                        const checked = data.channels.includes(channel.id)
                        return (
                          <label
                            key={channel.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              checked ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-muted/50'
                            }`}
                          >
                            <Checkbox
                              checked={checked}
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
                    {category !== CHANNEL_CATEGORIES[CHANNEL_CATEGORIES.length - 1] && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                ))}

                {data.channels.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-2">Selected ({data.channels.length}):</p>
                    <div className="flex flex-wrap gap-1">
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
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: data.brandColor }}
                    >
                      {data.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{data.name}</p>
                      <p className="text-sm text-muted-foreground">{data.clientName}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {data.industry && (
                      <div><span className="text-muted-foreground">Industry:</span> {data.industry}</div>
                    )}
                    {data.website && (
                      <div><span className="text-muted-foreground">Website:</span> {data.website}</div>
                    )}
                    <div><span className="text-muted-foreground">Currency:</span> {data.currency}</div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium mb-2">Channels ({data.channels.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.channels.map(id => {
                        const ch = getChannel(id)
                        return ch ? (
                          <Badge key={id} variant="secondary" className="text-xs flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ch.color }} />
                            {ch.label}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <BarChart3 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Your dashboard will show only metrics for the channels you selected. You can connect API
                    accounts in the project settings after creation.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Create Project
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
