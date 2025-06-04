
import { GraduationCap, Phone, MapPin, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-school-blue-700 text-white py-8 md:py-12 px-4 mt-12 md:mt-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 md:mb-8">
          <div className="flex justify-center items-center mb-3 md:mb-4">
            <div className="bg-white rounded-full p-2 md:p-3 mr-3 md:mr-4">
              <GraduationCap className="text-school-blue-700 w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div className="text-lg md:text-2xl font-bold">BIT EDUCAÇÃO & NEGÓCIOS</div>
          </div>
          <p className="text-school-blue-100 text-sm md:text-lg">
            Educação de qualidade, futuro brilhante
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-center">
          <div className="space-y-2 md:space-y-3">
            <Phone className="w-5 h-5 md:w-6 md:h-6 mx-auto text-school-yellow-400" />
            <div>
              <h3 className="font-semibold text-school-yellow-400 mb-1 text-sm md:text-base">Contato</h3>
              <p className="text-school-blue-100 text-xs md:text-sm">Dúvidas? Ligue:</p>
              <p className="font-bold text-white text-sm md:text-base">(34) 3662-3600</p>
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            <MapPin className="w-5 h-5 md:w-6 md:h-6 mx-auto text-school-yellow-400" />
            <div>
              <h3 className="font-semibold text-school-yellow-400 mb-1 text-sm md:text-base">Endereço</h3>
              <p className="text-school-blue-100 text-xs md:text-sm">
                Rua Luiz Colombo, 115<br />
                Centro - ARAXÁ, MG
              </p>
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            <Mail className="w-5 h-5 md:w-6 md:h-6 mx-auto text-school-yellow-400" />
            <div>
              <h3 className="font-semibold text-school-yellow-400 mb-1 text-sm md:text-base">Email</h3>
              <p className="text-school-blue-100 text-xs md:text-sm">
                contato@bitaraxa.com.br
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 md:mt-8 pt-6 md:pt-8 border-t border-school-blue-600">
          <p className="text-school-blue-200 text-xs md:text-sm">
            © 2025 bit educação & negócios. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
