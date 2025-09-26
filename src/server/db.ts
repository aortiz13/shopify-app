// src/server/db.ts
import fs from "node:fs";
import os from "node:os";
import { basename, dirname, resolve } from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

function ensureWritableSqliteDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("file:")) {
    return;
  }

  const rawPath = url.replace(/^file:/, "");
  if (!rawPath || rawPath === ":memory:") {
    return;
  }

  const absolutePath = rawPath.startsWith("/") ? rawPath : resolve(process.cwd(), rawPath);

  try {
    const dir = dirname(absolutePath);
    fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(absolutePath)) {
      fs.writeFileSync(absolutePath, "");
    }

    fs.accessSync(dir, fs.constants.W_OK);
    fs.accessSync(absolutePath, fs.constants.W_OK);
    return;
  } catch (error) {
    console.warn("SQLite database is not writable, preparing a tmp copy.", error);
  }

  try {
    const tmpDir = resolve(os.tmpdir(), "shopify-app-db");
    fs.mkdirSync(tmpDir, { recursive: true });
    const fallbackPath = resolve(tmpDir, basename(absolutePath));

    if (fs.existsSync(absolutePath)) {
      try {
        fs.copyFileSync(absolutePath, fallbackPath);
      } catch (copyError) {
        console.warn("Could not copy SQLite database, creating a blank file instead.", copyError);
        fs.writeFileSync(fallbackPath, "");
      }
    } else {
      fs.writeFileSync(fallbackPath, "");
    }

    fs.chmodSync(fallbackPath, 0o600);
    process.env.DATABASE_URL = `file:${fallbackPath}`;
    console.info(`Using writable SQLite database at ${fallbackPath}`);
  } catch (fallbackError) {
    console.error("Failed to prepare a writable SQLite database", fallbackError);
  }
}

ensureWritableSqliteDatabase();

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
  const updateData: Prisma.ShopSessionUpdateInput = {
    accessToken,
    scope,
    isOnline,
  };

  if (adminHost !== undefined) {
    updateData.adminHost = adminHost;
  }

  return prisma.shopSession.upsert({
    where: { shop },
    create: { shop, accessToken, scope, isOnline, adminHost: adminHost ?? undefined },
    update: updateData,
  });
}

export async function getShopToken(shop: string) {
  const row = await prisma.shopSession.findUnique({ where: { shop } });
  return row?.accessToken ?? null;
}

export async function getShopByAdminHost(adminHost: string) {
  const row = await prisma.shopSession.findFirst({
    where: { adminHost } as Prisma.ShopSessionWhereInput,
  });
  return row?.shop ?? null;
}

export async function rememberAdminHost(params: { shop: string; adminHost: string }) {
  const { shop, adminHost } = params;
  try {
    const data: Prisma.ShopSessionUpdateInput = {};
    data.adminHost = adminHost;

    await prisma.shopSession.update({
      where: { shop },
      data,
    });
  } catch (error) {
    console.warn("No se pudo guardar adminHost para la tienda", { shop, adminHost, error });
  }
}

export function adminGraphqlEndpoint(shop: string) {
  return `https://${shop}/admin/api/2025-01/graphql.json`;
}
