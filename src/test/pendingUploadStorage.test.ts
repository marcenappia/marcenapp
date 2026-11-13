import { describe, expect, it } from 'vitest';
import { beginIaraCapture, isActiveIaraCapture, resumeIaraCapture } from '@/modules/iara/services/pendingUploadStorage';

describe('IARA pending photo capture identity', () => {
  it('keeps the same capture active after a page reload restores its ID', () => {
    const originalCaptureId = 'capture-from-indexeddb';

    expect(resumeIaraCapture(originalCaptureId)).toBe(originalCaptureId);
    expect(isActiveIaraCapture(originalCaptureId)).toBe(true);
    expect(isActiveIaraCapture('older-capture')).toBe(false);
  });

  it('assigns an identity to legacy pending photos without one', () => {
    const captureId = resumeIaraCapture();

    expect(captureId).toBeTruthy();
    expect(isActiveIaraCapture(captureId)).toBe(true);
  });

  it('invalidates a previous capture when a new photo is selected', () => {
    const firstCapture = beginIaraCapture();
    const secondCapture = beginIaraCapture();

    expect(secondCapture).not.toBe(firstCapture);
    expect(isActiveIaraCapture(firstCapture)).toBe(false);
    expect(isActiveIaraCapture(secondCapture)).toBe(true);
  });
});
