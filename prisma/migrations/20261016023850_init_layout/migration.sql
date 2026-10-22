-- CreateEnum
CREATE TYPE "LayoutStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "LayoutVersion" (
    "id" SERIAL NOT NULL,
    "tab" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "LayoutStatus" NOT NULL DEFAULT 'draft',
    "data" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "LayoutVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LayoutVersion_tab_status_idx" ON "LayoutVersion"("tab", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LayoutVersion_tab_version_key" ON "LayoutVersion"("tab", "version");
