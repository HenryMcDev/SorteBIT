import React, { useState, useEffect } from 'react';
import { LogOut, User, Coins, Store, Home, Menu, FileText } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { TermosCondicoes } from './TermosCondicoes';
import { ThemeToggle } from './ThemeToggle';
import { InstallPWAButton } from './InstallPWAButton';

interface StudentNavbarProps {
  studentName: string;
  bitcash?: number;
  onLogout: () => void;
  studentId?: number | string;
  setSaldo?: (saldo: number) => void;
}

const StudentNavbar = ({ studentName, bitcash = 0, onLogout, studentId, setSaldo }: StudentNavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    const verificarConexao = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/health`);
        if (response.ok) {
          setBackendOnline(true);
        }
      } catch (error) {
        // Silencioso
      }
    };
    verificarConexao();
  }, []);

  useEffect(() => {
    if (!studentId) return;

    const canal = supabase
      .channel(`estudantes-saldo-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'estudantes',
          filter: `id=eq.${Number(studentId)}`,
        },
        (payload) => {
          console.log("Chegou alteração do Realtime!", payload);
          if (payload.new && (payload.new.bitcash || payload.new.bitcash === 0)) {
            if (setSaldo) setSaldo(payload.new.bitcash);
            
            // Sync cache to prevent discrepancy
            const user = JSON.parse(localStorage.getItem('usuario') || '{}');
            user.bitcash = payload.new.bitcash;
            localStorage.setItem('usuario', JSON.stringify(user));
            
            const studentSession = JSON.parse(localStorage.getItem('bit_student_session') || '{}');
            studentSession.bitcash = payload.new.bitcash;
            localStorage.setItem('bit_student_session', JSON.stringify(studentSession));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [studentId]);

  const firstName = studentName.split(' ')[0];

  // Data no padrão brasileiro
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const whatsappUrl = `https://wa.me/5534998843601?text=${encodeURIComponent("Olá, boa tarde. estou com problema com o Uniforme Premiado, gostaria de falar com o Henry.")}`;

  return (
    <>
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
                    {bitcash} CashBIT
                  </span>
                </div>
              </div>
            </div>
            
            {/* Lado Direito: Data e Ações */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                {currentDate}
              </span>

              <div className="flex items-center mr-2">
                {backendOnline ? (
                  <div className="flex items-center gap-1.5">
                    <div className="bg-emerald-500 w-2 h-2 rounded-full" />
                    <span className="text-xs font-medium text-emerald-600">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="bg-zinc-400 w-2 h-2 rounded-full" />
                    <span className="text-xs font-medium text-zinc-500">Offline</span>
                  </div>
                )}
              </div>

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

              <InstallPWAButton variant="navbar-desktop" />

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 h-10 rounded-full bg-[#25D366] text-white hover:opacity-90 active:scale-90 transition-all duration-200 shadow-sm shrink-0 font-bold text-sm"
                title="Falar com o Henry"
              >
                <img src="/img/icon-whatsapp.png" alt="WhatsApp" className="w-5 h-5" />
                <span>WhatsApp</span>
              </a>

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
                  Uniforme Premiado
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                  Olá, {firstName}
                </span>
              </div>
            </div>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex items-center justify-center w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all duration-200 shadow-sm shrink-0"
                  aria-label="Abrir menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] h-full flex flex-col p-6 pb-24 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
                {isOpen && (
                  <>
                    <SheetHeader className="text-left border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-3">
                      <SheetTitle className="text-lg font-bold text-zinc-900 dark:text-white">Menu</SheetTitle>
                    </SheetHeader>

                    {/* Cabeçalho Compacto do Usuário e Saldo no Menu Mobile */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                      <div className="w-11 h-11 rounded-full bg-school-blue-500/20 border border-school-blue-500/30 flex items-center justify-center shrink-0 shadow-sm">
                        <User className="w-6 h-6 text-school-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate" title={studentName}>
                          {studentName}
                        </h3>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Aluno(a)</p>
                        
                        {/* Saldo de CashBIT como pílula compacta */}
                        <div className="inline-flex items-center gap-1.5 mt-1 bg-amber-500/10 text-amber-500 font-bold px-3 py-1.5 rounded-lg text-xs border border-amber-500/20">
                          <Coins className="w-3.5 h-3.5" />
                          <span>{bitcash} CashBIT</span>
                        </div>
                      </div>
                    </div>

                    {/* Ações de Navegação */}
                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
                      <Link
                        to="/"
                        className="flex items-center gap-3 w-full h-11 py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium transition-colors border border-zinc-200/50 dark:border-zinc-700/50"
                      >
                        <Home className="w-5 h-5 text-zinc-500" />
                        Página Principal
                      </Link>

                      <Link
                        to="/vitrine"
                        className="flex items-center gap-3 w-full h-11 py-2 px-3 rounded-lg bg-school-blue-500/10 text-school-blue-700 dark:text-school-blue-400 hover:bg-school-blue-500/20 font-medium transition-colors border border-school-blue-500/20"
                      >
                        <Store className="w-5 h-5 text-school-blue-500" />
                        Loja de Prêmios
                      </Link>

                      <InstallPWAButton variant="navbar-mobile" />

                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 w-full h-11 py-2 px-3 rounded-lg bg-[#25D366] text-white hover:opacity-90 font-bold transition-all border border-[#25D366]/20 shadow-sm"
                      >
                        <img src="/img/icon-whatsapp.png" alt="WhatsApp" className="w-5 h-5" />
                        <span>Suporte WhatsApp</span>
                      </a>
                      
                      <TermosCondicoes>
                        <button
                          className="flex items-center gap-3 w-full h-11 py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium transition-colors border border-zinc-200/50 dark:border-zinc-700/50"
                        >
                          <FileText className="w-5 h-5 text-zinc-500" />
                          Termos e Condições
                        </button>
                      </TermosCondicoes>
                    </div>

                    {/* Botão Sair */}
                    <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-4">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Alternar Tema:</span>
                        <ThemeToggle />
                      </div>
                      <button
                        onClick={onLogout}
                        className="flex items-center justify-center gap-2 w-full h-11 py-2 px-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 font-bold transition-all border border-red-500/20"
                      >
                        <LogOut className="w-5 h-5" />
                        Sair da Aplicação
                      </button>

                      <div className="flex justify-center items-center py-1">
                        {backendOnline ? (
                          <div className="flex items-center gap-1.5">
                            <div className="bg-emerald-500 w-2 h-2 rounded-full" />
                            <span className="text-xs font-medium text-emerald-600">Online</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="bg-zinc-400 w-2 h-2 rounded-full" />
                            <span className="text-xs font-medium text-zinc-500">Offline</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </>
  );
};

export default StudentNavbar;
