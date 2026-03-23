export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ScanComparison, type ScanSummary } from '@/components/dashboard/ScanComparison'
import { Columns } from 'lucide-react'

export default async function ComparePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const plan = (session.user as { plan?: string }).plan ?? 'FREE'

  // Get user's first brand
  const brand = await prisma.brand.findFirst({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  })

  let scans: ScanSummary[] = []

  if (brand) {
    const rawScans = await prisma.scan.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        query: true,
        globalScore: true,
        createdAt: true,
      },
    })

    scans = rawScans.map((s) => ({
      id: s.id,
      query: s.query,
      globalScore: s.globalScore,
      createdAt: s.createdAt.toISOString(),
    }))
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Columns className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Comparaison de Scans</h1>
          <p className="text-sm text-muted-foreground">
            Comparez deux scans côte à côte pour mesurer votre progression
          </p>
        </div>
      </div>

      {!brand ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
          Ajoutez une marque et lancez des scans pour utiliser la comparaison.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          <ScanComparison brandId={brand.id} scans={scans} plan={plan} />
        </div>
      )}
    </div>
  )
}
