import { LogOut, User, Coins, Store, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StudentNavbarProps {
  studentName: string;
  bitcash?: number;
  onLogout: () => void;
}

const StudentNavbar = ({ studentName, bitcash = 0, onLogout }: StudentNavbarProps) => {
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
        
        {/* Centro: Saldo de BITCash */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500/90 dark:from-yellow-500 dark:to-yellow-600 shadow-md border border-yellow-300 dark:border-yellow-500/50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full">
            <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-950 dark:text-yellow-100 drop-shadow-sm" />
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-yellow-900/80 dark:text-yellow-200/80 leading-none">
                Saldo
              </span>
              <span className="text-xs sm:text-sm font-black text-yellow-950 dark:text-white leading-tight">
                {bitcash} BITCash
              </span>
            </div>
          </div>
        </div>
        
        {/* Lado Direito: Data e Botão de Logout */}
        <div className="flex items-center gap-3">
          <span className="hidden xs:block text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
            {currentDate}
          </span>
          
          <Link
            to="/"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 transition-all duration-200 shadow-sm shrink-0"
            title="Página Principal"
          >
            <Home className="w-5 h-5" />
          </Link>

          <Link
            to="/vitrine"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-school-blue-500/10 border border-school-blue-500/20 text-school-blue-600 dark:text-school-blue-400 hover:bg-school-blue-500/20 active:scale-90 transition-all duration-200 shadow-sm shrink-0"
            title="Acessar Vitrine de Prêmios"
          >
            <Store className="w-5 h-5" />
          </Link>

          <button
            onClick={onLogout}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 active:scale-90 transition-all duration-200 touch-manipulation shadow-sm shrink-0"
            aria-label="Sair da conta"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default StudentNavbar;
