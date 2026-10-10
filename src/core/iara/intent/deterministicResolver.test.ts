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
    // 240x220x60 is treated as cm by the marcenaria logic (10-300 range)
    expect(r?.entities.width).toBe(2400);
    expect(r?.entities.height).toBe(2200);
    expect(r?.entities.depth).toBe(600);
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

  it("preserva portas, acabamento e tipo de porta informados explicitamente", async () => {
    const r = await deterministicResolver.resolve({
      text: "crie este projeto 2500x2800x600 na cor branco tx 6 portas de abrir",
      context: ctx,
      correlationId: "t",
    });
    expect(r?.intent).toBe("create_projeto");
    expect(r?.missingSlots).toHaveLength(0);
    expect(r?.entities.width).toBe(2500);
    expect(r?.entities.height).toBe(2800);
    expect(r?.entities.depth).toBe(600);
    expect(r?.entities.doors).toBe(6);
    expect(r?.entities.external_material).toBe("branco tx");
    expect(r?.entities.doorType).toBe("abrir");
  });

  it("reconhece render por texto", async () => {
    const r = await deterministicResolver.resolve({
      text: "renderize este projeto",
      context: { ...ctx, environmentId: "env-1" },
      correlationId: "t",
    });
    expect(r?.intent).toBe("gerar_render");
  });

  it("prioriza render quando uma imagem é anexada e o texto não tem intenção de criar", async () => {
    const r = await deterministicResolver.resolve({
      text: "faça um render dentro desse ambiente",
      images: [{ mimeType: "image/jpeg", data: "x" }],
      context: ctx,
      correlationId: "t",
    });
    expect(r?.intent).toBe("gerar_render");
    expect(r?.confidence).toBe(0.98);
  });

  it("prioriza criação de projeto quando texto diz 'crie' mesmo com imagem", async () => {
    const r = await deterministicResolver.resolve({
      text: "crie este projeto 2500x2800x600",
      images: [{ mimeType: "image/jpeg", data: "x" }],
      context: ctx,
      correlationId: "t",
    });
    expect(r?.intent).toBe("create_projeto");
    expect(r?.entities.width).toBe(2500);
  });
});
