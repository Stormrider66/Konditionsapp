-- CreateTable
CREATE TABLE "AICanvas" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'COACH',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AICanvas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICanvasBlock" (
    "id" TEXT NOT NULL,
    "canvasId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "contentJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AICanvasBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AICanvas_businessId_idx" ON "AICanvas"("businessId");

-- CreateIndex
CREATE INDEX "AICanvas_ownerUserId_idx" ON "AICanvas"("ownerUserId");

-- CreateIndex
CREATE INDEX "AICanvas_status_idx" ON "AICanvas"("status");

-- CreateIndex
CREATE INDEX "AICanvas_updatedAt_idx" ON "AICanvas"("updatedAt");

-- CreateIndex
CREATE INDEX "AICanvasBlock_canvasId_idx" ON "AICanvasBlock"("canvasId");

-- CreateIndex
CREATE INDEX "AICanvasBlock_canvasId_position_idx" ON "AICanvasBlock"("canvasId", "position");

-- CreateIndex
CREATE INDEX "AICanvasBlock_type_idx" ON "AICanvasBlock"("type");

-- AddForeignKey
ALTER TABLE "AICanvas" ADD CONSTRAINT "AICanvas_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AICanvas" ADD CONSTRAINT "AICanvas_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AICanvasBlock" ADD CONSTRAINT "AICanvasBlock_canvasId_fkey" FOREIGN KEY ("canvasId") REFERENCES "AICanvas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
