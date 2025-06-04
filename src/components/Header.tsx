
import { GraduationCap } from 'lucide-react';

const Header = () => {
  return (
    <header className="text-center py-8 px-4">
      <div className="flex justify-center items-center mb-6">
        <GraduationCap className="text-school-blue-600 w-12 h-12 mr-3" />
        <div className="text-school-blue-600 text-2xl font-bold">BIT EDUCAÇÃO E NEGÓCIOS</div>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-bold text-school-blue-700 mb-4 leading-tight">
        SorteBIT eu visto o UNIFORME
      </h1>
      
      <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
        Preencha seu nome e número de telefone para gerar automaticamente seu número da sorte. 
        O sorteio será realizado no final do mês!
      </p>
    </header>
  );
};

export default Header;
