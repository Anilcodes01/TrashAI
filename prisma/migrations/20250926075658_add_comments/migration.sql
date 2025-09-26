-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "taskId" TEXT,
    "subTaskId" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "public"."Comment"("authorId");

-- CreateIndex
CREATE INDEX "Comment_taskId_idx" ON "public"."Comment"("taskId");

-- CreateIndex
CREATE INDEX "Comment_subTaskId_idx" ON "public"."Comment"("subTaskId");

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_subTaskId_fkey" FOREIGN KEY ("subTaskId") REFERENCES "public"."SubTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
