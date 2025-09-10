// src/server/db.ts
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();

// Helpers
export async function saveShopSession(params: {
  shop: string; accessToken: string; scope: string; isOnline?: boolean;
}) {
  const { shop, accessToken, scope, isOnline = false } = params;
  return prisma.shopSession.upsert({
    where: { shop },
    create: { shop, accessToken, scope, isOnline },
    update: { accessToken, scope, isOnline },
  });
}

export async function getShopToken(shop: string) {
  const row = await prisma.shopSession.findUnique({ where: { shop } });
  return row?.accessToken ?? null;
}

export function adminGraphqlEndpoint(shop: string) {
  return `https://${shop}/admin/api/2025-01/graphql.json`;
}
