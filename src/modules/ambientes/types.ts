export type EnvironmentElementType =
  | 'wall'
  | 'corner'
  | 'window'
  | 'door'
  | 'outlet'
  | 'switch'
  | 'baseboard'
  | 'obstacle';

export type DetectionConfidence = 'high' | 'medium' | 'low';
export type MeasurementStatus = 'confirmed' | 'estimated' | 'unknown';

export interface EnvironmentElement {
  id: string;
  type: EnvironmentElementType;
  label: string;
  position?: string;
  widthM?: number | null;
  heightM?: number | null;
  depthM?: number | null;
  angleDeg?: number | null;
  confidence: DetectionConfidence;
  measurementStatus: MeasurementStatus;
  notes?: string;
}

export interface EnvironmentAnalysis {
  version: '1.0';
  roomType: string;
  perspective: {
    description: string;
    confidence: DetectionConfidence;
  };
  elements: EnvironmentElement[];
  missingMeasurements: string[];
  warnings: string[];
  analyzedAt: string;
  confirmedByIara: boolean;
}

export interface EnvironmentConfirmation {
  analysis: EnvironmentAnalysis;
  summary: string;
  questions: string[];
  corrections: string[];
}
