import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import LotteryForm from '@/components/LotteryForm';
import Footer from '@/components/Footer';
import DesktopBlocker from '@/components/DesktopBlocker';
import StudentAuth from '@/components/StudentAuth';
import StudentNavbar from '@/components/StudentNavbar';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import DailyCheckinModal from '@/components/DailyCheckinModal';

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const isTeacher = sessionStorage.getItem('school_teacher_session');
    if (isTeacher) {
      navigate('/professor/dashboard');
    }
  }, [navigate]);

  const isMobile = useMobileDetection();
  const { studentUser, isAuthenticated, isLoading, login, register, logout, cpfValue, cpfError, handleCPFChange, setCpfValue } = useStudentAuth();
  const [saldo, setSaldo] = useState(0);
  const [isDailyCheckinOpen, setIsDailyCheckinOpen] = useState(false);
  const [hasPendingCheckin, setHasPendingCheckin] = useState(false);
  const [alreadyParticipated, setAlreadyParticipated] = useState(false);

  const checkAlreadyParticipated = () => {
    const savedExpiration = localStorage.getItem('bit_expiration_time');
    if (savedExpiration) {
      const expirationTime = parseInt(savedExpiration, 10);
      return expirationTime - Date.now() > 0;
    }
    return false;
  };

  const buscarSaldoInicial = async () => {
    if (!studentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('estudantes' as any)
        .select('bitcash')
        .eq('id', studentUser.id)
        .maybeSingle();
      if (data) {
        setSaldo((data as any).bitcash || 0);
      }
    } catch (err) {
      console.error("Erro ao buscar saldo inicial:", err);
    }
  };

  const verificarCheckinPendente = async () => {
    if (!studentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('campanha_lancamento_checkin' as any)
        .select('data_resgate')
        .eq('aluno_id', Number(studentUser.id))
        .order('data_resgate', { ascending: false });
      
      const records = data as any[] | null;
      if (records && records.length > 0) {
        const lastResgate = new Date(records[0].data_resgate);
        const hoje = new Date();
        const eHoje = lastResgate.getDate() === hoje.getDate() &&
                      lastResgate.getMonth() === hoje.getMonth() &&
                      lastResgate.getFullYear() === hoje.getFullYear();
        
        setHasPendingCheckin(!eHoje);
      } else {
        setHasPendingCheckin(true); // Nunca fez check-in, então está pendente
      }
    } catch (err) {
      console.error("Erro ao verificar checkin pendente:", err);
    }
  };

  useEffect(() => {
    if (studentUser?.id) {
      buscarSaldoInicial();
      verificarCheckinPendente();
      setAlreadyParticipated(checkAlreadyParticipated());
    }
  }, [studentUser?.id, isDailyCheckinOpen]);

  if (!isMobile) {
    return <DesktopBlocker />;
  }

  return (
    <div className={`min-h-screen bg-white dark:bg-zinc-950 transition-all duration-300 ${isAuthenticated ? 'pt-[72px]' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-school-blue-50/30 via-white to-school-yellow-50/30 pointer-events-none dark:hidden"></div>

      {isAuthenticated && studentUser && (
        <StudentNavbar 
          studentName={studentUser.name} 
          bitcash={saldo} 
          onLogout={logout} 
          studentId={studentUser.id} 
          setSaldo={setSaldo}
          onOpenDailyCheckin={() => setIsDailyCheckinOpen(true)}
          hasPendingCheckin={hasPendingCheckin}
        />
      )}

      <div className="relative z-10">
        <Header />

        <main className="py-8">
          {isAuthenticated && studentUser ? (
            <LotteryForm 
              studentUser={studentUser} 
              onSuccessPhotoValidated={() => {
                setAlreadyParticipated(true);
                setIsDailyCheckinOpen(true);
              }}
            />
          ) : (
            <StudentAuth 
              isLoading={isLoading} 
              login={login} 
              register={register} 
              cpfValue={cpfValue}
              cpfError={cpfError}
              handleCPFChange={handleCPFChange}
              setCpfValue={setCpfValue}
            />
          )}
        </main>

        <Footer />
      </div>

      {isAuthenticated && studentUser && (
        <DailyCheckinModal
          isOpen={isDailyCheckinOpen}
          onClose={() => setIsDailyCheckinOpen(false)}
          studentId={studentUser.id}
          currentBalance={saldo}
          setSaldo={setSaldo}
          alreadyParticipated={alreadyParticipated}
          onCheckinSuccess={() => verificarCheckinPendente()}
        />
      )}
    </div>
  );
};

export default Index;
