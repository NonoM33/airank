export const QUERY_TEMPLATES: Record<string, string[]> = {
  saas: [
    "Quel est le meilleur logiciel CRM pour PME ?",
    "Quels outils de gestion de projet recommandez-vous ?",
    "Quelle solution de facturation en ligne choisir ?",
    "Meilleurs outils de marketing automation",
    "Logiciels RH pour startups",
  ],
  ecommerce: [
    "Quelle plateforme e-commerce choisir pour démarrer ?",
    "Meilleurs outils pour gérer son inventaire en ligne",
    "Solutions de paiement en ligne recommandées",
    "Comment optimiser sa boutique en ligne ?",
  ],
  sante: [
    "Logiciels de gestion de cabinet médical recommandés",
    "Meilleures applications de téléconsultation",
    "Outils de gestion de patients pour cliniques",
  ],
  finance: [
    "Meilleurs logiciels de comptabilité pour TPE",
    "Outils de gestion de trésorerie recommandés",
    "Plateformes de facturation électronique",
  ],
  agences: [
    "Meilleures agences de référencement SEO en France",
    "Outils de reporting SEO pour agences",
    "Plateformes de gestion de campagnes publicitaires",
  ],
  consulting: [
    "Quels cabinets de conseil en stratégie recommandez-vous ?",
    "Meilleurs outils de gestion de projets consulting",
    "Plateformes de management consulting",
  ],
  retail: [
    "Meilleurs logiciels de caisse pour commerce",
    "Solutions de gestion des stocks pour boutiques",
    "Outils de fidélisation client pour retailers",
  ],
  education: [
    "Meilleures plateformes d'apprentissage en ligne",
    "Outils de création de cours en ligne",
    "Solutions de gestion scolaire recommandées",
  ],
}

export function getQueriesForSector(sector: string): string[] {
  return QUERY_TEMPLATES[sector] ?? []
}

export function getAllSectors(): string[] {
  return Object.keys(QUERY_TEMPLATES)
}
