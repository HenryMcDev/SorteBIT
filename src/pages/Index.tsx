import Header from '@/components/Header';
import LotteryForm from '@/components/LotteryForm';
import Footer from '@/components/Footer';
import DesktopBlocker from '@/components/DesktopBlocker';
import StudentAuth from '@/components/StudentAuth';
import StudentNavbar from '@/components/StudentNavbar';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useStudentAuth } from '@/hooks/useStudentAuth';

const Index = () => {
  const isMobile = useMobileDetection();
  const { studentUser, isAuthenticated, isLoading, login, register, logout } = useStudentAuth();

  if (!isMobile) {
    return <DesktopBlocker />;
  }

  return (
    <div className={`min-h-screen bg-white dark:bg-zinc-950 transition-all duration-300 ${isAuthenticated ? 'pt-[72px]' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-school-blue-50/30 via-white to-school-yellow-50/30 pointer-events-none dark:hidden"></div>

      {isAuthenticated && studentUser && (
        <StudentNavbar studentName={studentUser.name} bitcash={studentUser.bitcash} onLogout={logout} />
      )}

      <div className="relative z-10">
        <Header />

        <main className="py-8">
          {isAuthenticated && studentUser ? (
            <LotteryForm studentUser={studentUser} />
          ) : (
            <StudentAuth isLoading={isLoading} login={login} register={register} />
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Index;
