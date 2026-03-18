'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Plus, Settings, LogOut, LayoutDashboard } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  clientName: string
  brandColor: string
}

interface PlatformSidebarProps {
  projects: Project[]
  user: { name?: string | null; email?: string | null }
}

export function PlatformSidebar({ projects, user }: PlatformSidebarProps) {
  const pathname = usePathname()

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() ?? '?'

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
        <BarChart3 className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">DM Data Studio</span>
      </div>

      {/* Main nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname === '/'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          All Projects
        </Link>

        {/* Projects list */}
        {projects.length > 0 && (
          <div className="mt-4">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Projects
            </p>
            <div className="space-y-1">
              {projects.map(project => {
                const isActive = pathname.startsWith(`/projects/${project.id}`)
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.brandColor }}
                    />
                    <span className="truncate">{project.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <Link
          href="/projects/new"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mt-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name ?? 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-muted-foreground" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
