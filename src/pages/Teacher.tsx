
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TeacherPortal from '@/components/TeacherPortal';

const Teacher = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Background decorativo sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-school-blue-50/30 via-white to-school-yellow-50/30 pointer-events-none"></div>
      
      <div className="relative z-10">
        <Header />
        
        <main className="py-8">
          <TeacherPortal />
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default Teacher;
