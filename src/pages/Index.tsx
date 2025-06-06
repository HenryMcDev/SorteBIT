
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import LotteryForm from '@/components/LotteryForm';
import Footer from '@/components/Footer';
import DesktopBlocker from '@/components/DesktopBlocker';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Button } from '@/components/ui/button';
import { LogOut, GraduationCap } from 'lucide-react';

const Index = () => {
  const isMobile = useMobileDetection();
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  const handleLogout = () => {
    setHasAdminAccess(false);
  };

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
        {/* Indicador de acesso administrativo e botão de logout */}
        {!isMobile && hasAdminAccess && (
          <div className="bg-school-yellow-100 border-b-2 border-school-yellow-300 px-4 py-3">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <span className="text-school-blue-700 font-semibold text-sm">
                🔓 Acesso Administrativo Ativo
              </span>
              <div className="flex items-center gap-3">
                <Link to="/teacher">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-school-blue-600 text-school-blue-600 hover:bg-school-blue-50 bg-white"
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Área do Professor
                  </Button>
                </Link>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="border-school-blue-600 text-school-blue-600 hover:bg-school-blue-50 bg-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Link para área do professor em dispositivos móveis */}
        {isMobile && (
          <div className="bg-school-blue-50 border-b border-school-blue-200 px-4 py-3">
            <div className="text-center">
              <Link to="/teacher">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-school-blue-600 text-school-blue-600 hover:bg-school-blue-100 bg-white"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Área do Professor
                </Button>
              </Link>
            </div>
          </div>
        )}
        
        <Header />
        
        <main className="py-8">
          <LotteryForm isAdminMode={hasAdminAccess} />
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default Index;
