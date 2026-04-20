import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProjectCard } from '@/components/platform/project-card'
import { Button } from '@/components/ui/button'
import { Plus, BarChart3 } from 'lucide-react'
import { UserMenu } from '@/components/platform/user-menu'

export default async function ProjectsHomePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      clientName: true,
      industry: true,
      brandColor: true,
      logoUrl: true,
      updatedAt: true,
      channels: { where: { enabled: true }, select: { channel: true } },
    },
  })

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-8 border-b border-border">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {projects.length === 0
                ? 'Create your first project to get started'
                : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
            <UserMenu user={{ name: session.user.name, email: session.user.email }} />
          </div>
        </div>
      </div>

      {/* Projects grid */}
      <div className="flex-1 p-8">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="rounded-2xl bg-muted p-6 mb-6">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Create a project for each client or brand. Configure which marketing channels
              they use and get AI-powered insights tailored to their data.
            </p>
            <Button asChild size="lg">
              <Link href="/projects/new">
                <Plus className="mr-2 h-5 w-5" />
                Create your first project
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
            {/* New project card */}
            <Link href="/projects/new">
              <div className="border-2 border-dashed border-border/40 bg-muted/20 rounded-xl h-full min-h-[160px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer p-6">
                <Plus className="h-8 w-8" />
                <span className="text-sm font-medium">New Project</span>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
