import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { getPlanLimits } from '@/lib/plan-limits'
import { FileText, Lock } from 'lucide-react'

export default async function ReportsPage() {
  const session = await auth()
  const userId = session!.user.id
  const plan = session!.user.plan ?? 'FREE'
  const limits = getPlanLimits(plan)

  const brands = await prisma.brand.findMany({
    where: { userId },
    include: {
      _count: { select: { scans: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!limits.pdfExport) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Rapports</h1>
          <p className="text-muted-foreground">Exportez vos analyses en PDF</p>
        </div>
        <div className="card-glow rounded-xl bg-card border border-border p-12 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Fonctionnalité Pro</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Les rapports PDF sont disponibles à partir du plan Pro (49€/mois).
            Exportez des rapports complets avec analyse concurrentielle et recommandations.
          </p>
          <Link
            href="/billing"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 transition-colors hover:bg-primary/90"
          >
            Passer au plan Pro
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rapports</h1>
        <p className="text-muted-foreground">Exportez vos analyses en PDF</p>
      </div>

      {brands.length === 0 ? (
        <div className="card-glow rounded-xl bg-card border border-border p-12 text-center">
          <p className="text-muted-foreground">
            <Link href="/settings" className="text-primary hover:underline">Ajoutez une marque</Link>{' '}
            pour générer des rapports.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="card-glow rounded-xl bg-card border border-border p-6 flex flex-col gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{brand.name}</p>
                  <p className="text-xs text-muted-foreground">{brand._count.scans} scans</p>
                </div>
              </div>
              <a
                href={`/api/reports/${brand.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center rounded-lg border border-border bg-background text-sm font-medium px-3 py-1.5 transition-colors hover:bg-muted"
              >
                Télécharger le rapport PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
