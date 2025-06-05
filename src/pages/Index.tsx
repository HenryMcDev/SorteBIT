
import { useState } from 'react';
import Header from '@/components/Header';
import LotteryForm from '@/components/LotteryForm';
import Footer from '@/components/Footer';
import DesktopBlocker from '@/components/DesktopBlocker';
import { useMobileDetection } from '@/hooks/useMobileDetection';

const Index = () => {
  const isMobile = useMobileDetection();
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  // Se não é mobile e não tem acesso admin, mostrar bloqueio
  if (!isMobile && !hasAdminAccess) {
    return <DesktopBlocker onAdminAccess={() => setHasAdminAccess(true)} />;
  }

  // Renderizar normalmente se é mobile ou tem acesso admin
  return (
    <div className="min-h-screen bg-white">
      {/* Background decorativo sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-school-blue-50/30 via-white to-school-yellow-50/30 pointer-events-none"></div>
      
      <div className="relative z-10">
        {/* Indicador de acesso administrativo */}
        {!isMobile && hasAdminAccess && (
          <div className="bg-school-yellow-100 border-b-2 border-school-yellow-300 px-4 py-2 text-center">
            <span className="text-school-blue-700 font-semibold text-sm">
              🔓 Acesso Administrativo Ativo
            </span>
          </div>
        )}
        
        <Header />
        
        <main className="py-8">
          <LotteryForm />
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default Index;
