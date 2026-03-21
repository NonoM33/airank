import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'AIRank — Votre visibilité dans les LLMs',
    template: '%s | AIRank',
  },
  description:
    'Analysez la visibilité de votre marque dans ChatGPT, Claude, Perplexity et Gemini. Découvrez si l\'IA vous recommande.',
  keywords: ['visibilité IA', 'ChatGPT', 'référencement IA', 'LLM visibility', 'AIRank'],
  openGraph: {
    title: 'AIRank — Votre visibilité dans les LLMs',
    description: 'Votre entreprise est-elle visible pour l\'IA ?',
    url: 'https://airank.fr',
    siteName: 'AIRank',
    locale: 'fr_FR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  )
}
