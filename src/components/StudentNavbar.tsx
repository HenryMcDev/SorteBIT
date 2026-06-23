import { LogOut, User, Coins, Store, Home, Menu, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { TermosCondicoes } from './TermosCondicoes';

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
        
        {/* === DESKTOP NAVBAR === */}
        <div className="hidden md:flex items-center justify-between w-full">
          {/* Lado Esquerdo: Avatar, Saudação e Nome */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-school-blue-500/20 border border-school-blue-500/30 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-school-blue-400" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                Bem-vindo(a),
              </span>
              <span className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[200px]">
                {firstName}
              </span>
            </div>
          </div>
          
          {/* Centro: Saldo de BITCash */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500/90 dark:from-yellow-500 dark:to-yellow-600 shadow-md border border-yellow-300 dark:border-yellow-500/50 px-4 py-2 rounded-full">
              <Coins className="w-5 h-5 text-yellow-950 dark:text-yellow-100 drop-shadow-sm" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-yellow-900/80 dark:text-yellow-200/80 leading-none">
                  Saldo
                </span>
                <span className="text-sm font-black text-yellow-950 dark:text-white leading-tight">
                  {bitcash} BITCash
                </span>
              </div>
            </div>
          </div>
          
          {/* Lado Direito: Data e Botões */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
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

        {/* === MOBILE NAVBAR === */}
        <div className="flex md:hidden items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-school-blue-500/20 border border-school-blue-500/30 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-school-blue-400" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                SorteBIT
              </span>
              <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                Olá, {firstName}
              </span>
            </div>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <button
                className="flex items-center justify-center w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all duration-200 shadow-sm shrink-0"
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px] flex flex-col p-6 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
              <SheetHeader className="text-left border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4">
                <SheetTitle className="text-lg font-bold text-zinc-900 dark:text-white">Menu</SheetTitle>
              </SheetHeader>

              {/* Informações do Usuário no Menu Mobile */}
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-school-blue-500/20 border-2 border-school-blue-500/30 flex items-center justify-center shrink-0 shadow-sm">
                  <User className="w-10 h-10 text-school-blue-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{studentName}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Aluno(a)</p>
                </div>
              </div>

              {/* Saldo BITCash no Menu Mobile */}
              <div className="flex items-center justify-center gap-3 bg-gradient-to-r from-yellow-400 to-yellow-500/90 dark:from-yellow-500 dark:to-yellow-600 shadow-md border border-yellow-300 dark:border-yellow-500/50 p-4 rounded-xl mb-8">
                <Coins className="w-8 h-8 text-yellow-950 dark:text-yellow-100 drop-shadow-sm" />
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-bold text-yellow-900/80 dark:text-yellow-200/80 leading-none">
                    Saldo Atual
                  </span>
                  <span className="text-xl font-black text-yellow-950 dark:text-white leading-tight">
                    {bitcash} BITCash
                  </span>
                </div>
              </div>

              {/* Ações de Navegação */}
              <div className="flex flex-col gap-3 flex-1">
                <Link
                  to="/"
                  className="flex items-center gap-3 w-full p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium transition-colors border border-zinc-200/50 dark:border-zinc-700/50"
                >
                  <Home className="w-5 h-5 text-zinc-500" />
                  Página Principal
                </Link>

                <Link
                  to="/vitrine"
                  className="flex items-center gap-3 w-full p-3 rounded-lg bg-school-blue-500/10 text-school-blue-700 dark:text-school-blue-400 hover:bg-school-blue-500/20 font-medium transition-colors border border-school-blue-500/20"
                >
                  <Store className="w-5 h-5 text-school-blue-500" />
                  Loja de Prêmios
                </Link>
                
                <TermosCondicoes>
                  <button
                    className="flex items-center gap-3 w-full p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium transition-colors border border-zinc-200/50 dark:border-zinc-700/50"
                  >
                    <FileText className="w-5 h-5 text-zinc-500" />
                    Termos e Condições
                  </button>
                </TermosCondicoes>
              </div>

              {/* Botão Sair */}
              <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={onLogout}
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 font-bold transition-all border border-red-500/20"
                >
                  <LogOut className="w-5 h-5" />
                  Sair da Aplicação
                </button>
              </div>

            </SheetContent>
          </Sheet>
        </div>

      </div>
    </div>
  );
};

export default StudentNavbar;
