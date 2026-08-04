import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getBackendUrl } from '@/utils/backendUrl';
import { 
  LogOut, 
  RefreshCw, 
  Users, 
  Clock, 
  Copy, 
  Check, 
  ArrowRight, 
  Sparkles,
  UserCheck2,
  AlertCircle,
  ChevronDown,
  GraduationCap
} from 'lucide-react';
import axios from 'axios';

interface Student {
  name: string;
  created_at: string;
}

export default function ProfessorDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [professorName, setProfessorName] = useState('Professor');
  
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [activeTurma, setActiveTurma] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [students, setStudents] = useState<Student[]>([]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // State para turmas dinâmicas do Supabase
  const [turmas, setTurmas] = useState<{ id: string; code: string; codigo_turma?: string }[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [isCodeRevealed, setIsCodeRevealed] = useState<boolean>(false);
  const [newTurmaInput, setNewTurmaInput] = useState<string>('');
  const [isAddingTurma, setIsAddingTurma] = useState<boolean>(false);
  const [showAddTurma, setShowAddTurma] = useState<boolean>(false);

  // Load teacher name on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('school_teacher_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) {
          setProfessorName(parsed.name);
        }
      } else {
        // Redireciona se não estiver logado
        navigate('/login');
      }
    } catch (err) {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch list of active turmas dynamically from Supabase / Backend
  const fetchTurmas = async () => {
    // 1. Tentar consultar a API do backend primeiro (que usa chave service_role do Supabase)
    try {
      const response = await axios.get(getBackendUrl() + '/api/turmas');
      if (response.data?.sucesso && Array.isArray(response.data.turmas)) {
        const activeList = response.data.turmas
          .filter((t: any) => t.ativo !== false)
          .map((t: any) => {
            const code = (t.code || t.codigo_turma || t.nome || t.id || '').toString().trim().toUpperCase();
            return {
              id: t.id || code,
              code: code,
              codigo_turma: code
            };
          });
        if (activeList.length > 0) {
          setTurmas(activeList);
          return;
        }
      }
    } catch (err) {
      console.warn('Busca de turmas via backend API falhou, tentando Supabase direto:', err);
    }

    // 2. Consulta direta à tabela turmas do Supabase como fallback
    try {
      const { data, error } = await supabase
        .from('turmas' as any)
        .select('*');

      if (!error && Array.isArray(data)) {
        const activeList = data
          .filter((t: any) => t.ativo !== false)
          .map((t: any) => {
            const code = (t.codigo_turma || t.code || t.nome || t.id || '').toString().trim().toUpperCase();
            return {
              id: t.id || code,
              code: code,
              codigo_turma: code
            };
          });
        setTurmas(activeList);
      }
    } catch (err) {
      console.error('Erro ao buscar lista de turmas no Supabase:', err);
    }
  };

  // Cadastrar nova turma pelo professor
  const handleAddTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTurmaInput.trim()) return;

    setIsAddingTurma(true);
    try {
      const formatted = newTurmaInput.trim().toUpperCase();
      const response = await axios.post(getBackendUrl() + '/api/turmas', { code: formatted });
      if (response.data?.sucesso) {
        toast({
          title: 'Turma cadastrada!',
          description: `A turma ${formatted} foi criada com sucesso.`,
        });
        await fetchTurmas();
        setSelectedTurma(formatted);
        setNewTurmaInput('');
        setShowAddTurma(false);
      } else {
        toast({
          title: 'Aviso',
          description: response.data?.erro || 'Não foi possível cadastrar a turma.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.erro || 'Erro ao comunicar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingTurma(false);
    }
  };

  const [isUnsafeWindow, setIsUnsafeWindow] = useState(false);
  const [unsafeMessage, setUnsafeMessage] = useState<string | null>(null);

  // Fetch active code and check-ins
  const fetchActiveCodeData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Sessão expirada');
      }

      if (!selectedTurma) {
        if (!silent) {
          setActiveCode(null);
          setActiveTurma(null);
          setExpiresAt(null);
          setTimeLeft(0);
          setStudents([]);
        }
        return;
      }

      let teacherId: string | null = null;
      try {
        const stored = sessionStorage.getItem('school_teacher_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          teacherId = parsed.id || null;
        }
      } catch (e) {}

      if (!teacherId) {
        throw new Error('Sessão do professor não encontrada');
      }

      const response = await axios.get(
        `${getBackendUrl()}/api/professor/active-code?turma=${selectedTurma}&professorId=${teacherId}`, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data?.sucesso) {
        if (response.data.activeCode) {
          if (response.data.seguro === false) {
            setIsUnsafeWindow(true);
            setActiveCode(null);
            setUnsafeMessage(response.data.mensagem || 'O código atual expira em menos de 2 minutos. Por favor, aguarde a renovação automática para repassar aos alunos.');
          } else {
            setIsUnsafeWindow(false);
            setUnsafeMessage(null);
            setActiveCode(response.data.activeCode.code);
          }

          setExpiresAt(response.data.activeCode.expires_at);
          const exp = new Date(response.data.activeCode.expires_at).getTime();
          const diff = Math.max(0, Math.floor((exp - Date.now()) / 1000));
          setTimeLeft(diff);

          if (response.data.activeCode.turma) {
            setActiveTurma(response.data.activeCode.turma);
          }
        } else {
          setActiveCode(null);
          setActiveTurma(null);
          setExpiresAt(null);
          setTimeLeft(0);
        }
        setStudents(response.data.students || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do código ativo:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Inativar código na tabela class_codes quando o temporizador atingir 00:00
  const inactivateClassCode = async (turmaName: string, codeToInactivate?: string | null) => {
    if (!turmaName) return;
    try {
      let query = supabase
        .from('class_codes' as any)
        .update({ is_active: false })
        .eq('turma', turmaName);

      if (codeToInactivate) {
        query = query.eq('code', codeToInactivate);
      } else {
        query = query.eq('is_active', true);
      }

      await query;
    } catch (err) {
      console.warn('Erro ao inativar class_codes no Supabase:', err);
    }

    try {
      await axios.post(getBackendUrl() + '/api/codigo/inativar', {
        turma: turmaName,
        code: codeToInactivate
      });
    } catch (err) {}
  };

  // Mostrar Código e Vincular à Turma Selecionada na tabela class_codes
  const handleShowCode = async () => {
    if (!selectedTurma) {
      toast({
        title: 'Selecione uma turma',
        description: 'Você precisa selecionar obrigatoriamente a turma antes de exibir o código da aula.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast({
          title: 'Erro',
          description: 'Sessão expirada. Faça login novamente.',
          variant: 'destructive'
        });
        navigate('/login');
        return;
      }

      // Recuperar dados do professor da sessão
      let teacherId: string | null = null;
      let teacherName = professorName;
      try {
        const stored = sessionStorage.getItem('school_teacher_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          teacherId = parsed.id || null;
          teacherName = parsed.name || professorName;
        }
      } catch (e) {}

      // 1. Tentar consultar código ativo existente para a turma em class_codes no Supabase
      const agoraMs = Date.now();
      const agoraIso = new Date(agoraMs).toISOString();

      try {
        const { data: activeClassCode, error: fetchErr } = await (supabase
          .from('class_codes' as any) as any)
          .select('*')
          .eq('turma', selectedTurma)
          .eq('professor_id', teacherId)
          .eq('is_active', true)
          .gt('expires_at', agoraIso)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!fetchErr && activeClassCode && activeClassCode.code) {
          const expTime = new Date(activeClassCode.expires_at).getTime();
          const remainingSecs = Math.max(0, Math.floor((expTime - agoraMs) / 1000));

          if (remainingSecs > 0) {
            setIsUnsafeWindow(false);
            setUnsafeMessage(null);
            setActiveCode(activeClassCode.code);
            setActiveTurma(selectedTurma);
            setExpiresAt(activeClassCode.expires_at);
            setTimeLeft(remainingSecs);
            setIsCodeRevealed(true);

            toast({
              title: 'Código Ativo Carregado!',
              description: `Código ${activeClassCode.code} ativo para a turma ${selectedTurma}.`,
            });
            setIsGenerating(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Consulta direta a class_codes falhou, prosseguindo via API:', err);
      }

      // 2. Chamar endpoint backend de vinculação e geração sob demanda para class_codes
      const response = await axios.post(getBackendUrl() + '/api/codigo/vincular-turma', {
        turmaId: selectedTurma,
        professorId: teacherId,
        professorName: teacherName
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data?.sucesso) {
        const { seguro, codigo, validoAte, tempoRestanteSegundos, mensagem } = response.data;

        if (seguro === false) {
          setIsUnsafeWindow(true);
          setActiveCode(null);
          setUnsafeMessage(mensagem || 'O código atual expira em menos de 2 minutos. Por favor, aguarde a renovação automática para repassar aos alunos.');
          setTimeLeft(tempoRestanteSegundos || 0);

          toast({
            title: 'Aviso de Segurança',
            description: mensagem || 'Código prestes a expirar. Aguarde o novo ciclo de 10 minutos.',
            variant: 'destructive'
          });
        } else {
          setIsUnsafeWindow(false);
          setUnsafeMessage(null);
          setActiveCode(codigo);
          setActiveTurma(selectedTurma);
          setExpiresAt(validoAte);
          setTimeLeft(tempoRestanteSegundos || 600);
          setIsCodeRevealed(true);

          toast({
            title: 'Código Gerado com Sucesso!',
            description: `Código ${codigo} criado para a turma ${selectedTurma} (válido por 10 minutos).`,
          });
        }
      } else {
        toast({
          title: 'Erro',
          description: response.data?.erro || 'Não foi possível buscar o código.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Erro ao vincular e mostrar código:', error);
      toast({
        title: 'Erro de conexão',
        description: error.response?.data?.erro || 'Falha ao conectar com o servidor.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch turmas on mount
  useEffect(() => {
    fetchTurmas();
  }, []);

  // Poll for student check-ins every 5 seconds
  useEffect(() => {
    if (!activeCode || !selectedTurma) return;

    const interval = setInterval(() => {
      fetchActiveCodeData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeCode, selectedTurma]);

  // Realtime subscription for lottery_participations
  useEffect(() => {
    if (!activeCode) return;

    const channel = supabase
      .channel('realtime-professor-dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'lottery_participations' },
        (payload) => {
          const newParticipation = payload.new as any;
          if (newParticipation.daily_code === activeCode) {
            setStudents(prev => {
              // Evitar duplicados
              if (prev.some(s => s.name === newParticipation.name)) return prev;
              return [{ name: newParticipation.name, created_at: newParticipation.created_at }, ...prev];
            });
            toast({
              title: 'Novo check-in!',
              description: `${newParticipation.name} acabou de fazer check-in.`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCode, toast]);

  // Countdown timer logic com inativação de is_active = FALSE em 00:00
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(0);
      return;
    }

    const calculateRemaining = () => {
      const exp = new Date(expiresAt).getTime();
      return Math.max(0, Math.floor((exp - Date.now()) / 1000));
    };

    const initialDiff = calculateRemaining();
    setTimeLeft(initialDiff);

    if (initialDiff <= 0) {
      if (activeCode) {
        inactivateClassCode(selectedTurma || activeTurma || '', activeCode);
        setActiveCode(null);
        setExpiresAt(null);
        setIsCodeRevealed(false);
        toast({
          title: 'Código Expirado',
          description: 'O código de 10 minutos para a turma expirou (is_active = false).',
          variant: 'destructive'
        });
      }
      return;
    }

    const timer = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        inactivateClassCode(selectedTurma || activeTurma || '', activeCode);
        setActiveCode(null);
        setExpiresAt(null);
        setIsCodeRevealed(false);
        toast({
          title: 'Código Expirado',
          description: 'O código de 10 minutos para a turma expirou (is_active = false).',
          variant: 'destructive'
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, activeCode, selectedTurma, activeTurma, toast]);

  const handleCopy = () => {
    if (!activeCode) return;
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copiado!',
      description: 'Código da aula copiado para a área de transferência.',
    });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignora
    }
    sessionStorage.removeItem('school_teacher_session');
    navigate('/login');
  };

  // Formatting seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const timerPercentage = (timeLeft / 600) * 100; // 10 minutes = 600 seconds

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white font-sans flex flex-col justify-between selection:bg-blue-600/30 transition-all duration-300">
      <Header />

      <main className="flex-1 py-12 px-4 max-w-4xl mx-auto w-full space-y-8 z-10 relative">
        {/* Background gradient decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/10 dark:bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-50/80 dark:bg-zinc-900/60 backdrop-blur-md p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Olá, Prof. {professorName}!</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Portal do Professor • Painel de Controle de Presença</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start w-full sm:w-auto">
            <ThemeToggle />
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              className="flex items-center gap-2 border-red-200 dark:border-red-500/30 hover:border-red-500 bg-transparent text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 font-bold transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sair do Painel
            </Button>
          </div>
        </div>

        {/* Code Generation Section */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="md:col-span-3 p-8 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between items-center text-center gap-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors"></div>
            
            <div className="space-y-2 w-full">
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold uppercase tracking-wider">Código da Aula</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs px-4">Selecione a turma e gere o código de 6 dígitos para o check-in dos alunos.</p>
            </div>

            {/* Selector de Turma Customizado */}
            <div className="w-full max-w-xs space-y-2 text-left">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  SELECIONE A TURMA <span className="text-red-500">*</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddTurma(!showAddTurma)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-semibold text-[11px] flex items-center gap-1 transition-colors"
                >
                  + Nova Turma
                </button>
              </label>

              {/* Styled Controlled Select */}
              <div className="relative group">
                <select
                  value={selectedTurma}
                  onChange={(e) => {
                    setSelectedTurma(e.target.value);
                    setIsCodeRevealed(false);
                    setActiveCode(null);
                    setActiveTurma(null);
                    setExpiresAt(null);
                    setTimeLeft(0);
                    setStudents([]);
                    setIsUnsafeWindow(false);
                    setUnsafeMessage(null);
                  }}
                  className="w-full h-12 pl-4 pr-10 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-white font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-zinc-400 dark:hover:border-zinc-600 appearance-none shadow-sm cursor-pointer"
                >
                  <option value="" disabled className="text-zinc-400 bg-white dark:bg-zinc-950 font-normal">-- Escolha a Turma --</option>
                  {turmas.map((t) => (
                    <option key={t.id || t.code} value={t.code} className="py-2 text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 font-semibold">
                      Turma {t.codigo_turma || t.code}
                    </option>
                  ))}
                </select>

                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors">
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>

              {/* Form Inline para Adicionar Turma */}
              {showAddTurma && (
                <form onSubmit={handleAddTurma} className="flex gap-2 pt-2 animate-in fade-in slide-in-from-top-1">
                  <input
                    type="text"
                    placeholder="Ex: TCG04"
                    value={newTurmaInput}
                    onChange={(e) => setNewTurmaInput(e.target.value)}
                    className="flex-1 h-9 px-3 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white uppercase tracking-wider font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <Button type="submit" size="sm" disabled={isAddingTurma || !newTurmaInput.trim()} className="h-9 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm">
                    {isAddingTurma ? 'Criando...' : 'Salvar'}
                  </Button>
                </form>
              )}
            </div>

            {!selectedTurma || !isCodeRevealed ? (
              <div className="w-full space-y-3 py-2 flex flex-col items-center animate-in fade-in">
                {selectedTurma && (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Turma: {selectedTurma}
                  </div>
                )}
                <div className="inline-flex items-center justify-center gap-4 bg-zinc-100/60 dark:bg-zinc-950/60 border border-dashed border-zinc-300 dark:border-zinc-800 py-5 px-8 rounded-2xl select-none w-full max-w-sm">
                  <span className="text-5xl font-mono font-black tracking-widest text-zinc-300 dark:text-zinc-700">
                    ------
                  </span>
                </div>
                <p className="text-zinc-400 dark:text-zinc-500 text-xs italic">
                  Selecione uma turma e clique em "Mostrar Código" para revelar a aula
                </p>
              </div>
            ) : isUnsafeWindow ? (
              <div className="w-full max-w-sm p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-center space-y-2 animate-in fade-in">
                <div className="flex items-center justify-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <span>Código Próximo de Expirar</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  {unsafeMessage || 'O código atual expira em menos de 2 minutos. Por favor, aguarde a renovação automática para repassar aos alunos.'}
                </p>
                <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 pt-1">
                  Renovando ciclo em: {formatTime(timeLeft)}
                </div>
              </div>
            ) : activeCode ? (
              <div className="w-full space-y-4 animate-in fade-in">
                {(selectedTurma || activeTurma) && (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Turma: {selectedTurma || activeTurma}
                  </div>
                )}
                <div 
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-4 bg-zinc-100/80 hover:bg-zinc-200 dark:bg-zinc-950/80 dark:hover:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 py-5 px-8 rounded-2xl cursor-pointer transition-all duration-300 transform active:scale-98 select-none shadow-inner group w-full max-w-sm"
                >
                  <span className="text-5xl font-mono font-black tracking-widest text-blue-600 dark:text-blue-300 group-hover:text-blue-550 dark:group-hover:text-blue-200 transition-colors">
                    {activeCode}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center group-hover:bg-blue-600/10 group-hover:border-blue-500/30 transition-all text-zinc-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </div>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs">Clique no código para copiar</p>
              </div>
            ) : (
              <div className="py-4 text-zinc-400 dark:text-zinc-500 italic text-sm">
                Selecione uma turma e clique em "Mostrar Código"
              </div>
            )}

            {/* Redesigned Mostrar Código Button */}
            <Button
              onClick={handleShowCode}
              disabled={isGenerating || !selectedTurma}
              className={`w-full max-w-xs h-14 font-extrabold text-base tracking-wide rounded-xl shadow-lg transition-all duration-200 border-0 ${
                selectedTurma 
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 text-white shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] active:scale-[0.98]' 
                  : 'bg-zinc-200 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-70 border border-zinc-300 dark:border-zinc-700/50 shadow-none'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Buscando Código...
                </span>
              ) : !selectedTurma ? (
                'Selecione uma Turma para Mostrar Código'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Mostrar Código
                </span>
              )}
            </Button>
          </Card>

          {/* Countdown Timer Card */}
          <Card className="md:col-span-2 p-8 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 flex flex-col justify-center items-center gap-6 shadow-2xl relative overflow-hidden">
            <div className="text-center space-y-1">
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold uppercase tracking-wider">Tempo de Validade</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">O código expirará automaticamente.</p>
            </div>

            {/* Circular Countdown visual */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Track circle */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  fill="transparent" 
                  className="stroke-zinc-200 dark:stroke-zinc-800" 
                  strokeWidth="6"
                />
                {/* Progress circle */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  fill="transparent" 
                  className={`transition-all duration-1000 ${
                    timeLeft > 120 
                      ? 'stroke-blue-500' 
                      : timeLeft > 0 
                        ? 'stroke-amber-500 animate-pulse' 
                        : 'stroke-zinc-200 dark:stroke-zinc-800'
                  }`} 
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - (activeCode ? timerPercentage : 0) / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <Clock className={`w-5 h-5 mb-1 ${timeLeft > 120 ? 'text-blue-500 dark:text-blue-400' : timeLeft > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                <span className={`text-3xl font-mono font-bold tracking-tight ${timeLeft > 120 ? 'text-zinc-900 dark:text-white' : timeLeft > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {activeCode ? formatTime(timeLeft) : '00:00'}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-450 uppercase tracking-widest font-semibold mt-0.5">Restantes</span>
              </div>
            </div>

            {activeCode && timeLeft <= 120 && timeLeft > 0 && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 text-xs px-3 py-1.5 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Menos de 2 minutos restantes!</span>
              </div>
            )}
          </Card>
        </div>

        {/* Real-time Students Check-in List */}
        <Card className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 dark:border-zinc-800 pb-4 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Alunos Presentes ({students.length})</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Lista em tempo real dos check-ins com o código ativo</p>
              </div>
            </div>
            
            {activeCode && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs px-3 py-1.5 rounded-full font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Monitoramento Ativo</span>
              </div>
            )}
          </div>

          {isLoading && students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Buscando check-ins da aula...</p>
            </div>
          ) : students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <th className="pb-3 font-semibold">Nome Completo</th>
                    <th className="pb-3 font-semibold text-right">Horário do Check-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                  {students.map((student, i) => (
                    <tr key={i} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20 transition-colors animate-in fade-in slide-in-from-top-1 duration-300">
                      <td className="py-4 font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-blue-600 dark:text-blue-400 border border-zinc-200 dark:border-zinc-700">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        {student.name}
                      </td>
                      <td className="py-4 text-right text-zinc-500 dark:text-zinc-400 font-mono">
                        {new Date(student.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                <UserCheck2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-zinc-700 dark:text-zinc-300">Nenhum check-in registrado</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-450 max-w-xs mx-auto">
                  {activeCode 
                    ? "Compartilhe o código acima para que os alunos possam validar a presença." 
                    : "Gere um código de aula para iniciar o recebimento de presenças."}
                </p>
              </div>
            </div>
          )}
        </Card>
      </main>

      <Footer />
    </div>
  );
}
