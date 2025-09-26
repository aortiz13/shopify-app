// src/server/db.ts
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();

// Helpers
export async function saveShopSession(params: {
  shop: string;
  accessToken: string;
  scope: string;
  isOnline?: boolean;
  adminHost?: string | null;
}) {
  const { shop, accessToken, scope, isOnline = false, adminHost } = params;
  return prisma.shopSession.upsert({
    where: { shop },
    create: { shop, accessToken, scope, isOnline, adminHost: adminHost ?? undefined },
    update: {
      accessToken,
      scope,
      isOnline,
      ...(adminHost ? { adminHost } : {}),
    },
  });
}

export async function getShopToken(shop: string) {
  const row = await prisma.shopSession.findUnique({ where: { shop } });
  return row?.accessToken ?? null;
}

export async function getShopByAdminHost(adminHost: string) {
  const row = await prisma.shopSession.findFirst({ where: { adminHost } });
  return row?.shop ?? null;
}

export async function rememberAdminHost(params: { shop: string; adminHost: string }) {
  const { shop, adminHost } = params;
  try {
    await prisma.shopSession.update({
      where: { shop },
      data: { adminHost },
    });
  } catch (error) {
    console.warn("No se pudo guardar adminHost para la tienda", { shop, adminHost, error });
  }
}

export function adminGraphqlEndpoint(shop: string) {
  return `https://${shop}/admin/api/2025-01/graphql.json`;
}
