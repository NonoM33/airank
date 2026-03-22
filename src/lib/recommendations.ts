export type Priority = 'critical' | 'important' | 'optimization'
export type Difficulty = 'facile' | 'moyen' | 'avancé'

export interface Recommendation {
  priority: Priority
  icon: string
  priorityLabel: string
  title: string
  description: string
  actions: string[]
  estimatedImpact: string
  difficulty: Difficulty
  timeToResult: string
  category: 'quick-win' | 'cette-semaine' | 'ce-mois'
}

const LLM_NAMES: Record<string, string> = {
  CHATGPT: 'ChatGPT',
  CLAUDE: 'Claude',
  PERPLEXITY: 'Perplexity',
  GEMINI: 'Gemini',
}

const SCHEMA_ORG_EXAMPLE = `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "VotreMarque",
  "url": "https://votresite.fr",
  "description": "Description claire de votre activité"
}`

export function generateRecommendations(
  results: Array<{
    llm: string
    mentioned: boolean
    position: number | null
    sentiment: string | null
    competitors: string
  }>,
  brandName: string,
  brandDomain?: string | null
): Recommendation[] {
  const recs: Recommendation[] = []

  const notMentioned = results.filter((r) => !r.mentioned)
  const mentionedResults = results.filter((r) => r.mentioned)
  const lowPosition = results.filter((r) => r.mentioned && r.position !== null && r.position > 3)
  const negative = results.filter((r) => r.mentioned && r.sentiment === 'NEGATIVE')

  // Parse competitors from all results
  const allCompetitors: string[] = []
  for (const r of results) {
    try {
      const comps = JSON.parse(r.competitors) as string[]
      for (const c of comps) {
        if (c && !allCompetitors.includes(c)) allCompetitors.push(c)
      }
    } catch { /* skip */ }
  }
  const topCompetitor = allCompetitors[0] ?? null

  // ── QUICK WINS ────────────────────────────────────────────────────────────────

  // Schema.org — always recommended
  recs.push({
    priority: notMentioned.length > 0 ? 'critical' : 'important',
    icon: notMentioned.length > 0 ? '🔴' : '🟡',
    priorityLabel: notMentioned.length > 0 ? 'Critique' : 'Important',
    title: 'Ajoutez le balisage Schema.org Organization sur votre page d\'accueil',
    description: `Les IA lisent les données structurées pour identifier qui vous êtes. Sans Schema.org, ${brandName} reste une marque anonyme pour les modèles d'IA. Ajoutez ce JSON-LD dans le <head> de votre page d'accueil : ${SCHEMA_ORG_EXAMPLE}`,
    actions: [
      `Ouvrez le code source de votre page d'accueil (ou votre CMS)`,
      `Collez le JSON-LD Schema.org dans la balise <head>, en remplaçant les valeurs`,
      `Ajoutez aussi "sameAs" avec vos URLs LinkedIn, Twitter, Wikipedia si existants`,
      `Validez sur schema.org/validator ou le Rich Results Test de Google`,
    ],
    estimatedImpact: '+10 à +20 points de score IA sur 3 mois',
    difficulty: 'facile',
    timeToResult: '2–4 semaines',
    category: 'quick-win',
  })

  // Google Business Profile
  recs.push({
    priority: 'important',
    icon: '🟡',
    priorityLabel: 'Important',
    title: 'Vérifiez et complétez votre fiche Google Business Profile',
    description: `Gemini et Perplexity exploitent directement les données Google. Une fiche GBP complète et vérifiée augmente significativement la probabilité que ${brandName} soit cité par ces IA.`,
    actions: [
      'Connectez-vous sur business.google.com et revendiquez votre fiche si ce n\'est pas fait',
      'Complétez 100% des champs : horaires, description longue (750 car.), catégories',
      'Uploadez 10+ photos de qualité (logo, équipe, locaux, produits)',
      'Répondez à tous les avis existants en moins de 48h',
    ],
    estimatedImpact: '+15 points sur Gemini et Perplexity',
    difficulty: 'facile',
    timeToResult: '3–6 semaines',
    category: 'quick-win',
  })

  // FAQ page
  recs.push({
    priority: 'important',
    icon: '🟡',
    priorityLabel: 'Important',
    title: `Créez une page FAQ optimisée IA sur ${brandDomain ?? 'votre site'}`,
    description: `Les LLMs adorent les pages FAQ car elles correspondent exactement au format question/réponse qu'ils utilisent. Une page FAQ bien structurée sur ${brandName} augmente votre chance d'être cité quand un utilisateur pose une question directe.`,
    actions: [
      'Listez les 10 questions les plus fréquentes de vos clients (posez-leur directement)',
      'Répondez à chaque question en 3–5 phrases claires, en mentionnant "' + brandName + '" dans la réponse',
      'Ajoutez le balisage Schema.org FAQPage pour que Google l\'indexe comme FAQ',
      'Publiez sur /faq et linkez depuis votre page d\'accueil et vos pages produits',
    ],
    estimatedImpact: '+8 à +15 points de visibilité globale',
    difficulty: 'facile',
    timeToResult: '4–8 semaines',
    category: 'quick-win',
  })

  // LinkedIn
  recs.push({
    priority: 'optimization',
    icon: '🟢',
    priorityLabel: 'Optimisation',
    title: `Mettez à jour votre page LinkedIn Entreprise avec les mots-clés sectoriels`,
    description: `ChatGPT et Claude ont été entraînés sur des données LinkedIn. La description de votre page entreprise est l'un des textes les plus lus par ces IA. Optimisez-la pour votre secteur.`,
    actions: [
      `Réécrivez la description LinkedIn de ${brandName} en incluant votre secteur, vos produits/services clés et vos différenciateurs`,
      'Publiez 2 posts par semaine sur LinkedIn en mentionnant votre marque et secteur',
      'Complétez la section "Spécialités" avec 15 mots-clés sectoriels pertinents',
      'Demandez à vos collaborateurs de mentionner ' + brandName + ' dans leurs profils personnels',
    ],
    estimatedImpact: '+5 à +10 points sur ChatGPT et Claude',
    difficulty: 'facile',
    timeToResult: '6–12 semaines',
    category: 'quick-win',
  })

  // ── CETTE SEMAINE ────────────────────────────────────────────────────────────

  // When not mentioned by multiple LLMs
  if (notMentioned.length >= 2) {
    const year = new Date().getFullYear()
    recs.push({
      priority: 'critical',
      icon: '🔴',
      priorityLabel: 'Critique',
      title: `Publiez un article "Guide complet ${year}" qui mentionne ${brandName}`,
      description: `${brandName} n'est pas mentionné par ${notMentioned.map(r => LLM_NAMES[r.llm] ?? r.llm).join(', ')}. Ces IA cherchent du contenu expert et récent. Un article de fond positionné sur votre secteur va créer les mentions dont les IA ont besoin pour vous citer.`,
      actions: [
        `Rédigez un article de 1500+ mots : "Guide complet [votre secteur] ${year}" — incluez ${brandName} naturellement dans le texte`,
        `Publiez sur votre blog puis dupliquez sur Medium.com et LinkedIn Articles`,
        `Soumettez l'URL à Google Search Console pour indexation rapide`,
        `Partagez sur vos réseaux en taguant 3 influenceurs de votre secteur pour des mentions`,
      ],
      estimatedImpact: '+20 à +35 points sur les LLMs qui ne vous citent pas',
      difficulty: 'moyen',
      timeToResult: '6–10 semaines',
      category: 'cette-semaine',
    })
  } else if (notMentioned.length === 1) {
    const llmName = LLM_NAMES[notMentioned[0].llm] ?? notMentioned[0].llm
    recs.push({
      priority: 'important',
      icon: '🟡',
      priorityLabel: 'Important',
      title: `Ciblez les sources de ${llmName} pour apparaître dans ses réponses`,
      description: `${brandName} est invisible uniquement sur ${llmName}. Chaque IA a ses propres sources favoris. En ciblant précisément les bons canaux, vous pouvez corriger cette absence en quelques semaines.`,
      actions: [
        notMentioned[0].llm === 'PERPLEXITY'
          ? 'Perplexity indexe les actualités récentes — publiez un communiqué de presse sur un site d\'actualité sectoriel'
          : notMentioned[0].llm === 'GEMINI'
          ? 'Gemini utilise les données Google — optimisez votre GBP et vos avis Google en priorité'
          : notMentioned[0].llm === 'CHATGPT'
          ? 'ChatGPT apprend des données web historiques — obtenez des mentions sur des sites anciens et d\'autorité'
          : 'Obtenez des mentions sur des sites académiques et des publications spécialisées',
        `Créez du contenu sur les plateformes que ${llmName} crawle en priorité`,
        `Demandez à un partenaire ou fournisseur de vous mentionner sur son site`,
      ],
      estimatedImpact: '+15 à +25 points sur ' + llmName,
      difficulty: 'moyen',
      timeToResult: '4–8 semaines',
      category: 'cette-semaine',
    })
  }

  // Competitor comparison page (when competitors exist)
  if (topCompetitor) {
    recs.push({
      priority: lowPosition.length > 0 ? 'important' : 'optimization',
      icon: lowPosition.length > 0 ? '🟡' : '🟢',
      priorityLabel: lowPosition.length > 0 ? 'Important' : 'Optimisation',
      title: `Créez une page "${brandName} vs ${topCompetitor}" sur votre site`,
      description: `${topCompetitor} vous précède dans les réponses IA. Les pages comparatives sont massivement citées par les LLMs car elles répondent directement aux questions de comparaison des utilisateurs. C'est l'action la plus rapide pour dépasser un concurrent dans les réponses IA.`,
      actions: [
        `Créez une page /comparatif-${brandName.toLowerCase().replace(/\s+/g, '-')}-vs-${topCompetitor.toLowerCase().replace(/\s+/g, '-')} sur votre site`,
        `Structurez avec un tableau comparatif clair : fonctionnalités, prix, avantages ${brandName}`,
        `Ajoutez des témoignages clients qui ont switché de ${topCompetitor} à ${brandName}`,
        `Linkez cette page depuis votre page d'accueil et votre navigation principale`,
      ],
      estimatedImpact: `Surpasser ${topCompetitor} dans les réponses IA en 2–4 mois`,
      difficulty: 'moyen',
      timeToResult: '6–10 semaines',
      category: 'cette-semaine',
    })
  }

  // Directories
  recs.push({
    priority: 'important',
    icon: '🟡',
    priorityLabel: 'Important',
    title: 'Inscrivez-vous sur 3 annuaires sectoriels pertinents cette semaine',
    description: `Les annuaires sont des sources d'autorité que les LLMs utilisent pour valider l'existence d'une entreprise. Chaque inscription crée une nouvelle mention de ${brandName} sur le web, augmentant votre score de crédibilité pour les IA.`,
    actions: [
      'Identifiez les 3 annuaires les mieux référencés dans votre secteur (cherchez "annuaire [votre secteur]")',
      `Créez une fiche complète avec le même nom "${brandName}", la même adresse et le même numéro de téléphone sur chaque annuaire (NAP consistency)`,
      'Ajoutez votre URL et une description de 150+ mots',
      'Ciblez en priorité : Trustpilot, Capterra (si SaaS), PagesJaunes, ou les annuaires spécialisés de votre industrie',
    ],
    estimatedImpact: '+5 à +12 points de crédibilité globale',
    difficulty: 'facile',
    timeToResult: '4–8 semaines',
    category: 'cette-semaine',
  })

  // Negative sentiment handling
  if (negative.length > 0) {
    const llmNames = negative.map(r => LLM_NAMES[r.llm] ?? r.llm).join(', ')
    recs.push({
      priority: 'critical',
      icon: '🔴',
      priorityLabel: 'Critique',
      title: `Gérez les avis négatifs qui polluent votre image sur ${llmNames}`,
      description: `Les LLMs ont détecté un sentiment négatif autour de ${brandName} sur ${llmNames}. Les IA reflètent le sentiment dominant de leurs sources — des avis négatifs non gérés dégradent activement votre score. Répondre publiquement et professionnellement rééquilibre la perception.`,
      actions: [
        'Cherchez sur Google "' + brandName + ' avis" + "' + brandName + ' arnaque" pour identifier les sources négatives',
        'Répondez à chaque avis négatif sous 48h : reconnaissez le problème, proposez une solution concrète, en restant professionnel',
        'Contactez en privé les clients insatisfaits pour résoudre le problème — un avis négatif modifié vaut 10 nouveaux avis positifs',
        'Lancez une campagne proactive de collecte d\'avis : envoyez un email à vos 20 meilleurs clients cette semaine',
      ],
      estimatedImpact: 'Correction du sentiment en 4–8 semaines, +15 à +30 points',
      difficulty: 'moyen',
      timeToResult: '4–8 semaines',
      category: 'cette-semaine',
    })
  }

  // ── CE MOIS ───────────────────────────────────────────────────────────────────

  recs.push({
    priority: 'important',
    icon: '🟡',
    priorityLabel: 'Important',
    title: 'Publiez 3 articles invités sur des blogs d\'autorité de votre secteur',
    description: `Les IA pondèrent fortement les mentions sur des sites tiers d'autorité. Un article signé par ${brandName} sur un site reconnu de votre secteur crée une citation de haute valeur qui influence directement les LLMs.`,
    actions: [
      'Identifiez 10 blogs sectoriels avec un bon trafic (utilisez Ahrefs/Semrush free ou cherchez "write for us [secteur]")',
      `Proposez 3 sujets d'articles experts où vous positionnez ${brandName} comme référence`,
      'Rédigez des articles de 1000+ mots avec des données originales ou des études de cas',
      'Assurez-vous que votre byline inclut le nom ' + brandName + ' et un lien vers votre site',
    ],
    estimatedImpact: '+15 à +25 points sur 3–6 mois',
    difficulty: 'avancé',
    timeToResult: '8–14 semaines',
    category: 'ce-mois',
  })

  recs.push({
    priority: 'important',
    icon: '🟡',
    priorityLabel: 'Important',
    title: `Lancez une campagne d'avis clients — objectif : 10 nouveaux avis positifs`,
    description: `Les avis clients sont du contenu généré par des tiers qui mentionne ${brandName} positivement. C'est exactement ce que les IA recherchent pour valider la qualité d'une marque. 10 nouveaux avis en un mois peuvent faire basculer votre sentiment de neutre à positif.`,
    actions: [
      'Listez vos 30 clients les plus satisfaits des 6 derniers mois',
      'Envoyez un email personnalisé (pas automatique) avec un lien direct vers Google/Trustpilot',
      'Proposez un rappel téléphonique à ceux qui n\'ont pas répondu — le taux de conversion est 3× supérieur',
      'Mettez en place un process systématique : demandez un avis à chaque client 7 jours après livraison',
    ],
    estimatedImpact: '+10 à +20 points de sentiment, effet durable',
    difficulty: 'moyen',
    timeToResult: '3–6 semaines',
    category: 'ce-mois',
  })

  recs.push({
    priority: 'optimization',
    icon: '🟢',
    priorityLabel: 'Optimisation',
    title: `Créez un communiqué de presse sur une actualité de ${brandName}`,
    description: `Perplexity et ChatGPT indexent les actualités récentes pour enrichir leurs réponses. Un communiqué diffusé sur des wire services (PR Newswire, BusinessWire, ou des sites sectoriels) crée des dizaines de mentions simultanées de ${brandName} en quelques jours.`,
    actions: [
      'Identifiez une actualité réelle : nouveau produit, partenariat, résultat client, recrutement clé',
      'Rédigez un communiqué de presse structuré : titre accrocheur, 3 paragraphes, quote dirigeant',
      'Diffusez sur : Business Wire FR, PR.fr, ou contactez directement 5 journalistes de votre secteur',
      'Publiez aussi en tant qu\'article de blog et partagez sur tous vos réseaux',
    ],
    estimatedImpact: 'Pic de visibilité immédiat + effet durable sur Perplexity',
    difficulty: 'moyen',
    timeToResult: '2–4 semaines après publication',
    category: 'ce-mois',
  })

  recs.push({
    priority: 'optimization',
    icon: '🟢',
    priorityLabel: 'Optimisation',
    title: 'Développez une page de témoignages clients avec des résultats chiffrés',
    description: `Les IA citent les marques qui ont des preuves sociales quantifiées. "Nos clients augmentent leur CA de 30%" est infiniment plus cité qu'une liste de logos. Une page de cas clients avec des chiffres réels positionne ${brandName} comme une référence crédible.`,
    actions: [
      'Interviewez 5 clients pour obtenir des résultats mesurables (% d\'économie, temps gagné, CA généré)',
      'Créez une page /temoignages avec titre, résultat chiffré, citation courte et photo client',
      'Ajoutez le balisage Schema.org Review pour chaque témoignage',
      'Intégrez les meilleures citations directement sur votre page d\'accueil',
    ],
    estimatedImpact: '+8 à +15 points de crédibilité globale',
    difficulty: 'moyen',
    timeToResult: '6–10 semaines',
    category: 'ce-mois',
  })

  // Competitor-specific advice
  if (allCompetitors.length >= 2) {
    recs.push({
      priority: 'optimization',
      icon: '🟢',
      priorityLabel: 'Optimisation',
      title: `Analysez le contenu de ${allCompetitors.slice(0, 3).join(', ')} pour identifier vos angles manquants`,
      description: `${allCompetitors.slice(0, 3).join(', ')} vous précèdent dans les réponses IA sur cette requête. Analysez leur contenu web pour comprendre pourquoi les IA les préfèrent, puis surpassez leur contenu sur ces aspects spécifiques.`,
      actions: [
        `Auditez les pages /blog et /ressources de ${allCompetitors[0]} pour identifier les sujets sur lesquels ils publient`,
        `Créez du contenu sur les mêmes sujets mais avec plus de profondeur, de données originales et en mentionnant ${brandName}`,
        `Cherchez des sujets que vos concurrents n'ont PAS traités — c'est votre opportunité de dominer ces requêtes`,
        'Utilisez un outil comme AnswerThePublic pour trouver les questions non répondues de votre secteur',
      ],
      estimatedImpact: 'Positionnement différenciant sur 2–4 mois',
      difficulty: 'avancé',
      timeToResult: '8–16 semaines',
      category: 'ce-mois',
    })
  }

  // Consolidation if fully visible
  if (mentionedResults.length === results.length && notMentioned.length === 0 && negative.length === 0) {
    recs.push({
      priority: 'optimization',
      icon: '🟢',
      priorityLabel: 'Optimisation',
      title: `${brandName} est bien référencé — consolidez votre avance`,
      description: `Excellente visibilité sur tous les LLMs ! Pour maintenir et étendre cette position, il faut continuer à alimenter les IA avec du contenu frais et surveiller l'émergence de nouveaux concurrents.`,
      actions: [
        'Rescannez chaque semaine sur de nouvelles requêtes longue traîne pour découvrir des opportunités',
        'Publiez du contenu frais chaque mois — les IA valorisent la régularité',
        'Surveillez les mentions de vos concurrents pour détecter leur montée en puissance',
        'Testez de nouveaux formats : vidéos, podcasts, webinaires pour diversifier vos citations',
      ],
      estimatedImpact: 'Maintien du leadership IA sur la durée',
      difficulty: 'moyen',
      timeToResult: 'Effet continu',
      category: 'ce-mois',
    })
  }

  // Sort: critical first, then important, then optimization; within same priority, by category order
  const categoryOrder = { 'quick-win': 0, 'cette-semaine': 1, 'ce-mois': 2 }
  const priorityOrder = { critical: 0, important: 1, optimization: 2 }
  recs.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return categoryOrder[a.category] - categoryOrder[b.category]
  })

  return recs
}
