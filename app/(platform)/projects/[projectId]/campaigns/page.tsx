import { use } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart2 } from 'lucide-react'

export default function CampaignsPage({ params }: { params: Promise<{ projectId: string }> }) {
  use(params)

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-2">Campaigns</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Cross-platform campaign performance and funnel analysis.
      </p>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart2 className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-medium mb-2">Campaign tracking coming soon</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Once your ad accounts are connected, campaign-level data will appear here
            with funnel visualisations and AI performance analysis.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
