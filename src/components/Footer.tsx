
import { GraduationCap, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="relative z-10 bg-school-blue-600 text-white py-8 md:py-12 px-4 mt-12 md:mt-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 md:mb-8">
          <div className="flex justify-center items-center mb-3 md:mb-4">
            <div className="bg-white dark:bg-slate-900 rounded-full p-2 md:p-3 mr-3 md:mr-4">
              <GraduationCap className="text-school-blue-600 dark:text-school-blue-300 w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div className="text-lg md:text-2xl font-bold tracking-wide">BIT EDUCAÇÃO & NEGÓCIOS</div>
          </div>
          <p className="text-white/90 text-sm md:text-lg">
            Educação de qualidade, futuro brilhante
          </p>
        </div>

        <div className="flex justify-center text-center">
          <div className="space-y-2 md:space-y-3">
            <Mail className="w-5 h-5 md:w-6 md:h-6 mx-auto text-school-yellow-300" />
            <div>
              <h3 className="font-semibold text-school-yellow-300 mb-1 text-sm md:text-base">Email</h3>
              <p className="text-white text-xs md:text-sm font-medium">
                bia.bitaraxa@gmail.com
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 md:mt-8 pt-6 md:pt-8 border-t border-school-blue-500">
          <p className="text-blue-100 text-xs md:text-sm">
            © 2026 bit educação & negócios. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
