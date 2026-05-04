-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN "guestName" TEXT;
ALTER TABLE "Attempt" ALTER COLUMN "userId" DROP NOT NULL;

-- RecreateForeignKey
ALTER TABLE "Attempt" DROP CONSTRAINT "Attempt_userId_fkey";
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
