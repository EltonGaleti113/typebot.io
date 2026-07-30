import { ORPCError } from "@orpc/server";
import { env } from "@typebot.io/env";
import prisma from "@typebot.io/prisma";
import type { User } from "@typebot.io/user/schemas";
import { z } from "zod";
import { isWriteTypebotForbidden } from "../helpers/isWriteTypebotForbidden";
import { linkClickInChannels } from "./clickInSync";

export const linkTypebotToClickInChannelInputSchema = z.object({
  typebotId: z.string(),
  channelId: z.string().optional(),
  allChannels: z.boolean().optional(),
});

export const handleLinkTypebotToClickInChannel = async ({
  input: { typebotId, channelId, allChannels },
  context: { user },
}: {
  input: z.infer<typeof linkTypebotToClickInChannelInputSchema>;
  context: { user: Pick<User, "id"> };
}) => {
  if (!env.CLICKIN_API_URL)
    throw new ORPCError("BAD_REQUEST", {
      message: "ClickIn integration is not configured on this server",
    });

  const typebot = await prisma.typebot.findFirst({
    where: { id: typebotId },
    include: {
      collaborators: true,
      workspace: {
        select: {
          plan: true,
          isVerified: true,
          isSuspended: true,
          isPastDue: true,
          clickInApiKey: true,
          members: { select: { userId: true, role: true } },
        },
      },
    },
  });

  if (!typebot?.id || (await isWriteTypebotForbidden(typebot, user)))
    throw new ORPCError("NOT_FOUND", { message: "Typebot not found" });

  if (!typebot.workspace.clickInApiKey)
    throw new ORPCError("BAD_REQUEST", {
      message:
        "No ClickIn API key configured for this workspace. Set clickInApiKey on the workspace first.",
    });

  if (!typebot.publicId)
    throw new ORPCError("BAD_REQUEST", {
      message: "This typebot has no publicId. Publish it first.",
    });

  if (!channelId && !allChannels)
    throw new ORPCError("BAD_REQUEST", {
      message: "Provide either channelId or allChannels: true",
    });

  await linkClickInChannels({
    typebotId,
    typebotPublicId: typebot.publicId,
    workspaceClickInApiKey: typebot.workspace.clickInApiKey,
    channelId,
    allChannels,
  });

  return { message: "success" as const };
};
