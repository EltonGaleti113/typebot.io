import { env } from "@typebot.io/env";
import { generateApiToken, hashApiToken } from "@typebot.io/lib/apiToken";
import { z } from "zod";

const CLICKIN_EMAIL_PATTERN = /^workspace-(.+)@clickin\.internal$/;

export type ClickInProvisioningPrismaClient = {
  apiToken: {
    create(args: {
      data: { name: string; ownerId: string; token: string };
    }): Promise<unknown>;
  };
  workspace: {
    update(args: {
      where: { id: string };
      data: { clickInApiKey: string };
    }): Promise<unknown>;
  };
};

const clickInWebhookResponseSchema = z.object({
  clickInApiKey: z.string().optional(),
});

// Assinatura mínima em vez de `typeof fetch` — evita exigir propriedades exóticas
// da Fetch API (ex: `preconnect`) de quem passa um fake nos testes.
type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/// Provisiona o lado ClickIn no primeiro login via SSO (createUser do NextAuth):
/// cria um ApiToken pro usuário sintético recém-criado, avisa o ClickIn do
/// workspaceId novo, e grava de volta o clickInApiKey devolvido — fecha o ciclo do
/// mecanismo de publish→vincula canal (clickInSync.ts). No-op silencioso quando o
/// e-mail não é sintético do ClickIn ou a integração não está configurada no servidor.
export const provisionClickInWorkspace = async (
  p: ClickInProvisioningPrismaClient,
  input: { email: string; userId: string; workspaceId: string },
  fetchImpl: FetchLike = fetch,
): Promise<void> => {
  const clickinWorkspaceId = extractClickInWorkspaceId(input.email);
  if (
    !clickinWorkspaceId ||
    !env.CLICKIN_API_URL ||
    !env.CLICKIN_WEBHOOK_SECRET
  )
    return;

  const apiToken = generateApiToken();
  await p.apiToken.create({
    data: {
      name: "ClickIn SSO",
      ownerId: input.userId,
      token: hashApiToken(apiToken),
    },
  });

  const response = await fetchImpl(
    `${env.CLICKIN_API_URL}/internal/typebot/user-created`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Typebot-Webhook-Secret": env.CLICKIN_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        clickinWorkspaceId,
        typebotWorkspaceId: input.workspaceId,
        apiToken,
      }),
    },
  );
  if (!response.ok) return;

  const { clickInApiKey } = clickInWebhookResponseSchema.parse(
    await response.json(),
  );
  if (!clickInApiKey) return;

  await p.workspace.update({
    where: { id: input.workspaceId },
    data: { clickInApiKey },
  });
};

export const extractClickInWorkspaceId = (email: string): string | null =>
  CLICKIN_EMAIL_PATTERN.exec(email)?.[1] ?? null;
