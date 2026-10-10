import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/agents/orchestrator', () => ({
  runAgentPlan: vi.fn(),
}));

vi.mock('@/core/orchestrator', () => ({
  runOrchestrator: vi.fn(),
}));

vi.mock('@/lib/agents/registry', () => ({
  getAgent: vi.fn(() => ({ dependencies: [] })),
}));

import { runIaraConversation } from '@/lib/agents/domain';
import { runOrchestrator } from '@/core/orchestrator';

const mockedRunOrchestrator = vi.mocked(runOrchestrator);

function execution(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'test-user',
    ...overrides,
  } as never;
}

describe('YARA visual render routing regression', () => {
  beforeEach(() => vi.clearAllMocks());
  it('keeps explicit project creation on createProjeto when a visual reference exists', async () => {
    mockedRunOrchestrator.mockResolvedValue({
      runId: 'run-1',
      plan: [{ tool: 'createProjeto', args: { nome: 'armário', confirmado: true } }],
      summary: 'project',
      results: [{ tool: 'createProjeto', result: { ok: true, data: { id: 'project-1', renderStatus: 'queued' } } }],
      usedFallback: false,
      status: 'completed',
    });

    const response = await runIaraConversation({
      input: { message: 'Crie um armário branco neste ambiente' },
      intent: 'Crie um armário branco neste ambiente',
      execution: execution({
        lastImageBase: 'BASE64_REFERENCE_IMAGE',
        referenceImages: [{ data: 'BASE64_REFERENCE_IMAGE', mimeType: 'image/jpeg', kind: 'environment' }],
      }),
      correlationId: 'corr-1',
    });

    expect(response.action).toBe('create_project');
    expect(response.intent.action).toBe('create_project');

    const context = mockedRunOrchestrator.mock.calls[0]?.[2] as { iara?: { action?: string; createProjectArgs?: Record<string, unknown> } };
    expect(context?.iara?.action).toBe('create_project');
    expect(context?.iara?.createProjectArgs).toBeUndefined();
    expect(response.run.plan[0]?.tool).toBe('createProjeto');
    expect(response.artifacts.some((artifact) => artifact.type === 'project')).toBe(true);
  });

  it('does not require width/height/depth for a photo-based render', async () => {
    mockedRunOrchestrator.mockResolvedValue({
      runId: 'run-2',
      plan: [{ tool: 'gerarRender', args: { prompt: 'adicione armários planejados' } }],
      summary: 'render',
      results: [{ tool: 'gerarRender', result: { ok: true, data: { status: 'completed', imageUrl: 'https://example.invalid/render.png' } } }],
      usedFallback: false,
      status: 'completed',
    });

    const response = await runIaraConversation({
      input: { message: 'Adicione armários planejados nesta foto' },
      execution: execution({
        lastImageBase: 'BASE64_REFERENCE_IMAGE',
      }),
      correlationId: 'corr-2',
    });

    expect(response.action).toBe('render');
    expect(mockedRunOrchestrator).toHaveBeenCalledTimes(1);
    const [prompt, , context] = mockedRunOrchestrator.mock.calls[0];
    expect(prompt).toContain('Adicione armários planejados');
    expect((context as { iara?: { action?: string } }).iara?.action).toBe('render');
  });

  it('keeps explicit project creation as create_project when there is no visual reference', async () => {
    mockedRunOrchestrator.mockResolvedValue({
      runId: 'run-3',
      plan: [{ tool: 'createProjeto', args: { nome: 'Armário', width: 1200, height: 2200, depth: 600, confirmado: true } }],
      summary: 'project',
      results: [{ tool: 'createProjeto', result: { ok: true, data: { id: 'project-1' } } }],
      usedFallback: false,
      status: 'completed',
    });

    const response = await runIaraConversation({
      input: { message: 'Crie um armário 1200x2200x600' },
      intent: 'Crie um armário 1200x2200x600',
      execution: execution(),
      correlationId: 'corr-3',
    });

    expect(response.action).toBe('create_project');
    const context = mockedRunOrchestrator.mock.calls[0]?.[2] as { iara?: { action?: string } };
    expect(context?.iara?.action).toBe('create_project');
    expect(response.run.plan[0]?.tool).toBe('createProjeto');
  });

  it('never reports a project artifact for a visual render route', async () => {
    mockedRunOrchestrator.mockResolvedValue({
      runId: 'run-4',
      plan: [{ tool: 'gerarRender', args: { prompt: 'renderize esta cozinha' } }],
      summary: 'render',
      results: [{ tool: 'gerarRender', result: { ok: true, data: { status: 'completed', imageUrl: 'https://example.invalid/render.png' } } }],
      usedFallback: false,
      status: 'completed',
    });

    const response = await runIaraConversation({
      input: { message: 'Renderize esta cozinha' },
      execution: execution({ lastImageBase: 'BASE64_REFERENCE_IMAGE' }),
      correlationId: 'corr-4',
    });

    expect(response.action).toBe('render');
    expect(response.artifacts.map((artifact) => artifact.type)).not.toContain('project');
    expect(response.artifacts.map((artifact) => artifact.type)).toContain('render');
  });
});
