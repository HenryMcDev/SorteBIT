
import { GraduationCap } from 'lucide-react';

const Header = () => {
  return (
    <header className="text-center py-6 md:py-8 px-4">
      <div className="flex justify-center items-center mb-4 md:mb-6">
        <GraduationCap className="text-school-blue-600 w-8 h-8 md:w-12 md:h-12 mr-2 md:mr-3" />
        <div className="text-school-blue-600 text-lg md:text-2xl font-bold">BIT EDUCAÇÃO & NEGÓCIOS</div>
      </div>
      
      <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-school-blue-700 mb-3 md:mb-4 leading-tight px-2">
        SorteBIT eu visto o UNIFORME
      </h1>
      
      <p className="text-sm md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-2">
        Preencha seu nome e número de telefone para gerar automaticamente seu número da sorte. 
        O sorteio será realizado no final do mês!
      </p>
    </header>
  );
};

export default Header;
