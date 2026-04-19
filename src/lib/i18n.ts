// Minimal i18n foundation. Swap with next-intl or react-intl later if needed.
// Usage: const t = useT(); t('dashboard.title')

import { useSession } from 'next-auth/react'

type Locale = 'fr' | 'en' | 'es' | 'de'

const SUPPORTED_LOCALES: Locale[] = ['fr', 'en', 'es', 'de']

type Dict = Record<string, string>

const fr: Dict = {
  'nav.dashboard': 'Dashboard',
  'nav.brands': 'Mes Marques',
  'nav.scans': 'Scans',
  'nav.heatmap': 'Heatmap',
  'nav.compare': 'Comparer',
  'nav.citations': 'Citations',
  'nav.analytics': 'Analytics',
  'nav.alerts': 'Alertes',
  'nav.veille': 'Veille',
  'nav.growth': 'Croissance',
  'nav.team': 'Équipe',
  'nav.whiteLabel': 'White-label',
  'nav.apiKeys': 'Clés API',
  'nav.apiDocs': 'API Docs',
  'nav.billing': 'Abonnement',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.delete': 'Supprimer',
  'common.create': 'Créer',
  'common.loading': 'Chargement…',
  'common.empty': 'Aucun résultat',
  'common.upgrade': 'Mettre à niveau',
  'common.credits': 'Crédits',
  'common.logout': 'Déconnexion',
  'dashboard.title': 'Tableau de bord',
  'citations.title': 'Citations & sources',
  'citations.subtitle': 'Quelles sources les IA citent-elles en parlant de votre marque ?',
  'team.title': 'Équipe',
  'team.invite': 'Inviter',
  'whiteLabel.title': 'White-label',
  'apiKeys.title': 'Clés API',
  'notifications.title': 'Notifications',
  'notifications.empty': 'Aucune notification',
  'notifications.markAllRead': 'Tout marquer lu',
}

const en: Dict = {
  'nav.dashboard': 'Dashboard',
  'nav.brands': 'My Brands',
  'nav.scans': 'Scans',
  'nav.heatmap': 'Heatmap',
  'nav.compare': 'Compare',
  'nav.citations': 'Citations',
  'nav.analytics': 'Analytics',
  'nav.alerts': 'Alerts',
  'nav.veille': 'Watch',
  'nav.growth': 'Growth',
  'nav.team': 'Team',
  'nav.whiteLabel': 'White-label',
  'nav.apiKeys': 'API Keys',
  'nav.apiDocs': 'API Docs',
  'nav.billing': 'Billing',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.create': 'Create',
  'common.loading': 'Loading…',
  'common.empty': 'No results',
  'common.upgrade': 'Upgrade',
  'common.credits': 'Credits',
  'common.logout': 'Log out',
  'dashboard.title': 'Dashboard',
  'citations.title': 'Citations & sources',
  'citations.subtitle': 'Which sources do AIs cite when talking about your brand?',
  'team.title': 'Team',
  'team.invite': 'Invite',
  'whiteLabel.title': 'White-label',
  'apiKeys.title': 'API Keys',
  'notifications.title': 'Notifications',
  'notifications.empty': 'No notifications',
  'notifications.markAllRead': 'Mark all read',
}

const es: Dict = {
  'nav.dashboard': 'Panel',
  'nav.brands': 'Mis Marcas',
  'nav.scans': 'Escaneos',
  'nav.heatmap': 'Mapa de calor',
  'nav.compare': 'Comparar',
  'nav.citations': 'Citas',
  'nav.analytics': 'Analíticas',
  'nav.alerts': 'Alertas',
  'nav.veille': 'Vigilancia',
  'nav.growth': 'Crecimiento',
  'nav.team': 'Equipo',
  'nav.whiteLabel': 'Marca blanca',
  'nav.apiKeys': 'Claves API',
  'nav.apiDocs': 'API Docs',
  'nav.billing': 'Facturación',
  'common.save': 'Guardar',
  'common.loading': 'Cargando…',
  'common.empty': 'Sin resultados',
  'common.upgrade': 'Mejorar',
  'common.logout': 'Cerrar sesión',
  'dashboard.title': 'Panel',
  'notifications.title': 'Notificaciones',
  'notifications.empty': 'Sin notificaciones',
}

const de: Dict = {
  'nav.dashboard': 'Dashboard',
  'nav.brands': 'Meine Marken',
  'nav.scans': 'Scans',
  'nav.team': 'Team',
  'common.save': 'Speichern',
  'common.loading': 'Lade…',
  'common.empty': 'Keine Ergebnisse',
  'common.upgrade': 'Upgraden',
  'common.logout': 'Abmelden',
  'notifications.title': 'Benachrichtigungen',
  'notifications.empty': 'Keine Benachrichtigungen',
}

const DICTS: Record<Locale, Dict> = { fr, en, es, de }

export function translate(locale: string | undefined | null, key: string): string {
  const loc: Locale = (SUPPORTED_LOCALES as string[]).includes(locale ?? '')
    ? (locale as Locale)
    : 'fr'
  return DICTS[loc][key] ?? DICTS.fr[key] ?? key
}

export function useT() {
  const { data: session } = useSession()
  const locale = (session?.user as { language?: string } | undefined)?.language ?? 'fr'
  return (key: string) => translate(locale, key)
}

export function getSupportedLocales(): Locale[] {
  return [...SUPPORTED_LOCALES]
}
