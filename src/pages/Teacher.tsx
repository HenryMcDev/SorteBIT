import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StudentAuth from '@/components/StudentAuth';
import { useStudentAuth } from '@/hooks/useStudentAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Teacher = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoading, login, register, cpfValue, cpfError, handleCPFChange, setCpfValue } = useStudentAuth();

  // Custom login wrapper for the Teacher page
  const handleTeacherLogin = async (email: string, pass: string) => {
    const result = await login(email, pass);
    if (result.success) {
      if (result.role === 'PROFESSOR') {
        navigate('/professor/dashboard');
      } else {
        // Barrar acesso se for aluno
        toast({
          title: 'Acesso Restrito',
          description: 'Esta área é restrita a professores. Alunos devem utilizar o acesso mobile.',
          variant: 'destructive',
        });
        // Desloga o aluno no Supabase e limpa a sessão local
        await supabase.auth.signOut();
        localStorage.removeItem('bit_student_session');
        // Redireciona para a raiz
        navigate('/');
      }
    }
    return result;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-all duration-300 relative flex flex-col justify-between">
      <div className="absolute inset-0 bg-gradient-to-br from-school-blue-50/30 via-white to-school-yellow-50/30 pointer-events-none dark:hidden"></div>
      
      <Header />
      
      <main className="py-12 relative z-10 flex-1 flex items-center justify-center">
        <StudentAuth 
          isLoading={isLoading} 
          login={handleTeacherLogin} 
          register={register} 
          cpfValue={cpfValue}
          cpfError={cpfError}
          handleCPFChange={handleCPFChange}
          setCpfValue={setCpfValue}
          defaultMode="login"
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default Teacher;
