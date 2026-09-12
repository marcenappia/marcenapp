export const PROFESSIONAL_PROFILES = [
  { id: 'marcenaria', label: 'Marcenaria', description: 'Quero organizar e executar meus trabalhos de marcenaria' },
  { id: 'projetista', label: 'Projetista', description: 'Meu foco é projeto, detalhamento e documentação' },
  { id: 'outro', label: 'Outro', description: 'Quero usar uma ferramenta específica do Marcenapp' },
] as const;

/**
 * Professional profile is selected during account creation.
 * Kept as a compatibility export for older imports; there is no post-login gate.
 */
const ProfessionalProfileGate = () => null;

export default ProfessionalProfileGate;
