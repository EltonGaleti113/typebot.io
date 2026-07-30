-- AlterTable: add ClickIn API key to Workspace (one per Typebot workspace, identifies the ClickIn workspace)
ALTER TABLE "Workspace" ADD COLUMN "clickInApiKey" TEXT;

-- AlterTable: add ClickIn channel ID to Typebot (the linked ClickIn channel for this bot)
ALTER TABLE "Typebot" ADD COLUMN "clickInChannelId" TEXT;
