-- Step 1: Add the new ownerId column, but make it NULLABLE for now.
ALTER TABLE "TodoList" ADD COLUMN "ownerId" TEXT;

-- Step 2: Copy all the user IDs from the old column to the new one.
UPDATE "TodoList" SET "ownerId" = "userId";

-- Step 3: Now that all rows have an ownerId, make the column NOT NULL.
ALTER TABLE "TodoList" ALTER COLUMN "ownerId" SET NOT NULL;

-- Step 4: Drop the old foreign key and index associated with userId.
ALTER TABLE "TodoList" DROP CONSTRAINT "TodoList_userId_fkey";
DROP INDEX "TodoList_userId_idx";

-- Step 5: Drop the old userId column as it's no longer needed.
ALTER TABLE "TodoList" DROP COLUMN "userId";

-- Step 6: Create the new table for collaborators.
CREATE TABLE "TodoListCollaborator" (
    "id" TEXT NOT NULL,
    "todoListId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoListCollaborator_pkey" PRIMARY KEY ("id")
);

-- Step 7: Create the new index and foreign key for the new ownerId column.
CREATE INDEX "TodoList_ownerId_idx" ON "TodoList"("ownerId");
ALTER TABLE "TodoList" ADD CONSTRAINT "TodoList_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Add foreign keys for the new collaborator table.
ALTER TABLE "TodoListCollaborator" ADD CONSTRAINT "TodoListCollaborator_todoListId_fkey" FOREIGN KEY ("todoListId") REFERENCES "TodoList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TodoListCollaborator" ADD CONSTRAINT "TodoListCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Add the unique constraint to the collaborator table.
CREATE UNIQUE INDEX "TodoListCollaborator_todoListId_userId_key" ON "TodoListCollaborator"("todoListId", "userId");