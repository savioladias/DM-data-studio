'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Brain, FileText, Settings2, ChevronRight
} from 'lucide-react'
import { ProjectAvatar } from '@/components/project-avatar'
import type { ChannelId } from '@/lib/channels'
import { cn } from '@/lib/utils'

interface ProjectSidebarProps {
  projectId: string
  projectName: string
  clientName: string
  logoUrl?: string | null
  brandColor: string
  enabledChannels: ChannelId[]
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  children?: { label: string; href: string; color?: string }[]
}

export function ProjectSidebar({ projectId, projectName, clientName, logoUrl, brandColor }: ProjectSidebarProps) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  const navItems: NavItem[] = [
    {
      label: 'Overview',
      href: base,
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      label: 'AI Summary',
      href: `${base}/ai-insights`,
      icon: <Brain className="h-4 w-4" />,
    },
    {
      label: 'Reports',
      href: `${base}/reports`,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: 'Settings',
      href: `${base}/settings`,
      icon: <Settings2 className="h-4 w-4" />,
    },
  ]

  return (
    <div className="flex h-screen w-56 flex-col border-r border-border bg-card">
      {/* Project header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <ProjectAvatar
          logoUrl={logoUrl}
          clientName={clientName}
          size="sm"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{projectName}</p>
          <Link href="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            ← All projects
          </Link>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map(item => {
          const isActive = item.href === base ? pathname === base : pathname.startsWith(item.href)
          const hasChildren = item.children && item.children.length > 0

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.icon}
                <span className="flex-1 truncate">{item.label}</span>
                {hasChildren && <ChevronRight className="h-3 w-3" />}
              </Link>

              {hasChildren && isActive && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
                  {item.children!.map(child => {
                    const childActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                          childActive
                            ? 'text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {child.color && (
                          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: child.color }} />
                        )}
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}
