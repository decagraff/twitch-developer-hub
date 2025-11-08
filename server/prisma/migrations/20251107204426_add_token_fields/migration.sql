/*
  Warnings:

  - Added the required column `twitchConfigId` to the `saved_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "saved_tokens" ADD COLUMN     "channelLogin" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "twitchConfigId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "saved_tokens" ADD CONSTRAINT "saved_tokens_twitchConfigId_fkey" FOREIGN KEY ("twitchConfigId") REFERENCES "twitch_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
