import { describe, expect, it, mock } from "bun:test";

process.env.SKIP_ENV_CHECK = "true";
process.env.CLICKIN_API_URL = "http://clickin.local/api";
process.env.CLICKIN_WEBHOOK_SECRET = "shh-secret";

const { provisionClickInWorkspace, extractClickInWorkspaceId } = await import(
  "./provisionClickInWorkspace"
);

function fakePrisma() {
  return {
    apiToken: { create: mock(async () => ({})) },
    workspace: { update: mock(async () => ({})) },
  };
}

describe("extractClickInWorkspaceId", () => {
  it("extrai o workspaceId de um e-mail sintético ClickIn", () => {
    expect(
      extractClickInWorkspaceId("workspace-ws-abc123@clickin.internal"),
    ).toBe("ws-abc123");
  });

  it("devolve null para e-mail que não é do ClickIn", () => {
    expect(extractClickInWorkspaceId("pessoa@gmail.com")).toBeNull();
  });
});

describe("provisionClickInWorkspace", () => {
  it("não faz nada quando o e-mail não é sintético do ClickIn", async () => {
    const prisma = fakePrisma();
    const fetchImpl = mock(
      async (_url: string, _init: RequestInit) =>
        new Response("{}", { status: 200 }),
    );

    await provisionClickInWorkspace(
      prisma,
      { email: "pessoa@gmail.com", userId: "user-1", workspaceId: "tb-ws-1" },
      fetchImpl,
    );

    expect(prisma.apiToken.create).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("cria o ApiToken, chama o webhook do ClickIn e grava o clickInApiKey devolvido", async () => {
    const prisma = fakePrisma();
    const fetchImpl = mock(
      async (_url: string, _init: RequestInit) =>
        new Response(JSON.stringify({ clickInApiKey: "ck_abc123" }), {
          status: 200,
        }),
    );

    await provisionClickInWorkspace(
      prisma,
      {
        email: "workspace-ws-1@clickin.internal",
        userId: "user-1",
        workspaceId: "tb-ws-1",
      },
      fetchImpl,
    );

    expect(prisma.apiToken.create).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const call = fetchImpl.mock.calls[0];
    if (!call) throw new Error("fetchImpl não foi chamado");
    const [url, requestInit] = call;
    expect(url).toBe("http://clickin.local/api/internal/typebot/user-created");
    expect(requestInit.headers).toMatchObject({
      "X-Typebot-Webhook-Secret": "shh-secret",
    });
    const body = JSON.parse(String(requestInit.body));
    expect(body).toMatchObject({
      clickinWorkspaceId: "ws-1",
      typebotWorkspaceId: "tb-ws-1",
    });

    expect(prisma.workspace.update).toHaveBeenCalledWith({
      where: { id: "tb-ws-1" },
      data: { clickInApiKey: "ck_abc123" },
    });
  });

  it("não quebra e não grava nada quando o webhook do ClickIn falha", async () => {
    const prisma = fakePrisma();
    const fetchImpl = mock(
      async (_url: string, _init: RequestInit) =>
        new Response("erro", { status: 500 }),
    );

    await provisionClickInWorkspace(
      prisma,
      {
        email: "workspace-ws-1@clickin.internal",
        userId: "user-1",
        workspaceId: "tb-ws-1",
      },
      fetchImpl,
    );

    expect(prisma.workspace.update).not.toHaveBeenCalled();
  });
});
