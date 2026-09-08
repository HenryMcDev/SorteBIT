import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, Loader2, RefreshCw, CheckCircle, 
  XCircle, AlertCircle, Clock, Search, Bell, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Estudante {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string;
}

interface Premio {
  id: string;
  nome: string;
}

interface Resgate {
  id: string;
  cashbit_gasto: number;
  status: 'pendente' | 'entregue' | 'cancelado';
  created_at: string;
  estudante: Estudante | null;
  premio: Premio | null;
}

interface Notificacao {
  id: string;
  mensagem: string;
  created_at: string;
  lida: boolean;
}

export default function AdminResgates() {
  const [resgates, setResgates] = useState<Resgate[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'todos';
  const statusFilter = ['todos', 'pendente', 'entregue', 'cancelado'].includes(tabParam)
    ? (tabParam as 'todos' | 'pendente' | 'entregue' | 'cancelado')
    : 'todos';

  const setStatusFilter = (filter: 'todos' | 'pendente' | 'entregue' | 'cancelado') => {
    setSearchParams({ tab: filter }, { replace: true });
  };

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'entregar' | 'cancelar' | null>(null);
  const [selectedResgate, setSelectedResgate] = useState<Resgate | null>(null);

  const { toast } = useToast();

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // 1. Buscar resgates
      const { data: resgatesData, error: resgatesError } = await (supabase as any)
        .from('resgates')
        .select(`
          id,
          cashbit_gasto,
          status,
          created_at,
          estudante:estudante_id (
            id,
            nome_completo,
            cpf,
            email
          ),
          premio:premio_id (
            id,
            nome
          )
        `)
        .order('created_at', { ascending: false });

      if (resgatesError) throw resgatesError;
      setResgates(resgatesData as any || []);

      // 2. Buscar notificações não lidas
      const { data: notifData, error: notifError } = await (supabase as any)
        .from('notificacoes_resgates')
        .select('*')
        .eq('lida', false)
        .order('created_at', { ascending: false });

      if (notifError) throw notifError;
      setNotificacoes(notifData as any || []);

    } catch (error: any) {
      console.error('Erro ao carregar dados de resgates:', error);
      if (!silent) {
        toast({
          title: 'Erro de conexão',
          description: error.message || 'Não foi possível carregar as informações do banco de dados.',
          variant: 'destructive',
        });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Efeito para carregar dados e escutar alterações em tempo real no Supabase
  // Efeito para carregar dados e escutar o evento global de alteração de resgates
  useEffect(() => {
    fetchData();

    const handleGlobalResgatesChange = () => {
      fetchData(true);
    };

    window.addEventListener('admin-resgates-changed', handleGlobalResgatesChange);

    return () => {
      window.removeEventListener('admin-resgates-changed', handleGlobalResgatesChange);
    };
  }, []);

  const triggerConfirmarEntrega = (resgate: Resgate) => {
    setSelectedResgate(resgate);
    setConfirmAction('entregar');
    setConfirmModalOpen(true);
  };

  const triggerCancelarResgate = (resgate: Resgate) => {
    setSelectedResgate(resgate);
    setConfirmAction('cancelar');
    setConfirmModalOpen(true);
  };

  const executeConfirmAction = async () => {
    if (!selectedResgate || !confirmAction) return;
    
    const id = selectedResgate.id;
    setConfirmModalOpen(false);
    setActionLoadingId(id);
    
    try {
      if (confirmAction === 'entregar') {
        const { error } = await (supabase as any).rpc('confirmar_entrega', {
          p_resgate_id: parseInt(id, 10)
        });

        if (error) throw error;

        toast({
          title: 'Sucesso!',
          description: 'Entrega do prêmio confirmada.',
        });
      } else if (confirmAction === 'cancelar') {
        const { error } = await (supabase as any).rpc('cancelar_resgate', {
          p_resgate_id: parseInt(id, 10)
        });

        if (error) throw error;

        toast({
          title: 'Resgate Cancelado',
          description: 'O saldo foi estornado e o estoque atualizado com sucesso.',
          variant: 'destructive',
        });
      }
      fetchData(true);
    } catch (error: any) {
      console.error(`Erro ao executar ação de ${confirmAction}:`, error);
      toast({
        title: 'Erro na operação',
        description: error.message || 'Não foi possível processar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
      setSelectedResgate(null);
      setConfirmAction(null);
    }
  };

  const handleMarcarLidas = async () => {
    if (notificacoes.length === 0) return;
    try {
      const { error } = await (supabase as any)
        .from('notificacoes_resgates')
        .update({ lida: true })
        .in('id', notificacoes.map(n => n.id));

      if (error) throw error;

      setNotificacoes([]);
      toast({
        title: 'Notificações limpas',
        description: 'Todas as notificações foram marcadas como lidas.',
      });
    } catch (error: any) {
      console.error('Erro ao limpar notificações:', error);
      toast({
        title: 'Erro ao marcar como lidas',
        description: error.message || 'Não foi possível atualizar as notificações.',
        variant: 'destructive',
      });
    }
  };

  // Filtragem local
  const filteredResgates = resgates.filter(resgate => {
    const matchesStatus = statusFilter === 'todos' || resgate.status === statusFilter;
    
    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesStatus;

    const matchesName = resgate.estudante?.nome_completo?.toLowerCase().includes(term);
    const matchesCpf = resgate.estudante?.cpf?.replace(/\D/g, '').includes(term.replace(/\D/g, ''));
    const matchesPremio = resgate.premio?.nome?.toLowerCase().includes(term);

    return matchesStatus && (matchesName || matchesCpf || matchesPremio);
  });

  return (
    <div className="space-y-6">


      {/* 1. Painel de Notificações de Resgates */}
      {notificacoes.length > 0 && (
        <Card className="p-4 border-l-4 border-amber-500 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm rounded-xl">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
              <Bell className="w-5 h-5 animate-bounce" />
              <span>Notificações de Novos Resgates ({notificacoes.length})</span>
            </div>
            <Button 
              onClick={handleMarcarLidas} 
              variant="outline" 
              size="sm"
              className="h-8 border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              <Check className="w-4 h-4 mr-1" /> Marcar todas como lidas
            </Button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
            {notificacoes.map((notif) => (
              <div key={notif.id} className="flex justify-between items-center text-xs bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-2.5 rounded-lg shadow-xs">
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">{notif.mensagem}</span>
                <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">
                  {new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. Listagem de Resgates */}
      <Card className="flex flex-col shadow-xl border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden">
        {/* Header Fixo */}
        <div className="flex-none p-6 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Gerenciamento de Resgates</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  Monitore e controle a entrega e o cancelamento de prêmios resgatados pelos alunos.
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => fetchData(false)}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por aluno, CPF ou prêmio..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['todos', 'pendente', 'entregue', 'cancelado'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`h-10 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                    statusFilter === filter
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {filter === 'todos' ? 'Todos' : filter === 'pendente' ? 'Pendentes' : filter === 'entregue' ? 'Entregues' : 'Cancelados'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Carregando solicitações...</p>
            </div>
          ) : filteredResgates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 text-center px-4">
              <AlertCircle className="w-12 h-12 text-zinc-400 dark:text-zinc-600" />
              <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Nenhum resgate encontrado</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs">
                Tente alterar os filtros de status ou a palavra de busca.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 bg-zinc-50/55 dark:bg-zinc-900/30">
                  <th className="py-4 px-6">Aluno</th>
                  <th className="py-4 px-6">Prêmio</th>
                  <th className="py-4 px-6 text-center">Custo</th>
                  <th className="py-4 px-6">Solicitado em</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredResgates.map((resgate) => (
                  <tr key={resgate.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 text-sm text-zinc-700 dark:text-zinc-300 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-zinc-950 dark:text-white">
                        {resgate.estudante?.nome_completo || 'Aluno Desconhecido'}
                      </div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
                        CPF: {resgate.estudante?.cpf || 'Não Informado'}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-zinc-900 dark:text-zinc-100">
                      {resgate.premio?.nome || 'Prêmio Excluído'}
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                      🪙 {resgate.cashbit_gasto}
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(resgate.created_at).toLocaleDateString('pt-BR')} {' '}
                      <span className="text-zinc-400 dark:text-zinc-600">
                        {new Date(resgate.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        resgate.status === 'entregue'
                          ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400'
                          : resgate.status === 'cancelado'
                          ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {resgate.status === 'pendente' && <Clock className="w-3.5 h-3.5" />}
                        {resgate.status === 'entregue' && <CheckCircle className="w-3.5 h-3.5" />}
                        {resgate.status === 'cancelado' && <XCircle className="w-3.5 h-3.5" />}
                        {resgate.status === 'pendente' ? 'Pendente' : resgate.status === 'entregue' ? 'Entregue' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {resgate.status === 'pendente' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => triggerConfirmarEntrega(resgate)}
                            disabled={actionLoadingId === resgate.id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm"
                          >
                            {actionLoadingId === resgate.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Confirmar Entrega'
                            )}
                          </Button>
                          <Button
                            onClick={() => triggerCancelarResgate(resgate)}
                            disabled={actionLoadingId === resgate.id}
                            size="sm"
                            variant="destructive"
                            className="font-bold rounded-lg shadow-sm"
                          >
                            {actionLoadingId === resgate.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Cancelar'
                            )}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal de Confirmação Customizado */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl p-6 shadow-xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white">
              {confirmAction === 'entregar' ? '🎁 Confirmar Entrega' : '⚠️ Cancelar Resgate'}
            </DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
              {confirmAction === 'entregar' ? (
                <>
                  Deseja confirmar a entrega física do prêmio <strong className="text-zinc-900 dark:text-white">"{selectedResgate?.premio?.nome}"</strong> para o aluno <strong className="text-zinc-900 dark:text-white">{selectedResgate?.estudante?.nome_completo}</strong>?
                </>
              ) : (
                <>
                  Tem certeza que deseja cancelar o resgate do prêmio <strong className="text-zinc-900 dark:text-white">"{selectedResgate?.premio?.nome}"</strong> feito por <strong className="text-zinc-900 dark:text-white">{selectedResgate?.estudante?.nome_completo}</strong>? 
                  <br />
                  <span className="text-red-500 font-semibold mt-2 block">
                    Esta ação irá estornar o saldo de 🪙 {selectedResgate?.cashbit_gasto} CashBITs para o estudante e devolver o item ao estoque.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-6 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              className="w-full sm:w-auto rounded-xl font-medium border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 dark:text-zinc-300"
            >
              Voltar
            </Button>
            <Button
              onClick={executeConfirmAction}
              className={`w-full sm:w-auto rounded-xl font-bold text-white shadow-md ${
                confirmAction === 'entregar'
                  ? 'bg-green-600 hover:bg-green-700 shadow-green-600/10'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-600/10'
              }`}
            >
              {confirmAction === 'entregar' ? 'Confirmar Entrega' : 'Cancelar Resgate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
