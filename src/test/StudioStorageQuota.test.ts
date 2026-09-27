import { describe, expect, it, beforeEach } from 'vitest';
import { useStudioStore } from '@/store/useStudioStore';
import { useMarcenappOS } from '@/store/useMarcenappOS';

// A real 1024x1024 render returned by ai-image is a PNG data URL of ~2-3 MB.
const renderDataUrl = `data:image/png;base64,${'A'.repeat(2_000_000)}`;
const reference = { mimeType: 'image/jpeg', data: 'B'.repeat(400_000) };

describe('render state persistence under browser storage quota', () => {
  beforeEach(() => {
    localStorage.clear();
    useStudioStore.setState({ commandQueue: [], lastResult: null, generatedImage: null, isRendering: false });
    useMarcenappOS.setState({ commandHistory: [] });
  });

  it('completes an IARA render and keeps the store usable', () => {
    const studio = useStudioStore.getState();
    const id = studio.enqueueCommand({ prompt: 'cozinha', images: [reference, reference], idempotencyKey: 'render-1', metadata: { origin: 'iara' } });
    const osId = useMarcenappOS.getState().dispatchCommand({ source: 'iara', target: 'studio', action: 'GENERATE_VISUAL', idempotencyKey: 'render-1', payload: { studioCommandId: id } });
    useStudioStore.getState().startProcessing(id);
    expect(() => useStudioStore.getState().completeCommand(id, renderDataUrl)).not.toThrow();
    expect(() => useMarcenappOS.getState().updateCommandStatus(osId, 'completed', { resultUrl: renderDataUrl })).not.toThrow();
    expect(useMarcenappOS.getState().commandHistory.find(c => c.id === osId)?.status).toBe('completed');

    // A second render must still be accepted after the first one completed.
    expect(() => useStudioStore.getState().enqueueCommand({ prompt: 'sala', images: [reference], idempotencyKey: 'render-2', metadata: { origin: 'iara' } })).not.toThrow();
    const id2 = useStudioStore.getState().commandQueue.find(c => c.idempotencyKey === 'render-2')!.id;
    expect(() => useStudioStore.getState().completeCommand(id2, renderDataUrl)).not.toThrow();
  });

  it('never writes inline render images to localStorage', () => {
    const id = useStudioStore.getState().enqueueCommand({ prompt: 'cozinha', images: [reference], idempotencyKey: 'render-3', metadata: { origin: 'iara' } });
    const osId = useMarcenappOS.getState().dispatchCommand({ source: 'iara', target: 'studio', action: 'GENERATE_VISUAL', idempotencyKey: 'render-3', payload: { studioCommandId: id } });
    useStudioStore.getState().completeCommand(id, renderDataUrl);
    useMarcenappOS.getState().updateCommandStatus(osId, 'completed', { resultUrl: renderDataUrl });
    const studioRaw = localStorage.getItem('marcenapp-studio-storage') ?? '';
    const osRaw = localStorage.getItem('marcenapp-os-core') ?? '';
    expect(studioRaw).not.toContain('data:image/');
    expect(osRaw).not.toContain('data:image/');
    expect(studioRaw).not.toContain(reference.data.slice(0, 1000));
    expect(useStudioStore.getState().generatedImage).toBe(renderDataUrl);
  });

  it('keeps working when a pending command alone exceeds the storage quota', () => {
    const huge = { mimeType: 'image/jpeg', data: 'C'.repeat(6_000_000) };
    expect(() => useStudioStore.getState().enqueueCommand({ prompt: 'grande', images: [huge], idempotencyKey: 'render-4', metadata: { origin: 'iara' } })).not.toThrow();
    expect(useStudioStore.getState().commandQueue.some(c => c.idempotencyKey === 'render-4' && c.status === 'pending')).toBe(true);
  });
});
