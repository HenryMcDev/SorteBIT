import Header from '@/components/Header';
import LotteryForm from '@/components/LotteryForm';
import Footer from '@/components/Footer';
import DesktopBlocker from '@/components/DesktopBlocker';
import { useMobileDetection } from '@/hooks/useMobileDetection';

const Index = () => {
  const isMobile = useMobileDetection();

  // Se não é mobile mostrar bloqueio com link para admin
  if (!isMobile) {
    return <DesktopBlocker />;
  }

  // Renderizar normalmente se é mobile
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Background decorativo sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-school-blue-50/30 via-white to-school-yellow-50/30 pointer-events-none dark:hidden"></div>
      
      <div className="relative z-10">
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
