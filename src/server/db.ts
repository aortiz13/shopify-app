// src/server/db.ts
import fs from "node:fs";
import os from "node:os";
import { basename, dirname, resolve } from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

const FALLBACK_DIR = resolve(os.homedir(), ".shopify-app", "db");

function ensureWritableSqliteDatabase() {
  let url = process.env.DATABASE_URL?.trim();

  if (!url) {
    const defaultPath = resolve(process.cwd(), "prisma/dev.db");
    url = `file:${defaultPath}`;
    process.env.DATABASE_URL = url;
  }

  if (!url?.startsWith("file:")) {
    return;
  }

  const rawPath = url.replace(/^file:/, "");
  if (!rawPath || rawPath === ":memory:") {
    return;
  }

  const absolutePath = rawPath.startsWith("/")
    ? rawPath
    : resolve(process.cwd(), rawPath);

  if (ensurePathWritable(absolutePath)) {
    return;
  }

  const fallbackPath = resolve(
    FALLBACK_DIR,
    basename(absolutePath) || "dev.db",
  );
  if (!ensureFallbackWritable({ absolutePath, fallbackPath })) {
    return;
  }

  process.env.DATABASE_URL = `file:${fallbackPath}`;
  console.info(`Using writable SQLite database at ${fallbackPath}`);
}

function ensurePathWritable(targetPath: string): boolean {
  try {
    const dir = dirname(targetPath);
    fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(targetPath)) {
      fs.writeFileSync(targetPath, "");
    }

    try {
      fs.chmodSync(targetPath, 0o600);
    } catch (chmodError) {
      console.warn("Could not update SQLite file permissions", chmodError);
    }

    fs.accessSync(dir, fs.constants.W_OK);
    fs.accessSync(targetPath, fs.constants.W_OK);

    const handle = fs.openSync(targetPath, fs.constants.O_RDWR);
    fs.closeSync(handle);
    return true;
  } catch (error) {
    console.warn("SQLite database is not writable", { targetPath, error });
    return false;
  }
}

function ensureFallbackWritable(params: {
  absolutePath: string;
  fallbackPath: string;
}): boolean {
  const { absolutePath, fallbackPath } = params;

  try {
    fs.mkdirSync(dirname(fallbackPath), { recursive: true });

    const fallbackExists = fs.existsSync(fallbackPath);

    if (!fallbackExists) {
      if (fs.existsSync(absolutePath)) {
        try {
          fs.copyFileSync(absolutePath, fallbackPath);
        } catch (copyError) {
          console.warn(
            "Could not copy SQLite database, creating a blank file instead.",
            copyError,
          );
          fs.writeFileSync(fallbackPath, "");
        }
      } else {
        fs.writeFileSync(fallbackPath, "");
      }
    }

    try {
      fs.chmodSync(fallbackPath, 0o600);
    } catch (chmodError) {
      console.warn(
        "Could not update fallback SQLite file permissions",
        chmodError,
      );
    }

    fs.accessSync(dirname(fallbackPath), fs.constants.W_OK);
    fs.accessSync(fallbackPath, fs.constants.W_OK);

    const handle = fs.openSync(fallbackPath, fs.constants.O_RDWR);
    fs.closeSync(handle);
    return true;
  } catch (error) {
    console.error(
      "Failed to prepare a writable SQLite fallback database",
      error,
    );
    return false;
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
    ...(adminHost !== undefined
      ? { adminHost: { set: adminHost ?? null } }
      : {}),
  };

  const createData: Prisma.ShopSessionCreateInput = {
    shop,
    accessToken,
    scope,
    isOnline,
    ...(adminHost !== undefined ? { adminHost: adminHost ?? null } : {}),
  };

  return prisma.shopSession.upsert({
    where: { shop },
    create: createData,
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

export async function rememberAdminHost(params: {
  shop: string;
  adminHost: string;
}) {
  const { shop, adminHost } = params;
  try {
    await prisma.shopSession.update({
      where: { shop },
      data: {
        adminHost,
      },
    });
  } catch (error) {
    console.warn("No se pudo guardar adminHost para la tienda", {
      shop,
      adminHost,
      error,
    });
  }
}

export function adminGraphqlEndpoint(shop: string) {
  return `https://${shop}/admin/api/2025-01/graphql.json`;
}
