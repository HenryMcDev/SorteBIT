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
  AlertCircle
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
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [students, setStudents] = useState<Student[]>([]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Fetch active code and check-ins
  const fetchActiveCodeData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Sessão expirada');
      }

      const response = await axios.get(getBackendUrl() + '/api/professor/active-code', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data?.sucesso) {
        if (response.data.activeCode) {
          setActiveCode(response.data.activeCode.code);
          setExpiresAt(response.data.activeCode.expires_at);
          
          const exp = new Date(response.data.activeCode.expires_at).getTime();
          const diff = Math.max(0, Math.floor((exp - Date.now()) / 1000));
          setTimeLeft(diff);
        } else {
          setActiveCode(null);
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

  // Generate new code
  const handleGenerateCode = async () => {
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

      const response = await axios.post(getBackendUrl() + '/api/professor/generate-code', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data?.sucesso) {
        const code = response.data.code;
        const expires = response.data.expires_at;
        setActiveCode(code);
        setExpiresAt(expires);
        
        const exp = new Date(expires).getTime();
        const diff = Math.max(0, Math.floor((exp - Date.now()) / 1000));
        setTimeLeft(diff);
        setStudents([]); // Reset student checkins for the new code

        toast({
          title: 'Código Gerado!',
          description: `O código da aula é ${code}. Válido por 10 minutos.`,
        });
      } else {
        toast({
          title: 'Erro',
          description: response.data?.erro || 'Não foi possível gerar o código.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Erro ao gerar código da aula:', error);
      toast({
        title: 'Erro de conexão',
        description: error.response?.data?.erro || 'Falha ao conectar com o servidor.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchActiveCodeData();
  }, []);

  // Poll for student check-ins every 5 seconds
  useEffect(() => {
    if (!activeCode) return;

    const interval = setInterval(() => {
      fetchActiveCodeData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeCode]);

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

  // Countdown timer logic
  useEffect(() => {
    if (timeLeft <= 0) {
      if (activeCode) {
        // Code just expired
        setActiveCode(null);
        setExpiresAt(null);
        toast({
          title: 'Código Expirado',
          description: 'O código de 10 minutos expirou. Gere um novo código para novos check-ins.',
          variant: 'destructive'
        });
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, activeCode, toast]);

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
            
            <div className="space-y-2">
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold uppercase tracking-wider">Código da Aula</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs px-4">Gere um código de 6 dígitos para que seus alunos efetuem o check-in na sua aula ativa.</p>
            </div>

            {activeCode ? (
              <div className="w-full space-y-4">
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
              <div className="py-8 text-zinc-400 dark:text-zinc-500 italic text-sm">
                Nenhum código ativo no momento
              </div>
            )}

            <Button
              onClick={handleGenerateCode}
              disabled={isGenerating}
              className="w-full max-w-xs h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Gerando Código...
                </span>
              ) : activeCode ? (
                'Gerar Novo Código'
              ) : (
                'Gerar Código da Aula'
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
