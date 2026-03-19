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
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border bg-gradient-to-b from-accent/40 to-transparent dark:from-accent/30 dark:to-transparent">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground shadow-[0_1px_3px_var(--glow-primary)]">
          <BarChart3 className="h-4 w-4" />
        </div>
        <span className="font-bold text-base tracking-tight">DM Data Studio</span>
      </div>

      {/* Main nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2 rounded-lg text-sm transition-colors duration-150 relative',
            pathname === '/'
              ? 'bg-accent/60 text-primary font-medium dark:bg-accent/50 pl-[10px] border-l-2 border-primary'
              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground dark:hover:bg-accent/30 px-3 py-2'
          )}
        >
          <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
          <span className={cn(pathname === '/' ? 'py-2' : '')}>All Projects</span>
        </Link>

        {/* Projects list */}
        {projects.length > 0 && (
          <div className="mt-4">
            <p className="px-3 mb-1.5 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
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
                      'flex items-center gap-2 rounded-lg text-sm transition-colors duration-150 relative',
                      isActive
                        ? 'bg-accent/60 text-primary font-medium dark:bg-accent/50 pl-[10px] border-l-2 border-primary py-2'
                        : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground dark:hover:bg-accent/30 px-3 py-2'
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0 ring-1 ring-offset-1 ring-offset-transparent"
                      style={{ backgroundColor: project.brandColor, '--tw-ring-color': project.brandColor + '40' } as React.CSSProperties}
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
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/40 hover:text-foreground dark:hover:bg-accent/30 transition-colors duration-150 mt-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* User footer */}
      <div className="border-t border-border p-3 bg-gradient-to-t from-accent/20 to-transparent dark:from-accent/15 dark:to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
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
