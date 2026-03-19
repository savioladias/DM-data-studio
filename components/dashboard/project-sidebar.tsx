'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Settings2, ChevronRight
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
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border bg-gradient-to-b from-accent/30 to-transparent dark:from-accent/20 dark:to-transparent">
        <ProjectAvatar
          logoUrl={logoUrl}
          clientName={clientName}
          size="sm"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{projectName}</p>
          <Link href="/" className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 group/back">
            <span className="group-hover/back:-translate-x-0.5 transition-transform duration-150">←</span>
            {' '}All projects
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
                  'flex items-center gap-2 rounded-lg text-sm transition-colors duration-150 relative',
                  isActive
                    ? 'bg-accent/60 text-primary font-medium dark:bg-accent/50 pl-[10px] border-l-2 border-primary py-2'
                    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground dark:hover:bg-accent/30 px-3 py-2'
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
