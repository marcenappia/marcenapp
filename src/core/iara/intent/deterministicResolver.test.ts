import { describe, it, expect } from "vitest";
import { deterministicResolver } from "./deterministicResolver";

const ctx = { projectId: undefined, environmentId: undefined, recentMessages: [] };

describe("IARA deterministic resolver", () => {
  it("reconhece projeto com dimensões", async () => {
    const r = await deterministicResolver.resolve({
      text: "crie um armário 240x220x60",
      context: ctx,
      correlationId: "t",
    });
    expect(r?.intent).toBe("create_projeto");
    expect(r?.missingSlots).toHaveLength(0);
    expect(r?.entities.width).toBe(240);
  });

  it("mantém slots faltantes estruturados", async () => {
    const r = await deterministicResolver.resolve({
      text: "crie um armário",
      context: ctx,
      correlationId: "t",
    });
    expect(r?.intent).toBe("create_projeto");
    expect(r?.missingSlots.map((x) => x.field)).toEqual(["width", "height", "depth"]);
  });

  it("preserva dimensões parciais e pede apenas largura + escolha da altura", async () => {
    const r = await deterministicResolver.resolve({
      text: "iara, cria esse projeto para mim, é capaz de ter 2,80 m ou 2,60 m de altura e 55 de profundidade",
      context: ctx,
      correlationId: "t",
    });
    expect(r?.intent).toBe("create_projeto");
    expect(r?.entities.depth).toBe(550);
    expect(r?.entities.height).toBeUndefined();
    expect(r?.missingSlots.map((x) => x.field)).toEqual(["width", "height"]);
    expect(r?.missingSlots.find((x) => x.field === "height")?.label).toContain("2,80");
    expect(r?.missingSlots.find((x) => x.field === "height")?.label).toContain("2,60");
    expect(r?.missingSlots.find((x) => x.field === "height")?.label).not.toContain("profundidade");
  });

  it("interpreta medidas de marcenaria sem unidade no contexto do móvel", async () => {
    const r = await deterministicResolver.resolve({
      text: "crie um armário com 1,20 de largura, 2,80 de altura e 55 de profundidade",
      context: ctx,
      correlationId: "t",
    });
    expect(r?.intent).toBe("create_projeto");
    expect(r?.missingSlots).toHaveLength(0);
    expect(r?.entities.width).toBe(1200);
    expect(r?.entities.height).toBe(2800);
    expect(r?.entities.depth).toBe(550);
  });

  it("reconhece render por texto", async () => {
    const r = await deterministicResolver.resolve({
      text: "renderize este projeto",
      context: { ...ctx, environmentId: "env-1" },
      correlationId: "t",
    });
    expect(r?.intent).toBe("gerar_render");
  });

  it("prioriza render quando uma imagem é anexada", async () => {
    const r = await deterministicResolver.resolve({
      text: "faça um projeto dentro desse ambiente",
      images: [{ mimeType: "image/jpeg", data: "x" }],
      context: ctx,
      correlationId: "t",
    });
    expect(r?.intent).toBe("gerar_render");
    expect(r?.confidence).toBe(0.98);
  });
});
