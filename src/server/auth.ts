import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";

import { prisma } from "./db";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const providers: NextAuthOptions["providers"] = [
  Credentials({
    name: "Credenciales",
    credentials: {
      email: { label: "Correo", type: "email" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Debes ingresar correo y contraseña");
      }

      const email = credentials.email.toLowerCase().trim();
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user?.passwordHash) {
        throw new Error("Credenciales inválidas");
      }

      const valid = await compare(credentials.password, user.passwordHash);
      if (!valid) {
        throw new Error("Credenciales inválidas");
      }

      const adapterUser: AdapterUser & {
        firstName?: string | null;
        lastName?: string | null;
        whatsapp?: string | null;
      } = {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified ?? null,
        name: user.name ?? null,
        image: user.image ?? null,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        whatsapp: user.whatsapp ?? null,
      };
      return adapterUser;
    },
  }),
];

if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          firstName: profile.given_name ?? profile.name?.split(" ")[0] ?? null,
          lastName: profile.family_name ?? profile.name?.split(" ").slice(1).join(" ") ?? null,
          image: profile.picture ?? null,
        } as Record<string, unknown>;
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const extended = user as AdapterUser & {
          firstName?: string | null;
          lastName?: string | null;
          whatsapp?: string | null;
        };
        token.id = extended.id ?? token.id;
        token.firstName = extended.firstName ?? token.firstName ?? null;
        token.lastName = extended.lastName ?? token.lastName ?? null;
        token.whatsapp = extended.whatsapp ?? token.whatsapp ?? null;
      }

      if (!token.id) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: String(token.id) },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          whatsapp: true,
        },
      });

      if (dbUser) {
        token.firstName = dbUser.firstName ?? null;
        token.lastName = dbUser.lastName ?? null;
        token.whatsapp = dbUser.whatsapp ?? null;
        token.profileComplete = Boolean(
          (dbUser.firstName?.trim()?.length ?? 0) > 0 &&
            (dbUser.lastName?.trim()?.length ?? 0) > 0 &&
            (dbUser.whatsapp?.trim()?.length ?? 0) > 0,
        );
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = String(token.id);
        session.user.firstName = (token.firstName as string | null) ?? null;
        session.user.lastName = (token.lastName as string | null) ?? null;
        session.user.whatsapp = (token.whatsapp as string | null) ?? null;
        session.user.profileComplete = Boolean(token.profileComplete);
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

export function auth() {
  return getServerSession(authOptions);
}
