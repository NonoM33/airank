export type Priority = 'critical' | 'important' | 'optimization'

export interface Recommendation {
  priority: Priority
  icon: string
  priorityLabel: string
  title: string
  description: string
  actions: string[]
}

const LLM_NAMES: Record<string, string> = {
  CHATGPT: 'ChatGPT',
  CLAUDE: 'Claude',
  PERPLEXITY: 'Perplexity',
  GEMINI: 'Gemini',
}

const LLM_TIPS: Record<string, string> = {
  CHATGPT:
    'ChatGPT s\'appuie sur des données d\'entraînement issues du web. Augmentez vos mentions sur Wikipedia, des blogs d\'autorité et des articles de presse.',
  CLAUDE:
    'Claude valorise l\'expertise démontrée et les sources fiables. Publiez du contenu expert et obtenez des mentions dans des publications reconnues.',
  PERPLEXITY:
    'Perplexity effectue des recherches web en temps réel. Assurez une présence fraîche sur des sites récemment indexés (actualités, forums, avis).',
  GEMINI:
    'Gemini utilise les données de l\'écosystème Google. Optimisez votre profil Google Business, encouragez les avis Google et renforcez votre présence sur les plateformes Google.',
}

export function generateRecommendations(
  results: Array<{
    llm: string
    mentioned: boolean
    position: number | null
    sentiment: string | null
  }>,
  brandName: string
): Recommendation[] {
  const recs: Recommendation[] = []

  const notMentioned = results.filter((r) => !r.mentioned)
  const mentionedResults = results.filter((r) => r.mentioned)
  const lowPosition = results.filter((r) => r.mentioned && r.position !== null && r.position > 3)
  const negative = results.filter((r) => r.mentioned && r.sentiment === 'NEGATIVE')

  // Critical: invisible everywhere
  if (notMentioned.length === results.length) {
    recs.push({
      priority: 'critical',
      icon: '🔴',
      priorityLabel: 'Critique',
      title: `${brandName} est invisible pour toutes les IA`,
      description: `Aucun LLM analysé ne mentionne ${brandName}. Votre marque n'existe pas encore dans les données utilisées par les IA pour répondre à cette requête.`,
      actions: [
        'Créez ou enrichissez votre page Wikipedia avec des sources vérifiables',
        'Obtenez des mentions dans des articles de presse et blogs d\'autorité de votre secteur',
        'Inscrivez-vous sur des annuaires, comparatifs et plateformes d\'avis sectoriels',
        'Développez une présence active sur les forums et communautés professionnelles',
      ],
    })
  } else {
    // Per-LLM: not mentioned
    for (const r of notMentioned) {
      const llmName = LLM_NAMES[r.llm] ?? r.llm
      recs.push({
        priority: 'critical',
        icon: '🔴',
        priorityLabel: 'Critique',
        title: `Invisible sur ${llmName}`,
        description: LLM_TIPS[r.llm] ?? `${brandName} n'apparaît pas dans les réponses de ${llmName}.`,
        actions: [
          'Obtenir des mentions sur des sites d\'autorité de votre secteur',
          'Créer du contenu optimisé répondant aux requêtes de vos clients',
          'Encourager les avis et témoignages clients sur les plateformes en ligne',
        ],
      })
    }
  }

  // Critical: negative sentiment
  for (const r of negative) {
    const llmName = LLM_NAMES[r.llm] ?? r.llm
    recs.push({
      priority: 'critical',
      icon: '🔴',
      priorityLabel: 'Critique',
      title: `Sentiment négatif sur ${llmName}`,
      description: `${brandName} est mentionné avec un ton négatif sur ${llmName}. Des avis négatifs ou articles critiques influencent la perception de l'IA.`,
      actions: [
        'Identifiez et répondez aux avis négatifs visibles en ligne',
        'Publiez du contenu positif (études de cas, témoignages) pour rééquilibrer',
        'Engagez une stratégie de gestion de réputation en ligne (ORM)',
        'Sollicitez activement des avis positifs auprès de clients satisfaits',
      ],
    })
  }

  // Important: low position
  for (const r of lowPosition) {
    const llmName = LLM_NAMES[r.llm] ?? r.llm
    recs.push({
      priority: 'important',
      icon: '🟡',
      priorityLabel: 'Important',
      title: `Position faible sur ${llmName} (#${r.position})`,
      description: `${brandName} est mentionné en position ${r.position} sur ${llmName}. Les IA tendent à recommander en priorité les marques les plus citées dans leurs sources d'autorité.`,
      actions: [
        'Augmentez le volume de backlinks depuis des sites d\'autorité de votre secteur',
        'Faites-vous citer dans des comparatifs, classements et études de marché',
        'Obtenez des mentions dans des Relations Presse sectorielles',
        'Multipliez les avis positifs sur les plateformes spécialisées',
      ],
    })
  }

  // Optimization: great visibility
  if (recs.length === 0 && mentionedResults.length === results.length) {
    recs.push({
      priority: 'optimization',
      icon: '🟢',
      priorityLabel: 'Optimisation',
      title: 'Consolidez votre position de leader',
      description: `${brandName} jouit d'une excellente visibilité sur tous les LLMs. Maintenez et renforcez cette position pour garder une longueur d'avance.`,
      actions: [
        'Continuez à produire du contenu de qualité régulièrement',
        'Développez vos cas d\'usage pour apparaître sur davantage de requêtes',
        'Surveillez l\'émergence de nouveaux concurrents avec des scans réguliers',
        'Testez des requêtes longue traîne pour découvrir de nouvelles opportunités',
      ],
    })
  }

  // Always add diversification tip if partially visible
  if (notMentioned.length > 0 && mentionedResults.length > 0) {
    recs.push({
      priority: 'optimization',
      icon: '🟢',
      priorityLabel: 'Optimisation',
      title: 'Diversifiez vos canaux de présence',
      description: 'Chaque IA a ses propres sources d\'information. Diversifiez vos canaux pour maximiser votre couverture globale.',
      actions: [
        'Publiez sur différents formats (articles, vidéos, podcasts, interviews)',
        'Participez à des événements sectoriels générateurs de mentions organiques',
        'Développez des partenariats créant des co-citations naturelles',
      ],
    })
  }

  return recs
}
