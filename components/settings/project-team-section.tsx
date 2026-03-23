'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, X, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface User {
  id: string
  name: string
  email: string
}

interface ProjectTeamSectionProps {
  projectId: string
}

export function ProjectTeamSection({ projectId }: ProjectTeamSectionProps) {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/team`)
        if (!res.ok) throw new Error('Failed to load team')
        const data = await res.json()
        setTeam(data.team || [])
      } catch (error) {
        console.error(error)
        toast.error('Failed to load team members')
      } finally {
        setLoading(false)
      }
    }

    const loadAvailableUsers = async () => {
      try {
        const res = await fetch('/api/admin/users')
        if (!res.ok) throw new Error('Failed to load users')
        const data = await res.json()
        setAvailableUsers(data.users || [])
      } catch (error) {
        console.error(error)
        // If endpoint doesn't exist, we'll handle gracefully
      }
    }

    loadTeam()
    loadAvailableUsers()
  }, [projectId])

  const handleAddUser = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user')
      return
    }

    setAdding(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add user')
      }
      const data = await res.json()
      setTeam([...team, data])
      setSelectedUserId('')
      toast.success('User added to team')
    } catch (error: any) {
      toast.error(error.message || 'Failed to add user')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    setRemoving(userId)
    try {
      const res = await fetch(`/api/projects/${projectId}/team/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove user')
      setTeam(team.filter(m => m.user.id !== userId))
      toast.success('User removed from team')
    } catch (error) {
      toast.error('Failed to remove user')
    } finally {
      setRemoving(null)
    }
  }

  const teamMemberIds = team.map(m => m.user.id)
  const usersToAdd = availableUsers.filter(u => !teamMemberIds.includes(u.id))

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team Members</CardTitle>
        <CardDescription>Manage which team members have access to this project</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Team Members */}
        {team.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-3">Current team ({team.length})</p>
            <div className="space-y-2">
              {team.map(member => (
                <div key={member.user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{member.user.name}</p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveUser(member.user.id)}
                    disabled={removing === member.user.id}
                  >
                    {removing === member.user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add User Section */}
        {usersToAdd.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Add team member</p>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {usersToAdd.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddUser} disabled={adding || !selectedUserId}>
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {team.length === 0 && usersToAdd.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No team members yet</p>
        )}
      </CardContent>
    </Card>
  )
}
