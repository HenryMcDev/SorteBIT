import { LogOut, User } from 'lucide-react';

interface StudentNavbarProps {
  studentName: string;
  onLogout: () => void;
}

const StudentNavbar = ({ studentName, onLogout }: StudentNavbarProps) => {
  const firstName = studentName.split(' ')[0];
  
  // Data no padrão brasileiro: dia, mês e ano (ex: 21 de maio de 2026)
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 shadow-sm">
      <div className="w-full px-4 h-[72px] flex items-center justify-between">
        
        {/* Lado Esquerdo: Avatar, Saudação e Nome */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-school-blue-500/20 border border-school-blue-500/30 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-school-blue-400" />
          </div>
          <div className="flex flex-col truncate">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
              Bem-vindo(a),
            </span>
            <span className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[120px] sm:max-w-[200px]">
              {firstName}
            </span>
          </div>
        </div>
        
        {/* Lado Direito: Data e Botão de Logout */}
        <div className="flex items-center gap-3">
          <span className="hidden xs:block text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
            {currentDate}
          </span>
          
          <button
            onClick={onLogout}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 active:scale-90 transition-all duration-200 touch-manipulation shadow-sm shrink-0"
            aria-label="Sair da conta"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default StudentNavbar;
