// Slack incoming webhook formatter with Block Kit layouts.
// https://api.slack.com/block-kit

interface SlackMessage {
  text: string
  blocks?: unknown[]
}

export function formatSlackMessage(event: string, data: Record<string, unknown>): SlackMessage {
  switch (event) {
    case 'scan.completed': {
      const score = data.globalScore as number
      const emoji = score >= 70 ? '🟢' : score >= 40 ? '🟡' : '🔴'
      return {
        text: `${emoji} Scan terminé — ${data.brandName} (${score}/100)`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `${emoji} Scan terminé` },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Marque:*\n${data.brandName}` },
              { type: 'mrkdwn', text: `*Score:*\n${score}/100` },
              { type: 'mrkdwn', text: `*Requête:*\n${data.query}` },
              { type: 'mrkdwn', text: `*LLMs:*\n${data.llmCount}` },
            ],
          },
        ],
      }
    }
    case 'alert.triggered':
    case 'score.drift': {
      return {
        text: `⚠️ Alerte — ${data.message ?? event}`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `⚠️ *Alerte AIRank*\n${data.message ?? event}` },
          },
        ],
      }
    }
    case 'competitor.appeared': {
      return {
        text: `🆕 Nouveau concurrent détecté : ${data.competitorName}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🆕 *Nouveau concurrent détecté*\n*${data.competitorName}* est maintenant cité par les IA pour *${data.brandName}*.`,
            },
          },
        ],
      }
    }
    default:
      return { text: `[AIRank] ${event}` }
  }
}

export async function sendToSlack(webhookUrl: string, message: SlackMessage): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    return res.ok
  } catch (err) {
    console.error('[slack] send failed', err)
    return false
  }
}
