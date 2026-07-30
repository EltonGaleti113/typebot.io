import {
  authenticatedProcedure,
  publicProcedureWithOptionalUser,
} from "@typebot.io/config/orpc/builder/middlewares";
import {
  publicTypebotSchema,
  publicTypebotSchemaV5,
  publicTypebotSchemaV6,
} from "@typebot.io/typebot/schemas/publicTypebot";
import {
  typebotSchema,
  typebotV5Schema,
  typebotV6Schema,
} from "@typebot.io/typebot/schemas/typebot";
import { z } from "zod";
import {
  createTypebotInputSchema,
  handleCreateTypebot,
} from "./handleCreateTypebot";
import {
  deleteTypebotInputSchema,
  handleDeleteTypebot,
} from "./handleDeleteTypebot";
import {
  getPublishedTypebotInputSchema,
  handleGetPublishedTypebot,
} from "./handleGetPublishedTypebot";
import { getTypebotInputSchema, handleGetTypebot } from "./handleGetTypebot";
import {
  getTypebotBlocksInputSchema,
  handleGetTypebotBlocks,
} from "./handleGetTypebotBlocks";
import {
  handleImportTypebot,
  importTypebotInputSchema,
} from "./handleImportTypebot";
import {
  handleIsPublicIdAvailable,
  isPublicIdAvailableInputSchema,
} from "./handleIsPublicIdAvailable";
import {
  handleLinkTypebotToClickInChannel,
  linkTypebotToClickInChannelInputSchema,
} from "./handleLinkTypebotToClickInChannel";
import {
  handleListTypebots,
  listTypebotsInputSchema,
} from "./handleListTypebots";
import {
  handlePublishTypebot,
  publishTypebotInputSchema,
  warningSchema,
} from "./handlePublishTypebot";
import {
  handleUnpublishTypebot,
  unpublishTypebotInputSchema,
} from "./handleUnpublishTypebot";
import {
  handleUpdateTypebot,
  updateTypebotInputSchema,
} from "./handleUpdateTypebot";

const createTypebot = authenticatedProcedure
  .route({
    method: "POST",
    path: "/v1/typebots",
    tags: ["Typebot"],
    summary: "Create a typebot",
  })
  .input(createTypebotInputSchema)
  .output(z.object({ typebot: typebotV6Schema }))
  .handler(handleCreateTypebot);

const getTypebot = publicProcedureWithOptionalUser
  .route({
    method: "GET",
    path: "/v1/typebots/{typebotId}",
    tags: ["Typebot"],
    summary: "Get a typebot",
  })
  .input(getTypebotInputSchema)
  .output(
    z.object({
      typebot: typebotSchema,
      currentUserMode: z.enum(["guest", "read", "write"]),
    }),
  )
  .handler(handleGetTypebot);

const updateTypebot = authenticatedProcedure
  .route({
    method: "PATCH",
    path: "/v1/typebots/{typebotId}",
    tags: ["Typebot"],
    summary: "Update a typebot",
  })
  .input(updateTypebotInputSchema)
  .output(z.object({ typebot: typebotV6Schema }))
  .handler(handleUpdateTypebot);

const deleteTypebot = authenticatedProcedure
  .route({
    method: "DELETE",
    path: "/v1/typebots/{typebotId}",
    summary: "Delete a typebot",
    tags: ["Typebot"],
  })
  .input(deleteTypebotInputSchema)
  .output(z.object({ message: z.literal("success") }))
  .handler(handleDeleteTypebot);

const listTypebots = authenticatedProcedure
  .route({
    method: "GET",
    path: "/v1/typebots",
    summary: "List typebots",
    tags: ["Typebot"],
  })
  .input(listTypebotsInputSchema)
  .output(
    z.object({
      typebots: z.array(
        typebotV5Schema
          .pick({
            name: true,
            icon: true,
            id: true,
            spaceId: true,
            createdAt: true,
          })
          .merge(
            z.object({
              publishedTypebotId: z.string().optional(),
              accessRight: z.enum(["read", "write", "guest"]),
            }),
          ),
      ),
    }),
  )
  .handler(handleListTypebots);

const clickInChannelSchema = z.object({ id: z.string(), name: z.string() });

const clickInSyncResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("skipped") }),
  z.object({ status: z.literal("already_linked") }),
  z.object({ status: z.literal("linked"), channelId: z.string() }),
  z.object({ status: z.literal("no_channels") }),
  z.object({
    status: z.literal("multiple_channels"),
    channels: z.array(clickInChannelSchema),
  }),
]);

const publishTypebot = authenticatedProcedure
  .route({
    method: "POST",
    path: "/v1/typebots/{typebotId}/publish",
    summary: "Publish a typebot",
    tags: ["Typebot"],
  })
  .input(publishTypebotInputSchema)
  .output(
    z.object({
      message: z.literal("success"),
      warnings: z.array(warningSchema).optional(),
      clickIn: clickInSyncResultSchema.optional(),
    }),
  )
  .handler(handlePublishTypebot);

const linkTypebotToClickInChannel = authenticatedProcedure
  .route({
    method: "POST",
    path: "/v1/typebots/{typebotId}/linkClickInChannel",
    summary: "Link a typebot to one or all ClickIn channels",
    tags: ["Typebot"],
  })
  .input(linkTypebotToClickInChannelInputSchema)
  .output(z.object({ message: z.literal("success") }))
  .handler(handleLinkTypebotToClickInChannel);

const unpublishTypebot = authenticatedProcedure
  .route({
    method: "POST",
    path: "/v1/typebots/{typebotId}/unpublish",
    summary: "Unpublish a typebot",
    tags: ["Typebot"],
  })
  .input(unpublishTypebotInputSchema)
  .output(z.object({ message: z.literal("success") }))
  .handler(handleUnpublishTypebot);

const getPublishedTypebot = authenticatedProcedure
  .route({
    method: "GET",
    path: "/v1/typebots/{typebotId}/publishedTypebot",
    summary: "Get published typebot",
    tags: ["Typebot"],
  })
  .input(getPublishedTypebotInputSchema)
  .output(
    z.object({
      publishedTypebot: publicTypebotSchema.nullable(),
      version: z
        .union([
          publicTypebotSchemaV5.shape.version,
          publicTypebotSchemaV6.shape.version,
        ])
        .optional()
        .describe(
          "Provides the version the published bot was migrated from if `migrateToLatestVersion` is set to `true`.",
        ),
    }),
  )
  .handler(handleGetPublishedTypebot);

const importTypebot = authenticatedProcedure
  .route({
    method: "POST",
    path: "/v1/typebots/import",
    summary: "Import a typebot",
    tags: ["Typebot"],
  })
  .input(importTypebotInputSchema)
  .output(z.object({ typebot: typebotV6Schema }))
  .handler(handleImportTypebot);

const getTypebotBlocks = authenticatedProcedure
  .input(getTypebotBlocksInputSchema)
  .handler(handleGetTypebotBlocks);

const isPublicIdAvailable = authenticatedProcedure
  .input(isPublicIdAvailableInputSchema)
  .handler(handleIsPublicIdAvailable);

export type TypebotRouter = {
  createTypebot: typeof createTypebot;
  getTypebot: typeof getTypebot;
  updateTypebot: typeof updateTypebot;
  deleteTypebot: typeof deleteTypebot;
  listTypebots: typeof listTypebots;
  publishTypebot: typeof publishTypebot;
  unpublishTypebot: typeof unpublishTypebot;
  getPublishedTypebot: typeof getPublishedTypebot;
  importTypebot: typeof importTypebot;
  getTypebotBlocks: typeof getTypebotBlocks;
  isPublicIdAvailable: typeof isPublicIdAvailable;
  linkTypebotToClickInChannel: typeof linkTypebotToClickInChannel;
};

export const typebotRouter: TypebotRouter = {
  createTypebot,
  getTypebot,
  updateTypebot,
  deleteTypebot,
  listTypebots,
  publishTypebot,
  unpublishTypebot,
  getPublishedTypebot,
  importTypebot,
  getTypebotBlocks,
  isPublicIdAvailable,
  linkTypebotToClickInChannel,
};
