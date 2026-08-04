import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getBackendUrl } from '@/utils/backendUrl';
import { 
  Users, 
  RefreshCw, 
  Search, 
  Mail, 
  Calendar,
  GraduationCap
} from 'lucide-react';
import axios from 'axios';

interface Professor {
  id: string;
  nome: string;
  email: string;
  created_at: string;
}

export default function AdminProfessores() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // State para Gestão de Turmas
  const [turmasList, setTurmasList] = useState<{ id?: string; code: string }[]>([
    { code: 'TCG01' },
    { code: 'TCG02' },
    { code: 'TCG03' }
  ]);
  const [newTurmaCode, setNewTurmaCode] = useState('');
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(false);
  const [isRegisteringTurma, setIsRegisteringTurma] = useState(false);

  const fetchTurmasAdmin = async () => {
    setIsLoadingTurmas(true);
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
    try {
      const formatted = newTurmaCode.trim().toUpperCase();
      const response = await axios.post(`${getBackendUrl()}/api/turmas`, { code: formatted });
      if (response.data?.sucesso) {
        toast({
          title: 'Turma criada!',
          description: `A turma "${formatted}" foi cadastrada com sucesso.`,
        });
        setNewTurmaCode('');
        fetchTurmasAdmin();
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
      {/* Overview & Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-400">Total de Professores</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{professores.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
            <GraduationCap className="w-6 h-6" />
          </div>
        </Card>

        {/* Cadastro e Gestão de Turmas */}
        <Card className="p-6 md:col-span-2 bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
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

          {/* List of Registered Turmas */}
          <div className="flex flex-wrap gap-2 pt-1">
            {turmasList.map((t) => (
              <span
                key={t.id || t.code}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50"
              >
                Turma: {t.code}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-6 bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Search Box */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar professor por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
            />
          </div>

          <Button
            onClick={() => fetchProfessores()}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2 border-slate-200 dark:border-slate-800 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-all"
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
    </div>
  );
}
