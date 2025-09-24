-- CreateEnum
CREATE TYPE "public"."CollaborationStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- AlterTable
ALTER TABLE "public"."TodoListCollaborator" ADD COLUMN     "status" "public"."CollaborationStatus" NOT NULL DEFAULT 'PENDING';
