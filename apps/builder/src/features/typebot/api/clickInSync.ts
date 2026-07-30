import { env } from "@typebot.io/env";
import prisma from "@typebot.io/prisma";

export type ClickInChannel = { id: string; name: string };

export type ClickInSyncResult =
  | { status: "skipped" }
  | { status: "already_linked" }
  | { status: "linked"; channelId: string }
  | { status: "no_channels" }
  | { status: "multiple_channels"; channels: ClickInChannel[] };

async function fetchClickInChannels(apiKey: string): Promise<ClickInChannel[]> {
  const res = await fetch(
    `${env.CLICKIN_API_URL}/modules/conversations/channels`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  if (!res.ok) throw new Error(`ClickIn channels fetch failed: ${res.status}`);
  return res.json() as Promise<ClickInChannel[]>;
}

async function patchClickInChannel(
  apiKey: string,
  channelId: string,
  typebotPublicId: string,
): Promise<void> {
  const res = await fetch(
    `${env.CLICKIN_API_URL}/modules/conversations/channels/${channelId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ typebotPublicId }),
    },
  );
  if (!res.ok) throw new Error(`ClickIn channel PATCH failed: ${res.status}`);
}

export async function saveClickInChannelId(
  typebotId: string,
  channelId: string,
): Promise<void> {
  await prisma.typebot.updateMany({
    where: { id: typebotId },
    data: { clickInChannelId: channelId },
  });
}

export async function syncClickInOnPublish({
  typebotId,
  typebotPublicId,
  existingClickInChannelId,
  workspaceClickInApiKey,
}: {
  typebotId: string;
  typebotPublicId: string;
  existingClickInChannelId: string | null;
  workspaceClickInApiKey: string | null;
}): Promise<ClickInSyncResult> {
  if (!env.CLICKIN_API_URL || !workspaceClickInApiKey)
    return { status: "skipped" };

  if (existingClickInChannelId) return { status: "already_linked" };

  const channels = await fetchClickInChannels(workspaceClickInApiKey);

  if (channels.length === 0) return { status: "no_channels" };

  if (channels.length > 1) return { status: "multiple_channels", channels };

  const channel = channels[0];
  await patchClickInChannel(
    workspaceClickInApiKey,
    channel.id,
    typebotPublicId,
  );
  await saveClickInChannelId(typebotId, channel.id);

  return { status: "linked", channelId: channel.id };
}

export async function linkClickInChannels({
  typebotId,
  typebotPublicId,
  workspaceClickInApiKey,
  channelId,
  allChannels,
}: {
  typebotId: string;
  typebotPublicId: string;
  workspaceClickInApiKey: string;
  channelId?: string;
  allChannels?: boolean;
}): Promise<void> {
  if (allChannels) {
    const channels = await fetchClickInChannels(workspaceClickInApiKey);
    await Promise.all(
      channels.map((ch) =>
        patchClickInChannel(workspaceClickInApiKey, ch.id, typebotPublicId),
      ),
    );
    if (channels.length > 0) {
      await saveClickInChannelId(typebotId, channels[0].id);
    }
    return;
  }

  if (!channelId) return;
  await patchClickInChannel(workspaceClickInApiKey, channelId, typebotPublicId);
  await saveClickInChannelId(typebotId, channelId);
}
