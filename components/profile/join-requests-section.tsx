'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface JoinRequest {
  id: string
  name: string
  email: string
  status: string
  createdAt: string
}

export function JoinRequestsSection() {
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch('/api/admin/requests')
        if (!res.ok) throw new Error('Failed to fetch requests')
        const data = await res.json()
        setRequests(data.requests || [])
      } catch (error) {
        console.error(error)
        toast.error('Failed to load join requests')
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [])

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId)
    try {
      const res = await fetch('/api/admin/requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
      if (!res.ok) throw new Error('Failed to approve request')

      setRequests(requests.map(r => r.id === requestId ? { ...r, status: 'approved' } : r))
      toast.success('Request approved!')
    } catch (error) {
      toast.error('Failed to approve request')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setProcessing(requestId)
    try {
      const res = await fetch('/api/admin/requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
      if (!res.ok) throw new Error('Failed to reject request')

      setRequests(requests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r))
      toast.success('Request rejected')
    } catch (error) {
      toast.error('Failed to reject request')
    } finally {
      setProcessing(null)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const processedRequests = requests.filter(r => r.status !== 'pending')

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Join Requests</CardTitle>
          <CardDescription>Pending team member requests</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(request => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-sm text-muted-foreground">{request.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(request.id)}
                      disabled={processing === request.id}
                    >
                      {processing === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      disabled={processing === request.id}
                    >
                      {processing === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>Previously processed requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedRequests.map(request => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-sm text-muted-foreground">{request.email}</p>
                  </div>
                  <Badge variant={request.status === 'approved' ? 'default' : 'destructive'}>
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
