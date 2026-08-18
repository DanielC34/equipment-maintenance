import { getServerSession } from 'next-auth'
import type { NextAuthOptions, Session } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import type { DefaultUser } from 'next-auth'
import type { Role } from '@prisma/client'
import prisma from '@/lib/prisma'
import { loginSchema } from '@/lib/validations'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
    }
  }
  interface User extends DefaultUser {
    role?: Role
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: Role
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
          })

          if (!user?.password) {
            return null
          }

          if (!user.active) {
            return null
          }

          const valid = await bcrypt.compare(parsed.data.password, user.password)
          if (!valid) {
            return null
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? ''
        session.user.role = token.role ?? 'OPERATOR'
      }
      return session
    },
  },
}

export { getServerSession }

export async function getCurrentSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}