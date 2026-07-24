import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmAuth } from '@/hooks/useAdmAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Crown,
  Trophy,
  Users,
  Dice5,
  Sparkles,
  RefreshCw,
  Phone,
  GraduationCap,
  Calendar,
  Gift,
  Hash,
  Volume2,
  Play,
  Pause
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(() => 
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

const DIGIT_HEIGHT = 80; // Altura de cada dígito em pixels (h-20)

// Componente individual de Slot
interface SlotProps {
  targetDigit: number;
  isSpinning: boolean;
  spinTrigger: number;
  spinDuration: number;
}

const Slot: React.FC<SlotProps> = ({ targetDigit, isSpinning, spinTrigger, spinDuration }) => {
  const isDark = useIsDarkMode();
  const zeroIndex = 20; // Índice exato do dígito zero na tira de números repetidos
  const zeroPosition = zeroIndex * DIGIT_HEIGHT; // 1600px

  const [position, setPosition] = useState(zeroPosition);
  const [transition, setTransition] = useState('none');

  useEffect(() => {
    if (isSpinning) {
      // 1. Reseta instantaneamente para a posição base do zero
      setTransition('none');
      setPosition(zeroPosition);

      // 2. Agenda a rotação na frame seguinte avançando 20 posições para dar 2 voltas completas
      const frame = requestAnimationFrame(() => {
        setTransition(`transform ${spinDuration}s cubic-bezier(0.1, 0.75, 0.25, 1)`);
        setPosition((zeroIndex + 20 + targetDigit) * DIGIT_HEIGHT);
      });
      return () => cancelAnimationFrame(frame);
    } else {
      // Quando não estiver rodando, assegura que exiba o dígito alvo centralizado na faixa base
      setTransition('none');
      setPosition((zeroIndex + targetDigit) * DIGIT_HEIGHT);
    }
  }, [isSpinning, spinTrigger, targetDigit, spinDuration, zeroPosition]);

  // Strip com os dígitos 0-9 repetidos 6 vezes (total de 60 números)
  const numbers = Array.from({ length: 60 }, (_, i) => i % 10);

  return (
    <div
      className={`w-12 sm:w-16 lg:w-14 xl:w-16 border rounded-xl overflow-hidden relative shadow-inner shrink-0 transition-colors duration-300 ${
        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
      }`}
      style={{
        height: `${DIGIT_HEIGHT}px`,
        boxSizing: 'content-box',
        boxShadow: isDark
          ? 'inset 0 10px 20px rgba(0,0,0,0.85), inset 0 -10px 20px rgba(0,0,0,0.85), 0 0 15px rgba(234,179,8,0.1)'
          : 'inset 0 6px 12px rgba(0,0,0,0.08), inset 0 -6px 12px rgba(0,0,0,0.08)'
      }}
    >
      {/* Efeito de Vidro Reflexivo */}
      <div className={`absolute inset-0 pointer-events-none z-10 ${
        isDark
          ? 'bg-gradient-to-b from-white/10 via-transparent to-black/50'
          : 'bg-gradient-to-b from-white/40 via-transparent to-black/5'
      }`} />

      {/* Linha vermelha/amarela guia central */}
      <div className={`absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 pointer-events-none z-10 ${
        isDark ? 'bg-yellow-500/20' : 'bg-zinc-500/10'
      }`} />

      {/* Tira vertical com os números */}
      <div
        className="absolute top-0 left-0 right-0 flex flex-col"
        style={{
          transform: `translateY(-${position}px)`,
          transition: transition,
          height: `${60 * DIGIT_HEIGHT}px`,
        }}
      >
        {numbers.map((num, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-center text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black font-mono select-none leading-none transition-colors duration-300 ${
              isDark ? 'text-yellow-450 dark:text-yellow-400' : 'text-zinc-900'
            }`}
            style={{ height: `${DIGIT_HEIGHT}px` }}
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
};
// ── FUNÇÃO SEGURA DE REPRODUÇÃO DE ÁUDIO ──
const safePlay = (audio: HTMLAudioElement) => {
  if (audio.readyState >= 3) {
    audio.play().catch(e => console.warn('Audio play failed:', e));
  } else {
    const onCanPlay = () => {
      audio.play().catch(e => console.warn('Audio play failed:', e));
      audio.removeEventListener('canplaythrough', onCanPlay);
    };
    audio.addEventListener('canplaythrough', onCanPlay);
  }
};

// ── REFERÊNCIAS GLOBAIS DE ÁUDIO REMOVIDAS (AGORA NO ESCOPO DO COMPONENTE) ──

// Componente Principal da Página
const AdminJackpot = () => {
  const { adminUser, logout } = useAdmAuth();
  const { toast } = useToast();

  const [participants, setParticipants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [drawTrigger, setDrawTrigger] = useState(0);

  // Estados do sorteador
  const [targetDigits, setTargetDigits] = useState<number[]>([0, 0, 0, 0, 0]);
  const [currentWinners, setCurrentWinners] = useState<any[]>([]);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem('jackpot_currentWinners');
  }, []);

  // Histórico local de sorteados nesta sessão
  const [drawHistory, setDrawHistory] = useState<any[]>([]);

  // Função assíncrona para salvar os vencedores no banco de dados (tabela jackpot_vencedores)
  const salvarVencedoresNoBanco = async (vencedores: any[]) => {
    try {
      const records = vencedores.map(w => ({
        aluno_id: Number(w.studentId || w.id || 0),
        nome: w.name || 'Desconhecido',
        daily_code: w.daily_code || null,
        data_sorteio: new Date().toISOString()
      }));

      const { error } = await (supabase as any)
        .from('jackpot_vencedores')
        .insert(records);

      if (error) throw error;

      toast({
        title: 'Vencedores Salvos',
        description: 'Os dados dos vencedores foram gravados com sucesso no banco de dados!',
      });
    } catch (err: any) {
      console.error("Erro ao persistir vencedores do Jackpot:", err);
      toast({
        title: 'Erro ao Salvar no Banco',
        description: 'Não foi possível salvar automaticamente no histórico. Veja o alerta do navegador.',
        variant: 'destructive',
      });
      // Alerta claro e imperdível para que o administrador não perca os dados de forma alguma
      alert(
        `⚠️ ATENÇÃO: FALHA NA GRAVAÇÃO DO SORTEIO!\n\n` +
        `Ocorreu um erro ao salvar os dados no banco de dados do Supabase.\n` +
        `Por favor, salve ou copie os dados dos ganhadores manualmente para que o registro não seja perdido:\n\n` +
        vencedores.map((w, i) => `Ganhador ${i + 1}:\n` +
          `• Nome: ${w.name}\n` +
          `• Código/Participação: ${w.daily_code || 'N/A'}\n` +
          `• ID/CPF: ${w.id}\n` +
          `• E-mail: ${w.email || 'N/A'}\n`
        ).join('\n') +
        `\nErro: ${err.message || JSON.stringify(err)}`
      );
    }
  };

  // ── ESTADOS DE ÁUDIO E REFERÊNCIAS ──
  const roletaAudio = useRef<HTMLAudioElement | null>(null);
  const ganhador1Audio = useRef<HTMLAudioElement | null>(null);
  const vitoriaAudio = useRef<HTMLAudioElement | null>(null);

  const [activeAudioTrack, setActiveAudioTrack] = useState<string | null>(null);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1.0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  useEffect(() => {
    roletaAudio.current = new Audio('/sounds/roleta2.wav');
    roletaAudio.current.loop = true;
    
    ganhador1Audio.current = new Audio('/sounds/ganhador_primeiro.wav');
    ganhador1Audio.current.loop = true;
    
    vitoriaAudio.current = new Audio('/sounds/musica_vitoria.mp3');
    vitoriaAudio.current.loop = true;

    return () => {
      // Limpeza das mídias na desmontagem
      if (roletaAudio.current) { roletaAudio.current.pause(); roletaAudio.current.src = ''; }
      if (ganhador1Audio.current) { ganhador1Audio.current.pause(); ganhador1Audio.current.src = ''; }
      if (vitoriaAudio.current) { vitoriaAudio.current.pause(); vitoriaAudio.current.src = ''; }
    };
  }, []);

  const getActiveAudioInstance = () => {
    if (activeAudioTrack === 'roleta') return roletaAudio.current;
    if (activeAudioTrack === 'ganhador1') return ganhador1Audio.current;
    if (activeAudioTrack === 'vitoria') return vitoriaAudio.current;
    return null;
  };

  // Temporizador para rastrear current time
  useEffect(() => {
    const interval = setInterval(() => {
      const audio = getActiveAudioInstance();
      if (audio && !audio.paused) {
        setCurrentAudioTime(audio.currentTime);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [activeAudioTrack]);

  const handleTogglePlay = () => {
    const audio = getActiveAudioInstance();
    if (!audio) return;

    if (isMusicPlaying) {
      audio.pause();
      setIsMusicPlaying(false);
    } else {
      safePlay(audio);
      setIsMusicPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioVolume(val);
    if (roletaAudio.current) roletaAudio.current.volume = val;
    if (ganhador1Audio.current) ganhador1Audio.current.volume = val;
    if (vitoriaAudio.current) vitoriaAudio.current.volume = val;
  };

  // Helpers para calcular datas padrão (primeiro e último dia do mês corrente)
  const getFirstDayOfMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const getLastDayOfMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  };

  const sanitizarNomePasta = (name: string): string => {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "");
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Sem registro';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ── NOVO: Persistência de Intervalos de Datas ──
  const [startDate, setStartDate] = useState<string>(() => {
    const saved = sessionStorage.getItem('jackpot_startDate');
    return saved || getFirstDayOfMonth();
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const saved = sessionStorage.getItem('jackpot_endDate');
    return saved || getLastDayOfMonth();
  });

  // Sincroniza intervalos validados com sessionStorage
  useEffect(() => {
    sessionStorage.setItem('jackpot_startDate', startDate);
    sessionStorage.setItem('jackpot_endDate', endDate);
  }, [startDate, endDate]);

  // Filtro reativo de alunos elegíveis dentro do período
  const eligibleParticipants = React.useMemo(() => {
    return participants.filter((p: any) => {
      // Exclui vencedores da rodada atual
      if (currentWinners.find(w => w.id === p.id)) {
        return false;
      }
      
      const dateToCheck = p.participation_date || p.created_at;
      if (!dateToCheck) return false;
      
      const pDate = new Date(dateToCheck);
      if (isNaN(pDate.getTime())) return false;
      
      if (startDate) {
        const [year, month, day] = startDate.split('-').map(Number);
        const start = new Date(year, month - 1, day, 0, 0, 0, 0);
        if (pDate < start) return false;
      }
      
      if (endDate) {
        const [year, month, day] = endDate.split('-').map(Number);
        const end = new Date(year, month - 1, day, 23, 59, 59, 999);
        if (pDate > end) return false;
      }
      
      return true;
    });
  }, [participants, startDate, endDate, currentWinners]);

  // Carrega participantes da Edge Function com token JWT
  const loadParticipants = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('lottery-participations', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
        }
      });

      if (error) throw error;
      setParticipants(data?.data || []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro de Autenticação',
        description: err.message || 'Não foi possível carregar a lista de participantes da rota segura.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  // Injetar biblioteca de confetes dinamicamente
  const triggerConfetti = () => {
    // @ts-ignore
    if (window.confetti) {
      // @ts-ignore
      window.confetti({
        particleCount: 150,
        spread: 80,
        origin: { x: 0.75, y: 0.6 } // Origem ajustada para o lado direito (área do ganhador)
      });
      // Blast extra após 1s
      setTimeout(() => {
        // @ts-ignore
        window.confetti({
          particleCount: 100,
          spread: 100,
          origin: { x: 0.65, y: 0.5 }
        });
        // @ts-ignore
        window.confetti({
          particleCount: 100,
          spread: 100,
          origin: { x: 0.85, y: 0.5 }
        });
      }, 1000);
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
      script.async = true;
      script.onload = () => {
        // @ts-ignore
        window.confetti({
          particleCount: 150,
          spread: 80,
          origin: { x: 0.75, y: 0.6 }
        });
      };
      document.body.appendChild(script);
    }
  };

  // Lógica para realizar o Sorteio
  const handleDraw = async () => {
    if (isSpinning) return;

    // ── Validação de Intervalos de Datas ──
    if (!startDate || !endDate) {
      toast({
        title: 'Período Inválido',
        description: 'Por favor, selecione as datas inicial e final para o sorteio.',
        variant: 'destructive'
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: 'Período Inválido',
        description: 'A data inicial não pode ser posterior à data final.',
        variant: 'destructive'
      });
      return;
    }

    if (currentWinners.length >= 2) return;
    setIsLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Sessão expirada ou inválida. Por favor, faça login novamente.");
      }

      const { data, error: invokeError } = await supabase.functions.invoke('lottery-participations', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (invokeError) {
        throw invokeError;
      }

      const list = data?.data || [];
      if (list.length === 0) {
        throw new Error("Nenhum participante elegível encontrado para o sorteio no banco de dados.");
      }

      // Filtro estrito: apenas dentro da data E que não tenham sido sorteados ainda nesta rodada
      const eligibleList = list.filter((p: any) => {
        if (currentWinners.find(w => w.id === p.id)) {
          return false;
        }

        const dateToCheck = p.participation_date || p.created_at;
        if (!dateToCheck) return false;

        const pDate = new Date(dateToCheck);
        if (isNaN(pDate.getTime())) return false;

        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
        
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
        const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

        return pDate >= start && pDate <= end;
      });

      if (eligibleList.length === 0) {
        throw new Error("Não há mais alunos elegíveis no intervalo de datas selecionado para este sorteio.");
      }

      const winnerIndex = Math.floor(Math.random() * eligibleList.length);
      const chosenWinner = eligibleList[winnerIndex];

      setParticipants(list);

      // Conversão segura do ID para sequência de 5 dígitos do painel físico
      const luckyNumber = isNaN(Number(chosenWinner.id)) ? 0 : Number(chosenWinner.id);
      const luckyNumberStr = String(luckyNumber).slice(-5).padStart(5, '0');
      const digits = luckyNumberStr.split('').map(Number);

      setTargetDigits(digits);
      setIsSpinning(true);
      setDrawTrigger(prev => prev + 1);

      // Dispara roleta e zera sons de vitória anteriores
      if (roletaAudio.current) {
        roletaAudio.current.currentTime = 0;
        safePlay(roletaAudio.current);
      }
      setActiveAudioTrack('roleta');
      setIsMusicPlaying(true);

      if (vitoriaAudio.current) vitoriaAudio.current.pause();
      if (ganhador1Audio.current) ganhador1Audio.current.pause();

      // Inicia busca assíncrona da foto e e-mail em paralelo com o giro das bobinas
      let winnerWithDetails = { 
        ...chosenWinner, 
        email: 'Não cadastrado', 
        photoUrl: '' 
      };

      try {
        // 1. Busca e-mail e ID na tabela estudantes
        const { data: studentData } = await (supabase as any)
          .from('estudantes')
          .select('id, email')
          .ilike('nome_completo', chosenWinner.name)
          .maybeSingle();

        if (studentData?.email) {
          winnerWithDetails.email = studentData.email;
        }
        if (studentData?.id) {
          winnerWithDetails.studentId = studentData.id;
        }

        // 2. Busca foto no bucket 'Fotos' do Supabase Storage
        const studentFolder = sanitizarNomePasta(chosenWinner.name);
        const { data: files } = await supabase.storage
          .from('Fotos')
          .list(studentFolder, { limit: 10 });

        if (files && files.length > 0) {
          const validFiles = files.filter(f => f.name && f.name !== '.emptyFolderPlaceholder');
          if (validFiles.length > 0) {
            // Ordenar decrescente para pegar a mais recente
            validFiles.sort((a, b) => {
              const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return tB - tA;
            });
            const filePath = `${studentFolder}/${validFiles[0].name}`;
            
            // Tenta criar URL assinada
            const { data: signedData } = await supabase.storage
              .from('Fotos')
              .createSignedUrl(filePath, 3600);

            if (signedData?.signedUrl) {
              winnerWithDetails.photoUrl = signedData.signedUrl;
            } else {
              // Fallback para URL pública
              const { data: publicData } = supabase.storage
                .from('Fotos')
                .getPublicUrl(filePath);
              winnerWithDetails.photoUrl = publicData?.publicUrl || '';
            }
          }
        }
      } catch (fetchErr) {
        console.error("Erro ao buscar detalhes adicionais no Supabase:", fetchErr);
      }

      // Slot 5 termina em 10.0s
      setTimeout(() => {
        // Interrompe imediatamente a roleta
        if (roletaAudio.current) {
          roletaAudio.current.pause();
          roletaAudio.current.currentTime = 0;
        }

        const updatedWinners = [...currentWinners, winnerWithDetails];
        setCurrentWinners(updatedWinners);
        setShowWinnerDialog(true);
        setIsSpinning(false);
        setDrawHistory(prev => [winnerWithDetails, ...prev]);
        sessionStorage.setItem('jackpot_currentWinners', JSON.stringify(updatedWinners));

        // Dispara o som correspondente à fase do sorteio
        if (updatedWinners.length === 1) {
          if (ganhador1Audio.current) {
            ganhador1Audio.current.volume = 1.0;
            safePlay(ganhador1Audio.current);
          }
          setActiveAudioTrack('ganhador1');
          setIsMusicPlaying(true);
        } else if (updatedWinners.length === 2) {
          if (ganhador1Audio.current) {
            ganhador1Audio.current.pause();
          }

          if (vitoriaAudio.current) {
            vitoriaAudio.current.volume = audioVolume;
            safePlay(vitoriaAudio.current);
          }
          setActiveAudioTrack('vitoria');
          setIsMusicPlaying(true);

          // Salva os dois vencedores no histórico do banco de dados
          salvarVencedoresNoBanco(updatedWinners);
        }

        triggerConfetti();
      }, 10100);

    } catch (err: any) {
      console.error("Erro no sorteio:", err);
      setIsSpinning(false);
      toast({
        title: 'Falha no Sorteio',
        description: err.message || 'Serviço temporariamente instável ou privilégios insuficientes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white flex flex-col relative overflow-hidden font-sans transition-colors duration-300">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-5 dark:opacity-10" style={{ background: 'radial-gradient(ellipse at center, #eab308 0%, transparent 70%)' }} />

      {/* ── BARRA SUPERIOR ── */}
      <header className="border-b border-zinc-200 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            title="Voltar ao Painel Master"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:bg-yellow-500/20 dark:text-yellow-500 rounded border border-amber-500/30 dark:border-yellow-500/30">
                Master
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-zinc-800 dark:text-zinc-100">Jackpot Uniforme Premiado</h1>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-450 hidden sm:block">Ambiente Seguro & Autenticado</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex flex-col text-right items-end justify-center">
            <span className="text-[10px] uppercase font-bold text-zinc-450 dark:text-zinc-500 leading-none">Logado como</span>
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 leading-tight">
              {adminUser?.name?.split(' ')[0] || 'Administrador'}
            </span>
          </div>
          <button
            onClick={logout}
            className="text-xs font-bold text-red-655 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:underline px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[90rem] w-full mx-auto p-4 sm:p-6 lg:p-8 xl:p-10 flex flex-col gap-8 lg:gap-12 relative z-10">

        {/* ── BLOCO SUPERIOR: MÁQUINA DE SLOTS E VENCEDOR (ALINHAMENTO PERFEITO) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12 w-full">

          {/* LADO ESQUERDO: MÁQUINA DE SLOTS */}
          <section className="flex flex-col items-center w-full h-full justify-center min-h-[450px]">
            <div
              className="w-full rounded-[2.5rem] bg-gradient-to-br from-white to-zinc-150 dark:from-[#1e1b15] dark:to-[#121214] border-2 border-zinc-200 dark:border-zinc-800 p-6 md:p-12 flex flex-col items-center relative z-10 shadow-lg dark:shadow-[0_0_80px_rgba(0,0,0,0.8)] transition-colors duration-300"
            >
              <div className="absolute inset-x-8 top-4 h-1.5 bg-gradient-to-r from-transparent via-amber-500 dark:via-yellow-500 to-transparent blur-[1px] opacity-70 animate-pulse" />

              <div className="flex flex-col items-center mb-10 text-center space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="w-8 h-8 text-amber-500 dark:text-yellow-400 animate-bounce" />
                  <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 dark:from-yellow-300 dark:via-amber-400 dark:to-yellow-500 tracking-[0.15em] uppercase">
                    JACKPOT DRAW
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-455 font-mono tracking-widest uppercase">Escola de Tecnologia & Negócios</p>
              </div>

              {/* ÁREA DOS ROLES (SLOTS ROBUSTOS) */}
              <div className="flex items-center justify-center w-full bg-zinc-100 dark:bg-zinc-950/90 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-inner overflow-hidden max-w-[95%] mx-auto transition-colors duration-300">
                <div className="flex gap-2 sm:gap-4 xl:gap-5 items-center justify-center">
                  <Slot targetDigit={targetDigits[0]} isSpinning={isSpinning} spinTrigger={drawTrigger} spinDuration={5.0} />
                  <Slot targetDigit={targetDigits[1]} isSpinning={isSpinning} spinTrigger={drawTrigger} spinDuration={6.0} />
                  <Slot targetDigit={targetDigits[2]} isSpinning={isSpinning} spinTrigger={drawTrigger} spinDuration={7.0} />
                  <Slot targetDigit={targetDigits[3]} isSpinning={isSpinning} spinTrigger={drawTrigger} spinDuration={8.0} />
                  <Slot targetDigit={targetDigits[4]} isSpinning={isSpinning} spinTrigger={drawTrigger} spinDuration={10.0} />
                </div>
              </div>

              {/* INPUTS DE INTERVALO DE DATAS */}
              <div className="w-full mt-10 grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-550 dark:text-zinc-400 tracking-wider">Data Inicial</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/80 dark:text-yellow-500/50" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={isSpinning}
                      className="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl h-11 pl-9 pr-3 text-sm font-sans text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-amber-500 dark:focus:border-yellow-500/50 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-550 dark:text-zinc-400 tracking-wider">Data Final</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/80 dark:text-yellow-500/50" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={isSpinning}
                      className="w-full bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl h-11 pl-9 pr-3 text-sm font-sans text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-amber-500 dark:focus:border-yellow-500/50 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* BOTÃO DE AÇÃO */}
              <div className="w-full mt-6 flex flex-col items-center gap-4">
                {currentWinners.length === 2 ? (
                  <Button
                    onClick={() => {
                      setCurrentWinners([]);
                      setShowWinnerDialog(false);
                      sessionStorage.removeItem('jackpot_currentWinners');

                      // Retorna a aplicação ao silêncio absoluto
                      if (roletaAudio.current) { roletaAudio.current.pause(); roletaAudio.current.currentTime = 0; }
                      if (ganhador1Audio.current) { ganhador1Audio.current.pause(); ganhador1Audio.current.currentTime = 0; }
                      if (vitoriaAudio.current) { vitoriaAudio.current.pause(); vitoriaAudio.current.currentTime = 0; }
                      setIsMusicPlaying(false);
                      setActiveAudioTrack(null);
                      setCurrentAudioTime(0);
                    }}
                    className="w-full max-w-md h-16 rounded-[1.25rem] font-black text-lg uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-2 border-zinc-300 dark:border-zinc-700 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Iniciar Novo Sorteio (Limpar)
                  </Button>
                ) : (
                  <Button
                    onClick={handleDraw}
                    disabled={isSpinning || eligibleParticipants.length === 0 || isLoading}
                    className="w-full max-w-md h-16 rounded-[1.25rem] font-black text-lg uppercase tracking-wider text-zinc-955 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 dark:from-yellow-400 dark:via-amber-400 dark:to-yellow-500 hover:from-amber-400 hover:to-yellow-400 dark:hover:from-yellow-300 dark:hover:to-amber-400 border-2 border-amber-300 dark:border-yellow-400 shadow-[0_0_30px_rgba(245,158,11,0.2)] dark:shadow-[0_0_30px_rgba(250,204,21,0.3)] hover:shadow-[0_0_40px_rgba(250,204,21,0.55)] transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isSpinning ? (
                      <span className="flex items-center gap-3">
                        <RefreshCw className="w-6 h-6 animate-spin" /> Sorteando...
                      </span>
                    ) : (
                      currentWinners.length === 1 ? 'Sortear 2º Ganhador' : 'Realizar Sorteio'
                    )}
                  </Button>
                )}

                <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium mt-1">
                  <Sparkles className="w-4 h-4 text-amber-500 dark:text-yellow-500/80 animate-pulse" />
                  <span>
                    {currentWinners.length === 2
                      ? 'Sorteio concluído. Limpe para iniciar outro.'
                      : 'Pressione para processar um cupom ativo'}
                  </span>
                </div>
              </div>

              {/* Controle de Áudio Integrado (Mais destacado e intuitivo) */}
              <div className="w-full mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col gap-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-400">
                    Controle de Som {activeAudioTrack ? `| Faixa: ${activeAudioTrack === 'roleta' ? 'Roleta' : activeAudioTrack === 'ganhador1' ? '1º Ganhador' : 'Vitória'}` : ''}
                  </span>
                  <Volume2 className="w-4 h-4 text-amber-500 dark:text-yellow-500" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <Button
                    onClick={handleTogglePlay}
                    variant="outline"
                    disabled={!activeAudioTrack}
                    className={`h-11 rounded-xl transition-all font-black text-[11px] uppercase tracking-wider ${
                      isMusicPlaying 
                        ? 'bg-zinc-150 border-zinc-300 hover:bg-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200' 
                        : 'bg-white border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/60 dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {isMusicPlaying ? (
                      <><Pause className="w-4 h-4 mr-1 text-red-500" /> Pausar Áudio</>
                    ) : (
                      <><Play className="w-4 h-4 mr-1 text-emerald-500" /> Retomar Áudio</>
                    )}
                  </Button>

                  <div className="space-y-1.5 px-1">
                    <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">
                      <span>Volume Geral</span>
                      <span>{Math.round(audioVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={audioVolume}
                      onChange={handleVolumeChange}
                      className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-500 dark:[&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* LADO DIREITO: REVELAÇÃO DO VENCEDOR OU ESPERA */}
          <section className="flex flex-col w-full h-full justify-center min-h-[450px]">
            {showWinnerDialog && currentWinners.length > 0 ? (
              <div className="w-full h-full animate-in fade-in slide-in-from-right-12 duration-700 ease-out fill-mode-forwards flex flex-col justify-center">
                <Card className="border-2 border-amber-500/50 dark:border-yellow-500/50 bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 shadow-[0_0_60px_rgba(245,158,11,0.1)] dark:shadow-[0_0_60px_rgba(250,204,21,0.15)] rounded-3xl p-6 lg:p-8 relative overflow-hidden h-full flex flex-col items-center justify-center text-center">

                  <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-500/5 dark:bg-yellow-500/10 blur-[80px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-amber-500/5 dark:bg-yellow-500/10 blur-[80px] pointer-events-none" />

                  <div className="w-16 h-16 rounded-full bg-amber-500/10 dark:bg-yellow-500/10 border-2 border-amber-500/50 dark:border-yellow-400/50 flex items-center justify-center shadow-lg mb-4 relative z-10 animate-bounce shrink-0">
                    <Trophy className="w-8 h-8 text-amber-500 dark:text-yellow-400" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative z-10 flex-1 content-center">
                    {[0, 1].map((idx) => {
                      const win = currentWinners[idx];
                      if (win) {
                        return (
                          <div
                            key={`${win.id}-${idx}`}
                            className="flex flex-col items-center p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 backdrop-blur-md shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-5 animate-in fade-in zoom-in-95 duration-700"
                          >
                            {/* Container da Imagem Vertical com Borda Dourada */}
                            <div className="relative group shrink-0">
                              {/* Efeito Glow Dourado Atrás */}
                              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
                              
                              {/* Container Principal com borda de gradiente dourado */}
                              <div className="relative p-[3px] bg-gradient-to-b from-amber-400 via-yellow-200 to-amber-600 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                                {win.photoUrl ? (
                                  <img
                                    src={win.photoUrl}
                                    alt={win.name}
                                    className="w-36 h-48 sm:w-44 sm:h-56 object-cover rounded-[13px] hover:scale-[1.02] transition-transform duration-300 bg-zinc-100 dark:bg-zinc-800"
                                  />
                                ) : (
                                  <div className="w-36 h-48 sm:w-44 sm:h-56 rounded-[13px] bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-550">
                                    <Users className="w-12 h-12 mb-2 text-zinc-350 dark:text-zinc-650" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">Sem Foto</span>
                                  </div>
                                )}
                              </div>

                              {/* Badge Comemorativo Sobreposto */}
                              <span className="absolute -top-2.5 -right-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md border border-white dark:border-zinc-900 flex items-center gap-1.5 animate-bounce">
                                <Trophy className="w-3 h-3 text-zinc-950 animate-pulse" />
                                GANHADOR
                              </span>

                              {/* ID / Cupom do Aluno na base da imagem */}
                              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-mono font-black tracking-wider bg-zinc-950 text-yellow-400 shadow-lg border border-amber-500/50">
                                #{String(win.id).padStart(5, '0')}
                              </span>
                            </div>

                            {/* Reorganização de dados no rodapé do card */}
                            <div className="space-y-2 text-center w-full mt-2">
                              <h2 className="text-base sm:text-lg font-black text-zinc-950 dark:text-white tracking-tight uppercase leading-tight line-clamp-2 px-1">
                                {win.name}
                              </h2>
                              
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold truncate px-4">
                                {win.email || 'Sem e-mail cadastrado'}
                              </p>

                              {win.daily_code && (
                                <p className="text-[10px] font-bold font-mono text-amber-600 dark:text-yellow-500 bg-amber-500/10 dark:bg-yellow-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 dark:border-yellow-500/20 w-fit mx-auto">
                                  CÓDIGO: {win.daily_code}
                                </p>
                              )}

                              <div className="pt-2 border-t border-zinc-150 dark:border-zinc-800/40 w-full mt-2 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">
                                <Calendar className="w-3.5 h-3.5 text-zinc-450 dark:text-zinc-500" />
                                <span>Sorteado em {formatDateTime(win.participation_date || win.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/10 text-zinc-400 dark:text-zinc-500 space-y-4 opacity-60 animate-pulse h-full min-h-[350px]"
                          >
                            <span className="text-xs font-black uppercase tracking-widest text-center max-w-[150px]">
                              Aguardando 2º Sorteio
                            </span>
                          </div>
                        );
                      }
                    })}
                  </div>
                </Card>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] bg-white dark:bg-zinc-900/20 text-zinc-400 dark:text-zinc-650 p-8 text-center animate-in fade-in duration-500 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900/85 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-6">
                  <Dice5 className="w-8 h-8 text-zinc-400 dark:text-zinc-700 animate-pulse" />
                </div>
                <h4 className="text-lg font-black uppercase tracking-widest text-zinc-550 dark:text-zinc-550 mb-2">Aguardando Sorteio</h4>
                <p className="text-sm font-medium mt-2 max-w-xs leading-relaxed text-zinc-400 dark:text-zinc-600">
                  Defina o intervalo de datas e clique no botão para rolar as bobinas numéricas. O vencedor e sua foto de participação serão exibidos aqui.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* ── BLOCO INFERIOR: HISTÓRICO E DADOS TÉCNICOS (BASE) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12 w-full mt-4">

          {/* LADO ESQUERDO: HISTÓRICO DE SORTEIOS */}
          <section className="w-full">
            {drawHistory.length > 0 && (
              <div className="w-full space-y-3 px-2 animate-in fade-in duration-700">
                <h3 className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  Histórico Recente
                </h3>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {drawHistory.map((winnerRow, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 backdrop-blur-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-amber-500/10 dark:bg-yellow-500/10 border border-amber-500/30 dark:border-yellow-500/30 flex items-center justify-center text-xs text-amber-600 dark:text-yellow-400 font-bold">
                          {drawHistory.length - idx}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-850 dark:text-zinc-100">{winnerRow.name}</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                            {winnerRow.daily_code ? 'Código: ' + winnerRow.daily_code : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-sm font-black text-amber-600 dark:text-yellow-400 bg-amber-500/5 dark:bg-yellow-500/5 px-2.5 py-1 rounded border border-amber-500/10 dark:border-yellow-500/10">
                          {String(winnerRow.id).padStart(5, '0')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* LADO DIREITO: ALUNOS ELEGÍVEIS */}
          <section className="w-full flex flex-col justify-start">
            <Card className="p-5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl flex flex-col justify-between shadow-sm w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-950 dark:text-zinc-400">Alunos Elegíveis</span>
                    <div className="flex items-baseline gap-2">
                      {isLoading ? (
                        <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1"></div>
                      ) : (
                        <h3 className="text-2xl font-black text-zinc-950 dark:text-white">{eligibleParticipants.length}</h3>
                      )}
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-amber-500/20 dark:text-yellow-500/20" />
                </div>

                {/* Histórico sutil integrado na base do card */}
                {drawHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-150 dark:border-zinc-800/80">
                    <span className="text-[10px] font-black uppercase text-zinc-950 dark:text-zinc-500 block mb-1">Último Ganhador Sorteado</span>
                    <p className="text-sm font-black text-zinc-950 dark:text-zinc-300 truncate">
                      {drawHistory[0].name} <span className="text-amber-600 dark:text-yellow-500 font-mono ml-1 font-bold">#{String(drawHistory[0].id).padStart(5, '0')}</span>
                    </p>
                  </div>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={loadParticipants}
                disabled={isLoading || isSpinning}
                className="mt-6 w-full bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 rounded-xl transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar Cupons
              </Button>
            </Card>
          </section>
        </div>
      </main>

      {/* BALÕES FESTIVOS (RENDERIZADOS APENAS QUANDO HÁ 2 GANHADORES) */}
      {currentWinners.length === 2 && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {Array.from({ length: 15 }).map((_, i) => {
            const left = (i * 6.5 + (i % 3) * 5) % 100;
            const duration = 5 + (i % 5) * 1.5;
            const delay = i * 0.4 + (i % 2) * 0.5;
            const isBlue = i % 3 === 0;

            return (
              <div
                key={i}
                className={`animate-floatBalloons absolute -bottom-24 w-8 h-10 sm:w-12 sm:h-16 rounded-[50%_50%_50%_50%_/_40%_40%_60%_60%] shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.15)] ${isBlue ? 'bg-gradient-to-b from-blue-400 to-blue-600' : 'bg-gradient-to-b from-yellow-400 to-amber-500'
                  }`}
                style={{
                  left: `${left}%`,
                  animationDuration: `${duration}s`,
                  animationDelay: `${delay}s`,
                }}
              >
                {/* Nó do balão */}
                <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${isBlue ? 'bg-blue-600' : 'bg-amber-500'}`}></div>
                {/* Fio do balão */}
                <div className="absolute top-full left-1/2 w-[1px] h-24 bg-white/20 origin-top rotate-[-3deg]"></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminJackpot;
