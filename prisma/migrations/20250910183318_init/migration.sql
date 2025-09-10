-- CreateTable
CREATE TABLE "ShopSession" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "accessToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TryOnLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "externalId" TEXT,
    "variantId" TEXT,
    "customerId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "TryOnLog_shop_productId_idx" ON "TryOnLog"("shop", "productId");
