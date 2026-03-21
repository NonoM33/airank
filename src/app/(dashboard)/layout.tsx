export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar placeholder — built in Phase 4 */}
      <aside className="w-64 border-r border-border bg-card hidden lg:flex flex-col">
        <div className="p-6 border-b border-border">
          <span className="font-bold text-primary text-xl">AIRank</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {['Dashboard', 'Scans', 'Concurrents', 'Rapports', 'Paramètres', 'Facturation'].map(
            (item) => (
              <div
                key={item}
                className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
              >
                {item}
              </div>
            )
          )}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
