import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getBackendUrl } from '@/utils/backendUrl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Users, 
  RefreshCw, 
  Search, 
  Mail, 
  Calendar,
  GraduationCap,
  Copy,
  Trash2,
  Power
} from 'lucide-react';
import axios from 'axios';

interface Professor {
  id: string;
  nome: string;
  email: string;
  created_at: string;
}

interface TurmaItem {
  id?: string;
  code?: string;
  codigo_turma?: string;
  nome?: string;
  ativo?: boolean;
  created_at?: string;
  criado_em?: string;
}

export default function AdminProfessores() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // State para Gestão de Turmas do Supabase
  const [turmasList, setTurmasList] = useState<TurmaItem[]>([]);
  const [newTurmaCode, setNewTurmaCode] = useState('');
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(false);
  const [isRegisteringTurma, setIsRegisteringTurma] = useState(false);
  const [turmaSearchTerm, setTurmaSearchTerm] = useState('');
  const [turmaToDelete, setTurmaToDelete] = useState<{ id: string; code: string } | null>(null);

  const handleCopyTurmaCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Código copiado!',
      description: `O código da turma "${code}" foi copiado para a área de transferência.`,
    });
  };

  const handleToggleTurmaStatus = async (id: string, currentAtivo: boolean, code: string) => {
    try {
      const { error } = await supabase
        .from('turmas' as any)
        .update({ ativo: !currentAtivo })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: `A turma "${code}" foi ${!currentAtivo ? 'ativada' : 'desativada'} com sucesso.`,
      });
      await fetchTurmasAdmin();
    } catch (err: any) {
      console.error('Erro ao atualizar status da turma:', err);
      toast({
        title: 'Erro ao atualizar',
        description: err.message || 'Não foi possível alterar o status da turma.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTurma = (id: string, code: string) => {
    setTurmaToDelete({ id, code });
  };

  const handleConfirmDeleteTurma = async () => {
    if (!turmaToDelete) return;
    const { id, code } = turmaToDelete;

    try {
      const { error } = await supabase
        .from('turmas' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Turma excluída!',
        description: `A turma "${code}" foi removida com sucesso.`,
      });
      await fetchTurmasAdmin();
    } catch (err: any) {
      console.error('Erro ao excluir turma:', err);
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Não foi possível remover a turma.',
        variant: 'destructive'
      });
    } finally {
      setTurmaToDelete(null);
    }
  };

  const filteredTurmas = turmasList.filter(t => {
    const code = t.codigo_turma || t.code || '';
    return code.toLowerCase().includes(turmaSearchTerm.toLowerCase());
  });

  // Buscar turmas no Supabase (com fallback via API backend)
  const fetchTurmasAdmin = async () => {
    setIsLoadingTurmas(true);
    try {
      // 1. Tentar consultar diretamente o Supabase
      const { data, error } = await supabase
        .from('turmas' as any)
        .select('*');

      if (!error && Array.isArray(data)) {
        setTurmasList(data as any as TurmaItem[]);
        setIsLoadingTurmas(false);
        return;
      }
    } catch (err) {
      console.warn('Erro ao buscar turmas no Supabase, tentando backend API:', err);
    }

    // 2. Fallback via backend API
    try {
      const response = await axios.get(`${getBackendUrl()}/api/turmas`);
      if (response.data?.sucesso && Array.isArray(response.data.turmas)) {
        setTurmasList(response.data.turmas);
      }
    } catch (err) {
      console.error('Erro ao buscar turmas:', err);
    } finally {
      setIsLoadingTurmas(false);
    }
  };

  const handleRegisterTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTurmaCode.trim()) return;

    setIsRegisteringTurma(true);
    const formatted = newTurmaCode.trim().toUpperCase();
    try {
      // 1. Tentar inserção direta no Supabase
      const { data, error } = await supabase
        .from('turmas' as any)
        .insert({
          code: formatted,
          codigo_turma: formatted,
          ativo: true
        })
        .select()
        .maybeSingle();

      if (!error) {
        toast({
          title: 'Turma criada!',
          description: `A turma "${formatted}" foi cadastrada com sucesso no Supabase.`,
        });
        setNewTurmaCode('');
        await fetchTurmasAdmin();
        return;
      }
    } catch (err) {
      console.warn('Erro ao inserir diretamente no Supabase, usando API:', err);
    }

    // 2. Fallback via backend API
    try {
      const response = await axios.post(`${getBackendUrl()}/api/turmas`, { code: formatted });
      if (response.data?.sucesso) {
        toast({
          title: 'Turma criada!',
          description: `A turma "${formatted}" foi cadastrada com sucesso.`,
        });
        setNewTurmaCode('');
        await fetchTurmasAdmin();
      } else {
        toast({
          title: 'Erro',
          description: response.data?.erro || 'Erro ao cadastrar turma.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.erro || 'Erro ao comunicar com o servidor.',
        variant: 'destructive'
      });
    } finally {
      setIsRegisteringTurma(false);
    }
  };

  const fetchProfessores = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await axios.get(`${getBackendUrl()}/api/admin/professores`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data?.sucesso) {
        setProfessores(response.data.professores || []);
      } else {
        throw new Error(response.data?.erro || 'Erro ao carregar professores.');
      }
    } catch (error: any) {
      console.error('Erro ao buscar professores:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.response?.data?.erro || error.message || 'Falha ao buscar a lista de professores no banco de dados.',
        variant: 'destructive'
      });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessores();
    fetchTurmasAdmin();
  }, []);

  const filteredProfessores = professores.filter(prof => 
    prof.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Cadastro e Gestão de Turmas (Largura Total) */}
      <Card className="w-full p-6 bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Gestão de Turmas (Daily Codes)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cadastre novas turmas para utilização na geração de códigos diários.</p>
          </div>
          <Button
            onClick={fetchTurmasAdmin}
            variant="outline"
            size="sm"
            className="h-8 text-xs border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingTurmas ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <form onSubmit={handleRegisterTurma} className="flex gap-2">
          <input
            type="text"
            placeholder="Digite o código da turma (ex: TCG04)"
            value={newTurmaCode}
            onChange={(e) => setNewTurmaCode(e.target.value)}
            className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase font-semibold tracking-wider text-slate-900 dark:text-white"
          />
          <Button
            type="submit"
            disabled={isRegisteringTurma || !newTurmaCode.trim()}
            className="h-10 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl"
          >
            {isRegisteringTurma ? 'Cadastrando...' : '+ Cadastrar Turma'}
          </Button>
        </form>

        {/* Header de Controle das Turmas */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar turma pelo código..."
              value={turmaSearchTerm}
              onChange={(e) => setTurmaSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="text-xs text-slate-450 dark:text-slate-400 font-bold uppercase tracking-wider">
            Turmas Cadastradas ({filteredTurmas.length})
          </span>
        </div>

        {/* Grid Responsivo de Cards com Rolagem */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-1">
          {filteredTurmas.map((t, idx) => {
            const codeDisplay = t.codigo_turma || t.code || `Turma ${idx + 1}`;
            const dateDisplay = (t.created_at || t.criado_em) 
              ? new Date(t.created_at || t.criado_em!).toLocaleDateString('pt-BR') 
              : null;
            return (
              <div 
                key={t.id || codeDisplay + idx}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-zinc-900/10 shadow-sm"
              >
                <div className="space-y-0.5 truncate mr-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white tracking-wide truncate">{codeDisplay}</span>
                  </div>
                  {dateDisplay && <p className="text-[10px] text-slate-400">Criada em: {dateDisplay}</p>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400"
                    title="Copiar Código"
                    onClick={() => handleCopyTurmaCode(codeDisplay)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-8 w-8 ${t.ativo ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}
                    title={t.ativo ? 'Desativar Turma' : 'Ativar Turma'}
                    onClick={() => handleToggleTurmaStatus(t.id!, !!t.ativo, codeDisplay)}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-red-500 dark:hover:text-red-405"
                    title="Excluir Turma"
                    onClick={() => handleDeleteTurma(t.id!, codeDisplay)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Main Table Card */}
      <Card className="p-6 bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Search Box and Counter */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar professor por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
              />
            </div>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap bg-slate-50 dark:bg-zinc-900/50 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
              Total: <strong className="text-slate-900 dark:text-white font-bold">{professores.length}</strong> professores
            </span>
          </div>

          <Button
            onClick={() => fetchProfessores()}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2 border-slate-200 dark:border-slate-800 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-all shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Teachers Table */}
        {isLoading && professores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium text-slate-400">Carregando lista de professores...</p>
          </div>
        ) : filteredProfessores.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-850">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#1a1c1e] text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-150 dark:border-slate-800">
                  <th className="py-3.5 px-4 font-semibold">Professor</th>
                  <th className="py-3.5 px-4 font-semibold">E-mail</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Data de Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-sm text-slate-700 dark:text-slate-200">
                {filteredProfessores.map((prof) => (
                  <tr key={prof.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-all">
                    <td className="py-4 px-4 font-medium flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center font-bold text-xs">
                        {prof.nome.charAt(0).toUpperCase()}
                      </div>
                      <span>{prof.nome}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-450 shrink-0" />
                        <span>{prof.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-slate-500 dark:text-slate-400 font-mono">
                      <div className="flex items-center justify-end gap-2">
                        <Calendar className="w-4 h-4 text-slate-450 shrink-0" />
                        <span>{new Date(prof.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-700 dark:text-slate-300">Nenhum professor cadastrado</h4>
              <p className="text-xs text-slate-450 max-w-xs">
                {searchTerm ? 'Nenhum professor atende aos critérios da busca.' : 'Os professores cadastrados no sistema aparecerão aqui.'}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!turmaToDelete} onOpenChange={(open) => { if (!open) setTurmaToDelete(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm mx-auto rounded-2xl p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Excluir Turma
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Tem certeza que deseja excluir a turma <strong className="text-slate-900 dark:text-white">"{turmaToDelete?.code}"</strong>? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setTurmaToDelete(null)}
              className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleConfirmDeleteTurma}
              className="text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-xl"
            >
              Excluir Turma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
