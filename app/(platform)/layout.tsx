import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { PlatformSidebar } from '@/components/platform/platform-sidebar'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, clientName: true, brandColor: true },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <PlatformSidebar
        projects={projects}
        user={{ name: session.user.name, email: session.user.email }}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
