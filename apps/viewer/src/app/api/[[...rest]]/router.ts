import { chatRouter } from "@typebot.io/bot-engine/api/router";
import { publicProcedure } from "@typebot.io/config/orpc/viewer/middlewares";
import { fileUploadViewerRouter } from "@typebot.io/file-input-block/api/router";
import { webhookRouter } from "@typebot.io/webhook-block/api/router";
import { z } from "zod";
import { handleHealthz } from "./handleHealthz";

const healthz = publicProcedure
  .route({
    method: "GET",
    path: "/healthz",
  })
  .output(z.object({ status: z.literal("ok") }))
  .handler(handleHealthz);

export type AppRouter = {
  publicChatRouter: typeof chatRouter;
  fileInput: typeof fileUploadViewerRouter;
  healthz: typeof healthz;
  webhook: typeof webhookRouter;
};

export const appRouter: AppRouter = {
  publicChatRouter: chatRouter,
  fileInput: fileUploadViewerRouter,
  healthz,
  webhook: webhookRouter,
};
