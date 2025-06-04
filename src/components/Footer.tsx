
import { GraduationCap, Phone, MapPin, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-school-blue-700 text-white py-12 px-4 mt-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-white rounded-full p-3 mr-4">
              <GraduationCap className="text-school-blue-700 w-8 h-8" />
            </div>
            <div className="text-2xl font-bold">BIT EDUCAÇÃO & NEGÓCIOS</div>
          </div>
          <p className="text-school-blue-100 text-lg">
            Educação de qualidade, futuro brilhante
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="space-y-3">
            <Phone className="w-6 h-6 mx-auto text-school-yellow-400" />
            <div>
              <h3 className="font-semibold text-school-yellow-400 mb-1">Contato</h3>
              <p className="text-school-blue-100">Dúvidas? Ligue:</p>
              <p className="font-bold text-white">(34) 3662-3600</p>
            </div>
          </div>

          <div className="space-y-3">
            <MapPin className="w-6 h-6 mx-auto text-school-yellow-400" />
            <div>
              <h3 className="font-semibold text-school-yellow-400 mb-1">Endereço</h3>
              <p className="text-school-blue-100">
                Rua Luiz Colombo, 115<br />
                Centro - ARAXÁ, MG
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Mail className="w-6 h-6 mx-auto text-school-yellow-400" />
            <div>
              <h3 className="font-semibold text-school-yellow-400 mb-1">Email</h3>
              <p className="text-school-blue-100">
                contato@bitaraxa.com.br
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 pt-8 border-t border-school-blue-600">
          <p className="text-school-blue-200 text-sm">
            © 2025 bit educação & negócios. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
