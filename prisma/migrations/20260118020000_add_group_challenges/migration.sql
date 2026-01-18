-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('PENDING', 'SCHEDULED', 'ACTIVE', 'SUCCEEDED', 'FAILED');

-- AlterTable: Add rank to Group
ALTER TABLE "Group" ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 1;

-- CreateTable: GroupChallenge
CREATE TABLE "GroupChallenge" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "threshold" INTEGER NOT NULL DEFAULT 90,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ChallengeApproval
CREATE TABLE "ChallengeApproval" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupChallenge_groupId_weekKey_key" ON "GroupChallenge"("groupId", "weekKey");

-- CreateIndex
CREATE INDEX "GroupChallenge_groupId_status_idx" ON "GroupChallenge"("groupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeApproval_challengeId_userId_key" ON "ChallengeApproval"("challengeId", "userId");

-- AddForeignKey
ALTER TABLE "GroupChallenge" ADD CONSTRAINT "GroupChallenge_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeApproval" ADD CONSTRAINT "ChallengeApproval_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "GroupChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
