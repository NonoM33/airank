'use client'

import { Book } from 'lucide-react'

export default function ApiDocsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Book className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Documentation API</h1>
          <p className="text-sm text-muted-foreground">
            AIRank Public API v1 — intégrez AIRank dans vos workflows
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">Authentification</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Toutes les requêtes nécessitent une clé API valide (plan Agency). Générez-la depuis{' '}
            <a href="/api-keys" className="text-primary hover:underline">votre console</a>.
          </p>
          <pre className="bg-background border border-border rounded-lg p-3 text-xs overflow-x-auto">
{`curl https://app.airank.ai/api/v1/brands \\
  -H "Authorization: Bearer ak_live_xxxxxxxxxxxxxx"`}
          </pre>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">Rate limiting</h2>
          <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
            <li>Lecture : 120 requêtes / minute</li>
            <li>Scan (POST /scan) : 10 requêtes / minute</li>
            <li>Headers renvoyés : <code className="text-xs bg-background px-1.5 py-0.5 rounded">X-RateLimit-Limit</code>, <code className="text-xs bg-background px-1.5 py-0.5 rounded">X-RateLimit-Remaining</code></li>
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">Endpoints</h2>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-xs font-mono">GET</span>
                <code className="text-sm font-mono">/api/v1/brands</code>
              </div>
              <p className="text-xs text-muted-foreground">Liste toutes les marques de votre compte.</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-xs font-mono">GET</span>
                <code className="text-sm font-mono">/api/v1/scans?brandId=&limit=</code>
              </div>
              <p className="text-xs text-muted-foreground">
                Liste les scans d'une marque avec leurs résultats par LLM.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 text-xs font-mono">POST</span>
                <code className="text-sm font-mono">/api/v1/scan</code>
                <span className="text-[10px] text-muted-foreground">scope: write</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Lance un scan immédiat. Débite vos crédits.
              </p>
              <pre className="bg-background border border-border rounded-lg p-3 text-xs overflow-x-auto">
{`curl -X POST https://app.airank.ai/api/v1/scan \\
  -H "Authorization: Bearer ak_live_xxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"brandId":"brand_123","query":"meilleur CRM B2B"}'`}
              </pre>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">Webhooks</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Recevez des notifications en temps réel. Configurez vos URLs depuis{' '}
            <a href="/settings?tab=webhooks" className="text-primary hover:underline">les réglages</a>.
          </p>
          <p className="text-xs text-muted-foreground mb-2">Événements disponibles :</p>
          <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
            <li><code className="text-xs bg-background px-1.5 py-0.5 rounded">scan.completed</code> — scan terminé</li>
            <li><code className="text-xs bg-background px-1.5 py-0.5 rounded">alert.triggered</code> — alerte déclenchée</li>
            <li><code className="text-xs bg-background px-1.5 py-0.5 rounded">score.drift</code> — dérive du score</li>
            <li><code className="text-xs bg-background px-1.5 py-0.5 rounded">competitor.appeared</code> — nouveau concurrent détecté</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Signature HMAC-SHA256 dans le header <code className="text-xs bg-background px-1.5 py-0.5 rounded">X-AIRank-Signature</code>.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">Zapier & Make</h2>
          <p className="text-sm text-muted-foreground">
            Utilisez nos webhooks pour déclencher des Zaps sur Zapier ou des scénarios sur Make.com. Format standard JSON.
          </p>
        </section>
      </div>
    </div>
  )
}
