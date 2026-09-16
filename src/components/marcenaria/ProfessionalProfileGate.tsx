export { PROFESSIONAL_PROFILES } from '@/modules/admin/ProfessionalProfiles';
export type { ProfessionalProfile } from '@/modules/admin/ProfessionalProfiles';

/**
 * Compatibility export for older imports.
 * Professional profile selection now happens before authentication.
 */
const ProfessionalProfileGate = () => null;

export default ProfessionalProfileGate;
