
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import LotteryForm from '@/components/LotteryForm';
import Footer from '@/components/Footer';
import DesktopBlocker from '@/components/DesktopBlocker';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

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
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      {/* Background decorativo sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-school-blue-50/30 via-white to-school-yellow-50/30 pointer-events-none dark:hidden"></div>
      
      <div className="relative z-10">
        {/* Indicador de acesso administrativo e botão de logout */}
        {!isMobile && hasAdminAccess && (
          <div className="bg-school-yellow-100 border-b-2 border-school-yellow-300 px-4 py-3">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <span className="text-school-blue-700 dark:text-school-blue-300 font-semibold text-sm">
                🔓 Acesso Administrativo Ativo
              </span>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="border-school-blue-600 text-school-blue-600 dark:text-school-blue-400 hover:bg-school-blue-50 dark:bg-slate-800 bg-white dark:bg-slate-900"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
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
