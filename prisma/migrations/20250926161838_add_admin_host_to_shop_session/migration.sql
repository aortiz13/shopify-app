/*
  Warnings:

  - A unique constraint covering the columns `[adminHost]` on the table `ShopSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ShopSession" ADD COLUMN "adminHost" TEXT;

-- CreateTable
CREATE TABLE "tryOnSelection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "productsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopSession_adminHost_key" ON "ShopSession"("adminHost");
