import type { IntentResolver, IntentResolverInput, ResolvedIntent, SlotRequirement } from "./types";

const WORDS: Array<[RegExp, string]> = [
  [/\bduas?\b/g, "2"],
  [/\btrês\b/g, "3"],
  [/\btres\b/g, "3"],
  [/\bquatro\b/g, "4"],
  [/\bcinco\b/g, "5"],
  [/\bseis\b/g, "6"],
  [/\bsete\b/g, "7"],
  [/\boito\b/g, "8"],
  [/\bnove\b/g, "9"],
  [/\bdez\b/g, "10"],
];

const norm = (s: string) => s.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
const words = (s: string) => WORDS.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), s);

function mm(value: string, unit?: string, axisName?: "width" | "height" | "depth") {
  const number = Number(value.replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) return undefined;
  const normalizedUnit = (unit ?? "").toLowerCase();
  if (normalizedUnit === "m" || normalizedUnit === "metro" || normalizedUnit === "metros") return number * 1000;
  if (normalizedUnit === "cm" || normalizedUnit === "centímetro" || normalizedUnit === "centímetros") return number * 10;
  if (normalizedUnit === "mm" || normalizedUnit === "milímetro" || normalizedUnit === "milímetros") return number;

  // Conversa de marcenaria costuma omitir "cm" em medidas de móveis:
  // "55 de profundidade" = 55 cm; "2,80 de altura" = 2,80 m.
  if (number < 10) return number * 1000;
  if (number >= 10 && number <= 300 && axisName) return number * 10;
  return number;
}

const triple = /(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metros?|centímetros?)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metros?|centímetros?)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metros?|centímetros?)?/i;

function dims(value: string) {
  const match = value.match(triple);
  if (!match) return;
  const width = mm(match[1], match[2], "width");
  const height = mm(match[3], match[4], "height");
  const depth = mm(match[5], match[6], "depth");
  return width && height && depth ? { width, height, depth } : undefined;
}

function axisCandidates(value: string, axisName: "width" | "height" | "depth"): number[] {
  const axisWords = axisName === "width"
    ? "(?:largura|largo|comprimento)"
    : axisName === "height"
      ? "(?:altura|alto)"
      : "(?:profundidade|profundo)";
  const number = "(\d+(?:[.,]\d+)?)";
  const unit = "(mm|cm|m|metros?|centímetros?)?";

  const patterns = [
    new RegExp(axisWords + "\s*(?:é|e|de|:|=)?\s*" + number + "\s*" + unit + "\b", "gi"),
    new RegExp(number + "\s*" + unit + "\s*(?:de\s+)?" + axisWords + "\b", "gi"),
    new RegExp(number + "\s*" + unit + "\s*(?:ou|o|ou\s+de|e)\s*" + number + "\s*" + unit + "\s*(?:de\s+)?" + axisWords + "\b", "gi"),
  ];

  const result: number[] = [];
  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      const numericIndexes = match
        .map((item, index) => ({ item, index }))
        .filter(({ item, index }) => index > 0 && /^\d/.test(item))
        .map(({ index }) => index);

      for (const index of numericIndexes) {
        const parsed = mm(match[index], match[index + 1], axisName);
        if (Number.isFinite(parsed) && !result.includes(parsed as number)) result.push(parsed as number);
      }
    }
  }
  return result;
}

function axis(value: string, axisName: "width" | "height" | "depth") {
  return axisCandidates(value, axisName)[0];
}

function extract(value: string) {
  const dimensions = dims(value);
  if (dimensions) return dimensions;
  const width = axis(value, "width");
  const height = axis(value, "height");
  const depth = axis(value, "depth");
  return width && height && depth ? { width, height, depth } : undefined;
}
const create = /\b(crie|criar|cria|quero|preciso|gostaria|novo projeto|novo móvel|novo movel|monte um projeto|faça um projeto|faca um projeto)\b/i;
const noun = /\b(projeto|móvel|movel|armário|armario|cozinha|bancada)\b/i;
const render = /\b(render|renderize|renderizar)\b|\b(gera|gerar|crie|criar|quero ver|visualiza|visualizar|mostra|mostrar)\b.*\b(render|imagem|visualização|visualizacao)\b/i;
const actions: Record<string, string[]> = {
  cut: ["corte", "chapa"],
  materials: ["material", "materiais", "mdf"],
  hardware: ["ferragem", "ferragens"],
  inventory: ["estoque"],
  production: ["produção", "producao", "fabricar"],
  budget: ["orçamento", "orcamento", "preço", "preco", "custo"],
  documents: ["documento", "documentos", "contrato"],
  order: ["pedido"],
  assembly: ["montagem", "montar"],
  installation: ["instalação", "instalacao", "instalar"],
  checklist: ["checklist"],
  delivery: ["entrega"],
  review_project: ["revisar projeto", "conferir projeto"],
  check_measurements: ["conferir medida", "conferir medidas"],
};

function createProject(value: string, input?: IntentResolverInput): ResolvedIntent | null {
  if (!create.test(value) || !noun.test(value)) return null;

  const dimensions = extract(value);
  const explicitDoors = value.match(/(?:^|\s)(\d+)\s+portas?\b/i)?.[1];
  const doorOpening = value.match(/(?:\d+)\s+portas?\s+(?:de\s+)?(abrir|abertura)\b/i)?.[1];
  const material = value.match(/(?:na|em|com\s+(?:a|o)?)\s+cor\s+([a-záàâãéêíóôõúç0-9\s-]+?)(?=\s+\d+\s+portas?|\s*$)/i)?.[1]?.trim();
  const projectState = input?.context?.projectState as
    | { project?: { dimensions?: Partial<Record<"width" | "height" | "depth", number>> } }
    | undefined;
  const remembered = projectState?.project?.dimensions ?? {};
  const candidates = {
    width: axisCandidates(value, "width"),
    height: axisCandidates(value, "height"),
    depth: axisCandidates(value, "depth"),
  };

  const merged: Record<string, number> = {
    ...(remembered.width && remembered.width > 0 ? { width: remembered.width } : {}),
    ...(remembered.height && remembered.height > 0 ? { height: remembered.height } : {}),
    ...(remembered.depth && remembered.depth > 0 ? { depth: remembered.depth } : {}),
  };
  for (const axisName of ["width", "height", "depth"] as const) {
    if (!merged[axisName] && candidates[axisName].length === 1) merged[axisName] = candidates[axisName][0];
  }
  if (dimensions) Object.assign(merged, dimensions);

  const missing: SlotRequirement[] = [];
  if (!merged.width) missing.push({
    tool: "createProjeto",
    field: "width",
    label: "Qual a largura do móvel?",
  });
  if (!merged.height) {
    const values = candidates.height;
    missing.push({
      tool: "createProjeto",
      field: "height",
      label: values.length > 1
        ? "A altura ficou ambígua. Você quer " + values.map((value) => (value / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })).join(" m ou ") + " m?"
        : "Qual a altura do móvel?",
    });
  }
  if (!merged.depth) missing.push({
    tool: "createProjeto",
    field: "depth",
    label: "Qual a profundidade do móvel?",
  });

  return {
    intent: "create_projeto",
    entities: {
      nome: "Novo projeto",
      ...merged,
      ...(explicitDoors ? { doors: Number(explicitDoors) } : {}),
      ...(material ? { external_material: material } : {}),
      ...(doorOpening ? { doorType: doorOpening.toLowerCase() } : {}),
    },
    confidence: missing.length === 0 ? 0.95 : 0.6,
    missingSlots: missing,
    source: "deterministic",
  } as ResolvedIntent;
}

export const deterministicResolver: IntentResolver = {
  name: "deterministic",
  async resolve(input: IntentResolverInput) {
    const value = words(norm(input.text));
    const project = createProject(value, input);
    // Prioritize project creation if we have high confidence OR if there's no image.
    // If an image is present, we only favor project creation if it's very explicit.
    if (project && (project.confidence >= 0.9 || (!input.images?.length && project.confidence >= 0.6))) return project;

    if (input.images?.length) {
      return {
        intent: "gerar_render",
        entities: { prompt: input.text || "Gere o projeto/render a partir da imagem de referência enviada." },
        confidence: 0.98,
        missingSlots: [],
        source: "deterministic",
      };
    }
    
    // Render has precedence when an environment is already selected.
    if (render.test(value) && input.context.environmentId) {
      return {
        intent: "gerar_render",
        entities: { prompt: input.text || "Gere o projeto/render a partir do ambiente atual." },
        confidence: 0.95,
        missingSlots: [],
        source: "deterministic",
      };
    }
    
    if (project) return project;
    
    for (const [action, keywords] of Object.entries(actions)) {
      if (keywords.some((keyword) => value.includes(keyword))) {
        return { intent: "smart_action", entities: { action }, confidence: 0.85, missingSlots: [], source: "deterministic" };
      }
    }
    return null;
  },
};
