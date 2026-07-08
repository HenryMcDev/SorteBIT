import React, { useState, useEffect } from 'react';
import { useLocation, NavLink, Link } from 'react-router-dom';
import { useAdmAuth } from '@/hooks/useAdmAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Outlet } from 'react-router-dom';
import { Users, Crown, MessageSquareWarning, Gift, ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import Admin from './Admin';

const AdminLayout = () => {
  const { adminUser, isAdmin, isLoading, logout } = useAdmAuth();
  const location = useLocation();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        <p className="text-zinc-400 text-sm font-medium animate-pulse">Verificando credenciais...</p>
      </div>
    );
  }

  // If not logged in, render the login/auth flow
  if (!isAdmin) {
    return <Admin />;
  }

  // Map route path to page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.endsWith('/participantes')) return 'Participantes';
    if (path.endsWith('/codigos')) return 'Códigos';
    if (path.endsWith('/moderacao')) return 'Moderação';
    if (path.endsWith('/premios')) return 'Cadastro de Prêmios';
    if (path.endsWith('/ips')) return 'Gerenciar IPs';
    return 'Painel Master';
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white font-sans selection:bg-yellow-500/35">
      {/* Sidebar Esquerda Fixa */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Nome do Sistema */}
          <div className="flex items-center gap-3 pb-6 border-b border-zinc-800">
            <div className="bg-school-blue-600 rounded-lg p-2">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm leading-none text-white tracking-wide uppercase font-sans">SorteBIT</h2>
              <span className="text-[10px] text-zinc-500">Painel Master</span>
            </div>
          </div>

          {/* Links de navegação */}
          <nav className="flex flex-col gap-2 mt-8">
            <NavLink
              to="/admin/participantes"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left w-full ${
                  isActive
                    ? 'text-white bg-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`
              }
            >
              <Users className="w-4 h-4" />
              Participantes
            </NavLink>

            <NavLink
              to="/admin/codigos"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left w-full ${
                  isActive
                    ? 'text-white bg-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`
              }
            >
              <Crown className="w-4 h-4" />
              Códigos
            </NavLink>

            <NavLink
              to="/admin/moderacao"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left w-full ${
                  isActive
                    ? 'text-white bg-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`
              }
            >
              <MessageSquareWarning className="w-4 h-4" />
              Moderação
            </NavLink>

            <NavLink
              to="/admin/premios"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left w-full ${
                  isActive
                    ? 'text-white bg-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`
              }
            >
              <Gift className="w-4 h-4" />
              Cadastro de Prêmios
            </NavLink>

            <NavLink
              to="/admin/ips"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left w-full ${
                  isActive
                    ? 'text-white bg-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`
              }
            >
              <ShieldCheck className="w-4 h-4" />
              Gerenciar IPs
            </NavLink>
          </nav>
        </div>

        {/* Rodapé da Sidebar: Status do Servidor */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-zinc-500 font-semibold">TEMA</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-2 px-1">
            {backendOnline ? (
              <div className="flex items-center gap-1.5">
                <div className="bg-emerald-500 w-2 h-2 rounded-full" />
                <span className="text-xs font-semibold text-zinc-400">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="bg-zinc-400 w-2 h-2 rounded-full" />
                <span className="text-xs font-semibold text-zinc-400">Offline</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Área de Conteúdo Dinâmico */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra Superior */}
        <header className="h-16 border-b border-zinc-800 px-8 flex items-center justify-between bg-zinc-950 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-white uppercase tracking-wider">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/admin/jackpot"
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/10 active:scale-95"
            >
              <Crown className="w-4 h-4" />
              Sorteio Jackpot
            </Link>

            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <span>{adminUser?.name || 'Administrador'}</span>
              <button
                onClick={logout}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-90 transition-all duration-200"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 p-8 overflow-y-auto bg-zinc-950 text-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
