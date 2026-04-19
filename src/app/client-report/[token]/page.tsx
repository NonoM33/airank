import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'

interface ClientReportConfig {
  kind: string
  brandId: string
  token: string
  expiresAt: string
}

export default async function ClientReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const views = await prisma.dashboardView.findMany({ where: {} })
  const view = views.find((v) => {
    const cfg = v.config as unknown as ClientReportConfig
    return cfg?.kind === 'client_report' && cfg?.token === token
  })

  if (!view) notFound()
  const cfg = view.config as unknown as ClientReportConfig
  if (new Date(cfg.expiresAt).getTime() < Date.now()) notFound()

  const brand = await prisma.brand.findUnique({
    where: { id: cfg.brandId },
    include: {
      user: { select: { whiteLabelConfig: true } },
      scans: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { results: true },
      },
      positionHistory: {
        orderBy: { date: 'desc' },
        take: 30,
      },
    },
  })
  if (!brand) notFound()

  const wl = brand.user.whiteLabelConfig
  const avgScore = brand.scans.length > 0
    ? Math.round(brand.scans.reduce((s, x) => s + x.globalScore, 0) / brand.scans.length)
    : 0

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          {wl?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wl.logoUrl} alt="Logo" className="h-8" />
          )}
          <div>
            <div className="font-bold text-lg">
              {wl?.companyName ?? 'AIRank'} · Rapport de visibilité IA
            </div>
            <div className="text-xs text-muted-foreground">
              {brand.name} — généré le {new Date().toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>
        {wl?.supportEmail && (
          <a href={`mailto:${wl.supportEmail}`} className="text-xs text-primary hover:underline">
            Contact
          </a>
        )}
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Score moyen" value={`${avgScore}/100`} />
          <Stat label="Scans analysés" value={String(brand.scans.length)} />
          <Stat label="LLMs trackés" value="4" />
        </div>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-4">Derniers scans</h2>
          <div className="space-y-2">
            {brand.scans.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm truncate">{s.query}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className={`text-sm font-bold ${s.globalScore >= 70 ? 'text-green-500' : s.globalScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {s.globalScore}/100
                </div>
              </div>
            ))}
          </div>
        </section>

        {!wl?.hideAirankBranding && (
          <p className="text-center text-[10px] text-muted-foreground">
            Powered by AIRank — airank.ai
          </p>
        )}
        {wl?.footerText && (
          <p className="text-center text-[10px] text-muted-foreground">{wl.footerText}</p>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}
