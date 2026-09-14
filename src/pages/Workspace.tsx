import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ProfessionalProfileGate from '@/components/marcenaria/ProfessionalProfileGate';
import ProfessionalWorkspace from '@/modules/jornada/ProfessionalWorkspace';

const Workspace = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="min-h-screen bg-slate-950" aria-label="Carregando sua área de trabalho" />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile?.profession) return <ProfessionalProfileGate />;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <ProfessionalWorkspace profession={profile.profession} name={profile.name} navigateTo={(id, params = {}) => navigate(`/?module=${id}${Object.keys(params).length ? `&${new URLSearchParams(params).toString()}` : ''}`)} />
    </div>
  );
};

export default Workspace;
