export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Détail du scan</h1>
      <p className="text-muted-foreground">Scan ID: {id} — À venir en Phase 4</p>
    </div>
  )
}
