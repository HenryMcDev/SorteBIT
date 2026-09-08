import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StudentAuth from '@/components/StudentAuth';
import { useStudentAuth } from '@/hooks/useStudentAuth';

const Register = () => {
  const { isLoading, login, register, cpfValue, cpfError, handleCPFChange, setCpfValue } = useStudentAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-all duration-300 relative flex flex-col justify-between">
      <div className="absolute inset-0 bg-gradient-to-br from-school-blue-50/30 via-white to-school-yellow-50/30 pointer-events-none dark:hidden"></div>
      <Header />
      <main className="py-12 relative z-10 flex-1 flex items-center justify-center">
        <StudentAuth 
          isLoading={isLoading} 
          login={login} 
          register={register} 
          cpfValue={cpfValue}
          cpfError={cpfError}
          handleCPFChange={handleCPFChange}
          setCpfValue={setCpfValue}
          defaultMode="register"
        />
      </main>
      <Footer />
    </div>
  );
};

export default Register;
