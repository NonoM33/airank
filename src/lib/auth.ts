import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './db'
import { z } from 'zod'
import { verifyAndMigratePassword } from './password'

export { hashPassword, verifyAndMigratePassword, isBcryptHash } from './password'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.password) return null

        const ok = await verifyAndMigratePassword(user.id, user.password, password)
        if (!ok) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        const dbUser = await prisma.user.findUnique({ where: { id: user.id as string } })
        token.plan = dbUser?.plan ?? 'FREE'
        token.language = dbUser?.language ?? 'fr'
        token.planFetchedAt = Date.now()
      }
      if (token.id && (!token.planFetchedAt || Date.now() - (token.planFetchedAt as number) > 5 * 60 * 1000 || trigger === 'update')) {
        try {
          const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } })
          token.plan = dbUser?.plan ?? 'FREE'
          token.language = dbUser?.language ?? 'fr'
          token.planFetchedAt = Date.now()
        } catch {
          // DB error — keep existing plan, don't logout
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.plan = token.plan as string
        ;(session.user as { language?: string }).language = (token.language as string) ?? 'fr'
      }
      return session
    },
  },
})
