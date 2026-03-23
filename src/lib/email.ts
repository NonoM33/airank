import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://airank.fr'
const FROM = 'AIRank <noreply@airank.fr>'

let resend: Resend | null = null

function getResend(): Resend | null {
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY is not set — emails are disabled')
    return null
  }
  if (!resend) resend = new Resend(apiKey)
  return resend
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AIRank</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:Inter,Arial,sans-serif;color:#E4E4E7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;">
    <tr>
      <td style="padding:24px 32px;background:#141416;border-radius:12px;border:1px solid #27272A;">
        <!-- Logo -->
        <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#E4E4E7;">
          ✦ <span style="color:#6366F1;">AIRank</span>
        </p>
        ${content}
        <hr style="margin:32px 0;border:none;border-top:1px solid #27272A;" />
        <p style="margin:0;font-size:12px;color:#71717A;">
          Vous recevez cet email car vous êtes inscrit sur <a href="${appUrl}" style="color:#6366F1;">${appUrl}</a>.
          <br />Pour vous désabonner, rendez-vous dans vos <a href="${appUrl}/settings" style="color:#6366F1;">paramètres</a>.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6366F1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${label}</a>`
}

// ---------------------------------------------------------------------------
// sendCompetitorAlert
// ---------------------------------------------------------------------------

export interface CompetitorAlertParams {
  brandName: string
  competitor: string
  llm: string
  query: string
}

export async function sendCompetitorAlert(
  to: string,
  params: CompetitorAlertParams,
): Promise<{ success: boolean }> {
  const client = getResend()
  if (!client) return { success: false }

  const { brandName, competitor, llm, query } = params

  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#FCA5A5;">⚠️ Nouveau concurrent détecté</h2>
    <p style="margin:0 0 16px;color:#A1A1AA;font-size:14px;">
      <strong style="color:#E4E4E7;">${competitor}</strong> vient d'apparaître dans <strong style="color:#E4E4E7;">${llm}</strong>
      pour votre marque <strong style="color:#E4E4E7;">${brandName}</strong>.
    </p>
    <div style="background:#1C1C1E;border:1px solid #27272A;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 4px;font-size:12px;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Requête analysée</p>
      <p style="margin:0;font-size:14px;color:#E4E4E7;">${query}</p>
    </div>
    <p style="margin:16px 0;color:#A1A1AA;font-size:14px;">
      Analysez maintenant l'impact de ce concurrent sur votre visibilité IA et adaptez votre stratégie.
    </p>
    ${btn('Voir les détails', `${appUrl}/dashboard`)}
  `)

  try {
    await client.emails.send({
      from: FROM,
      to,
      subject: `⚠️ ${competitor} vient d'apparaître dans ${llm} pour votre marque`,
      html,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] sendCompetitorAlert error:', err)
    return { success: false }
  }
}

// ---------------------------------------------------------------------------
// sendHealthCheck
// ---------------------------------------------------------------------------

export interface HealthCheckParams {
  brandName: string
  score: number
  variation: number
  topIssue: string
  action: string
}

export async function sendHealthCheck(
  to: string,
  params: HealthCheckParams,
): Promise<{ success: boolean }> {
  const client = getResend()
  if (!client) return { success: false }

  const { brandName, score, variation, topIssue, action } = params
  const variationColor = variation >= 0 ? '#4ADE80' : '#FCA5A5'
  const variationSign = variation >= 0 ? '+' : ''

  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#E4E4E7;">📊 Rapport hebdomadaire</h2>
    <p style="margin:0 0 24px;color:#A1A1AA;font-size:14px;">Voici l'état de votre visibilité IA pour <strong style="color:#E4E4E7;">${brandName}</strong>.</p>

    <div style="display:flex;gap:16px;margin:0 0 24px;">
      <div style="flex:1;background:#1C1C1E;border:1px solid #27272A;border-radius:8px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Score actuel</p>
        <p style="margin:0;font-size:32px;font-weight:700;color:#6366F1;">${score}</p>
      </div>
      <div style="flex:1;background:#1C1C1E;border:1px solid #27272A;border-radius:8px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Variation semaine</p>
        <p style="margin:0;font-size:32px;font-weight:700;color:${variationColor};">${variationSign}${variation}</p>
      </div>
    </div>

    <div style="background:#1C1C1E;border:1px solid #FCA5A5;border-radius:8px;padding:16px;margin:0 0 16px;">
      <p style="margin:0 0 4px;font-size:12px;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Alerte critique</p>
      <p style="margin:0;font-size:14px;color:#FCA5A5;">${topIssue}</p>
    </div>

    <div style="background:#1C1C1E;border:1px solid #4ADE80;border-radius:8px;padding:16px;margin:0 0 16px;">
      <p style="margin:0 0 4px;font-size:12px;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Action suggérée</p>
      <p style="margin:0;font-size:14px;color:#4ADE80;">${action}</p>
    </div>

    ${btn('Voir mon dashboard', `${appUrl}/dashboard`)}
  `)

  try {
    await client.emails.send({
      from: FROM,
      to,
      subject: `📊 Votre rapport hebdomadaire AIRank — ${brandName}`,
      html,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] sendHealthCheck error:', err)
    return { success: false }
  }
}

// ---------------------------------------------------------------------------
// sendMilestoneEmail
// ---------------------------------------------------------------------------

export interface MilestoneParams {
  type: 'j1' | 'j7' | 'j30'
  brandName: string
  data?: Record<string, unknown>
}

const MILESTONE_CONTENT: Record<
  MilestoneParams['type'],
  { subject: string; title: string; body: string; cta: string }
> = {
  j1: {
    subject: '👀 Vos concurrents sont déjà là — regardez ça',
    title: '👀 Vos concurrents sont visibles sur ces requêtes',
    body: "Votre premier scan est prêt ! Découvrez quels concurrents apparaissent à votre place dans les réponses des IA pour votre marque. C'est le bon moment pour agir.",
    cta: 'Voir mes résultats',
  },
  j7: {
    subject: '⏰ Votre score commence à dater',
    title: '⏰ Il est temps de relancer un scan',
    body: "Une semaine s'est écoulée depuis votre dernier scan. Les IA évoluent vite — la visibilité de votre marque a peut-être changé. Relancez un scan pour rester à jour.",
    cta: 'Lancer un scan',
  },
  j30: {
    subject: `📅 Votre rapport mensuel AIRank`,
    title: '📅 Un mois de visibilité IA',
    body: "Un mois s'est écoulé depuis votre inscription. Consultez l'évolution de votre score sur 30 jours et identifiez les opportunités pour améliorer votre visibilité.",
    cta: 'Voir mon rapport',
  },
}

export async function sendMilestoneEmail(
  to: string,
  params: MilestoneParams,
): Promise<{ success: boolean }> {
  const client = getResend()
  if (!client) return { success: false }

  const { type, brandName } = params
  const content = MILESTONE_CONTENT[type]

  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#E4E4E7;">${content.title}</h2>
    <p style="margin:0 0 8px;color:#A1A1AA;font-size:14px;">Pour votre marque <strong style="color:#E4E4E7;">${brandName}</strong></p>
    <p style="margin:0 0 24px;color:#A1A1AA;font-size:14px;">${content.body}</p>
    ${btn(content.cta, `${appUrl}/dashboard`)}
  `)

  try {
    await client.emails.send({
      from: FROM,
      to,
      subject: content.subject,
      html,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] sendMilestoneEmail error:', err)
    return { success: false }
  }
}

// ---------------------------------------------------------------------------
// sendMonthlyReport
// ---------------------------------------------------------------------------

export interface MonthlyReportParams {
  brandName: string
  avgScore: number
  variation: number
  topQuery: string
  worstQuery: string
}

export async function sendMonthlyReport(
  to: string,
  params: MonthlyReportParams,
): Promise<{ success: boolean }> {
  const client = getResend()
  if (!client) return { success: false }

  const { brandName, avgScore, variation, topQuery, worstQuery } = params
  const variationColor = variation >= 0 ? '#4ADE80' : '#FCA5A5'
  const variationSign = variation >= 0 ? '+' : ''

  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#E4E4E7;">📈 Rapport mensuel</h2>
    <p style="margin:0 0 24px;color:#A1A1AA;font-size:14px;">Votre visibilité IA pour <strong style="color:#E4E4E7;">${brandName}</strong> sur le mois écoulé.</p>

    <div style="display:flex;gap:16px;margin:0 0 24px;">
      <div style="flex:1;background:#1C1C1E;border:1px solid #27272A;border-radius:8px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Score moyen</p>
        <p style="margin:0;font-size:32px;font-weight:700;color:#6366F1;">${avgScore}</p>
      </div>
      <div style="flex:1;background:#1C1C1E;border:1px solid #27272A;border-radius:8px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Évolution</p>
        <p style="margin:0;font-size:32px;font-weight:700;color:${variationColor};">${variationSign}${variation}</p>
      </div>
    </div>

    <div style="background:#1C1C1E;border:1px solid #27272A;border-radius:8px;padding:16px;margin:0 0 12px;">
      <p style="margin:0 0 4px;font-size:12px;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Meilleure requête</p>
      <p style="margin:0;font-size:14px;color:#4ADE80;">✓ ${topQuery}</p>
    </div>

    <div style="background:#1C1C1E;border:1px solid #27272A;border-radius:8px;padding:16px;margin:0 0 24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Requête à améliorer</p>
      <p style="margin:0;font-size:14px;color:#FCA5A5;">↓ ${worstQuery}</p>
    </div>

    ${btn('Voir mon rapport complet', `${appUrl}/dashboard`)}
  `)

  try {
    await client.emails.send({
      from: FROM,
      to,
      subject: `📈 Rapport mensuel AIRank — ${brandName}`,
      html,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] sendMonthlyReport error:', err)
    return { success: false }
  }
}

// ---------------------------------------------------------------------------
// sendChurnAlert
// ---------------------------------------------------------------------------

export interface ChurnAlertParams {
  brandName: string
  lastScanDate: Date
  topCompetitor?: string
}

export async function sendChurnAlert(
  to: string,
  params: ChurnAlertParams,
): Promise<{ success: boolean }> {
  const client = getResend()
  if (!client) return { success: false }

  const { brandName, lastScanDate, topCompetitor } = params
  const daysSince = Math.floor(
    (Date.now() - lastScanDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  const html = baseHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;color:#E4E4E7;">📡 Votre visibilité IA a peut-être changé</h2>
    <p style="margin:0 0 16px;color:#A1A1AA;font-size:14px;">
      Votre dernier scan pour <strong style="color:#E4E4E7;">${brandName}</strong> remonte à ${daysSince} jours.
      Les IA évoluent en permanence — votre position a probablement changé.
    </p>
    ${
      topCompetitor
        ? `<div style="background:#1C1C1E;border:1px solid #FCA5A5;border-radius:8px;padding:16px;margin:0 0 16px;">
        <p style="margin:0 0 4px;font-size:12px;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;">Concurrent à surveiller</p>
        <p style="margin:0;font-size:14px;color:#FCA5A5;">${topCompetitor} est actif sur vos requêtes</p>
      </div>`
        : ''
    }
    <p style="margin:0 0 24px;color:#A1A1AA;font-size:14px;">
      Relancez un scan maintenant pour connaître votre position exacte.
    </p>
    ${btn('Relancer un scan', `${appUrl}/dashboard`)}
  `)

  try {
    await client.emails.send({
      from: FROM,
      to,
      subject: 'Votre visibilité IA a peut-être changé',
      html,
    })
    return { success: true }
  } catch (err) {
    console.error('[email] sendChurnAlert error:', err)
    return { success: false }
  }
}
