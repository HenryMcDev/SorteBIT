import React, { useState, useEffect } from 'react';
import { useLocation, NavLink, Link, useNavigate, Navigate } from 'react-router-dom';
import { useAdmAuth } from '@/hooks/useAdmAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Outlet } from 'react-router-dom';
import { Users, Key, ShieldCheck, Gift, Sliders, Bell, Crown, LogOut, Loader2, MessageSquareWarning, ShoppingBag, ClipboardList, GraduationCap, Activity } from 'lucide-react';
import Admin from './Admin';
import HeaderAdministrativo from '@/components/HeaderAdministrativo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const AdminLayout = () => {
  const { adminUser, isAdmin, isLoading, logout } = useAdmAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [backendOnline, setBackendOnline] = useState(false);
  const [resgatesNaoLidosCount, setResgatesNaoLidosCount] = useState(0);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const { toast } = useToast();

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

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await (supabase as any)
        .from('resgates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');
      
      if (!error && count !== null) {
        setResgatesNaoLidosCount(count);
      }
    } catch (err) {
      console.error('Erro ao carregar contagem de resgates pendentes:', err);
    }
  };

  // Busca contagem inicial de resgates pendentes
  useEffect(() => {
    if (isAdmin) {
      fetchPendingCount();
    }
  }, [isAdmin]);

  // Efeito para escutar novos resgates no Supabase Realtime
  useEffect(() => {
    if (!isAdmin) return;

    // Inicia escuta Realtime
    const canal = (supabase as any)
      .channel('admin-resgates-global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'resgates' },
        async (payload: any) => {
          console.log('Novo resgate detectado em tempo real (global):', payload);
          
          // Incrementar contador
          setResgatesNaoLidosCount(prev => prev + 1);

          // Buscar nomes para notificação nativa do SO
          let alunoNome = 'Um aluno';
          let produtoNome = 'um prêmio';

          try {
            const { data: estData } = await (supabase as any)
              .from('estudantes')
              .select('nome_completo')
              .eq('id', payload.new.estudante_id)
              .maybeSingle();
            if (estData?.nome_completo) alunoNome = estData.nome_completo;
          } catch (err) {
            console.error('Erro ao obter estudante:', err);
          }

          try {
            const { data: premData } = await (supabase as any)
              .from('premios')
              .select('nome')
              .eq('id', payload.new.premio_id)
              .maybeSingle();
            if (premData?.nome) produtoNome = premData.nome;
          } catch (err) {
            console.error('Erro ao obter prêmio:', err);
          }

          // Disparar notificação nativa se permitido
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('🎁 Novo Resgate no SorteBIT!', {
              body: `${alunoNome} solicitou o prêmio "${produtoNome}".`,
              icon: '/favicon.ico',
              tag: 'novo-resgate-' + payload.new.id,
              requireInteraction: true
            });

            notification.onclick = () => {
              window.focus();
              navigate('/admin/resgates');
            };
          }

          // Disparar evento para componentes filhos (ex: AdminResgates)
          window.dispatchEvent(new CustomEvent('admin-resgates-changed', { detail: payload }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'resgates' },
        async (payload: any) => {
          console.log('Resgate atualizado (global):', payload);
          await fetchPendingCount();
          window.dispatchEvent(new CustomEvent('admin-resgates-changed', { detail: payload }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'resgates' },
        async (payload: any) => {
          console.log('Resgate deletado (global):', payload);
          await fetchPendingCount();
          window.dispatchEvent(new CustomEvent('admin-resgates-changed', { detail: payload }));
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(canal);
    };
  }, [isAdmin, navigate]);

  // Efeito para controlar o título da aba com o número de notificações
  useEffect(() => {
    if (resgatesNaoLidosCount > 0) {
      document.title = `(${resgatesNaoLidosCount}) Uniforme Premiado - Painel Admin`;
    } else {
      document.title = 'Uniforme Premiado - Painel Admin';
    }

    return () => {
      document.title = 'Uniforme Premiado';
    };
  }, [resgatesNaoLidosCount]);

  // Efeito para verificar status da permissão de notificações Desktop
  useEffect(() => {
    if ('Notification' in window) {
      setShowPermissionBanner(Notification.permission === 'default');
    }
  }, []);

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setShowPermissionBanner(permission === 'default');
      if (permission === 'granted') {
        toast({
          title: 'Notificações ativadas!',
          description: 'Você receberá alertas nativos sobre novos resgates no seu computador.',
        });
      }
    }
  };

  // Lógica global para desativar inspeção e atalhos de depuração na área administrativa
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Tecla F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return;
      }

      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl) {
        // 5. Ctrl + U (Código-fonte)
        if (e.key?.toLowerCase() === 'u' || e.keyCode === 85) {
          e.preventDefault();
          return;
        }

        if (e.shiftKey) {
          const key = e.key?.toLowerCase();
          // 2. Ctrl+Shift+I, 3. Ctrl+Shift+J, 4. Ctrl+Shift+C
          if (
            key === 'i' || key === 'j' || key === 'c' ||
            e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67
          ) {
            e.preventDefault();
            return;
          }
        }
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Rotina contínua de anti-debugging para congelar a aba caso o DevTools seja aberto
  useEffect(() => {
    const startAntiDebug = () => {
      const debugFn = () => {
        try {
          (function() {
            (function a() {
              debugger;
            })();
          })();
        } catch (err) {}
      };
      
      const interval = setInterval(debugFn, 100);
      return interval;
    };

    const intervalId = startAntiDebug();

    return () => {
      clearInterval(intervalId);
    };
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

  // Proteção de Rota (Guarded Route) para Logs de Auditoria
  const isLogsRoute = location.pathname.endsWith('/logs');
  const hasLogsAccess = adminUser?.email?.toLowerCase() === 'henrymc.bit@gmail.com' || adminUser?.email?.toLowerCase() === 'marinabitaraxa@gmail.com';
  
  if (isLogsRoute && !hasLogsAccess) {
    return <Navigate to="/admin/participantes" replace />;
  }

  // Map route path to page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.endsWith('/participantes')) return 'Participantes';
    if (path.endsWith('/professores')) return 'Professores';
    if (path.endsWith('/codigos')) return 'Códigos';
    if (path.endsWith('/moderacao')) return 'Moderação';
    if (path.endsWith('/premios')) return 'Cadastro de Prêmios';
    if (path.endsWith('/ips')) return 'Gerenciar IPs';
    if (path.endsWith('/notificacoes')) return 'Notificações';
    if (path.endsWith('/resgates')) return 'Gestão de Resgates';
    if (path.endsWith('/logs')) return 'Logs de Auditoria';
    if (path.endsWith('/n8n')) return 'Monitoramento n8n';
    return 'Painel Master';
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-zinc-900 dark:bg-zinc-950 dark:text-white font-sans selection:bg-yellow-500/35">
      {/* Sidebar Esquerda Fixa */}
      <aside className="w-64 h-screen sticky top-0 flex flex-col justify-between bg-white dark:bg-[#131517] text-slate-500 dark:text-slate-400 p-4 border-r border-slate-200 dark:border-slate-800 shrink-0 transition-colors duration-200">
        
        {/* Topo: Logo e Identificação do Painel */}
        <div>
          <div className="flex items-center gap-3 px-2 py-4 border-b border-slate-200 dark:border-slate-800/60 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-slate-800 dark:text-white uppercase">Uniforme Premiado</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Painel Master</p>
            </div>
          </div>

          {/* Links de Navegação Padrão */}
          <nav className="space-y-1.5">
            {[
              { id: 'participantes', nome: 'Participantes', icone: Users, path: '/admin/participantes' },
              { id: 'professores', nome: 'Professores', icone: GraduationCap, path: '/admin/professores' },
              { id: 'codigos', nome: 'Códigos', icone: Key, path: '/admin/codigos' },
              { id: 'moderacao', nome: 'Moderação', icone: ShieldCheck, path: '/admin/moderacao' },
              { id: 'premios', nome: 'Cadastro de Prêmios', icone: Gift, path: '/admin/premios' },
              { id: 'resgates', nome: 'Gestão de Resgates', icone: ShoppingBag, path: '/admin/resgates' },
              { id: 'ips', nome: 'Gerenciar IPs', icone: Sliders, path: '/admin/ips' },
              { id: 'notificacoes', nome: 'Notificações', icone: Bell, path: '/admin/notificacoes' },
              { id: 'n8n', nome: 'Monitoramento n8n', icone: Activity, path: '/admin/n8n' },
              { id: 'logs', nome: 'Logs de Auditoria', icone: ClipboardList, path: '/admin/logs' },
            ].filter((item) => {
              if (item.id === 'logs') {
                return hasLogsAccess;
              }
              return true;
            }).map((item) => {
              const IconeComponente = item.icone;
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-150 ${
                    isActive 
                      ? 'bg-slate-100 text-slate-900 font-semibold dark:bg-[#202225] dark:text-white' 
                      : 'hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-[#1a1c1e] dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconeComponente className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-500' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{item.nome}</span>
                  </div>
                  {item.id === 'resgates' && resgatesNaoLidosCount > 0 && (
                    <span className="bg-red-500 text-white font-bold rounded-full px-2 py-0.5 text-[10px] min-w-5 h-5 flex items-center justify-center animate-pulse">
                      {resgatesNaoLidosCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Divisor Inferior antes dos botões de Destaque */}
          <div className="border-t border-slate-200 dark:border-slate-800/60 my-6"></div>

          {/* Botão Sorteio Jackpot Modificado (Bordas Amarelas) */}
          <Link
            to="/admin/jackpot"
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl border transition-all duration-150 ${
              location.pathname === '/admin/jackpot'
                ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold shadow-sm shadow-amber-500/5'
                : 'border-amber-500/40 text-amber-600 dark:text-amber-500/90 hover:border-amber-500 hover:bg-amber-500/5 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
          >
            <Crown className="w-5 h-5 text-amber-500" />
            Sorteio
          </Link>
        </div>

        {/* Rodapé: Controle de Tema, Usuário e Logout */}
        <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800/40">
          
          {/* Switch de Tema Simplificado */}
          <div className="flex items-center justify-between px-2 text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            <span>Tema</span>
            <ThemeToggle />
          </div>

          {/* Identificação do Usuário e Botão Logout */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-[#1a1c1e] p-3 rounded-xl border border-slate-200 dark:border-slate-800/40">
            <div className="flex flex-col truncate pr-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Usuário</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-300 truncate">
                {adminUser?.name || 'Administrador'}
              </span>
              {backendOnline ? (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 animate-pulse"></span>
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"></span>
                  Offline
                </span>
              )}
            </div>
            
            <button 
              onClick={logout}
              title="Sair do Sistema"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-all duration-150 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </aside>

      {/* Área de Conteúdo Dinâmico */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra Superior */}
        <HeaderAdministrativo abaAtivaNome={getPageTitle()} />

        {/* Conteúdo Principal */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50 text-zinc-900 dark:bg-zinc-950 dark:text-white">
          {showPermissionBanner && (
            <div className="p-4 border border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in mb-6">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-sm font-medium">
                  Ative as notificações para receber alertas de novos resgates no seu computador.
                </span>
              </div>
              <Button 
                onClick={handleRequestPermission}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs h-9 px-4 shrink-0 shadow-sm"
              >
                Ativar Notificações
              </Button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
