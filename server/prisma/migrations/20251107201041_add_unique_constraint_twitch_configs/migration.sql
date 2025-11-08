/*
  Warnings:

  - A unique constraint covering the columns `[userId,clientId]` on the table `twitch_configs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "twitch_configs_userId_clientId_key" ON "twitch_configs"("userId", "clientId");
