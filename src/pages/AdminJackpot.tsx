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

const DIGIT_HEIGHT = 80; // Altura de cada dígito em pixels (h-20)

// Componente individual de Slot
interface SlotProps {
  targetDigit: number;
  isSpinning: boolean;
  spinTrigger: number;
  spinDuration: number;
}

const Slot: React.FC<SlotProps> = ({ targetDigit, isSpinning, spinTrigger, spinDuration }) => {
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
      className="w-12 sm:w-16 lg:w-14 xl:w-16 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative shadow-inner shrink-0"
      style={{
        height: `${DIGIT_HEIGHT}px`,
        boxSizing: 'content-box',
        boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.95), inset 0 -10px 20px rgba(0,0,0,0.95), 0 0 15px rgba(234,179,8,0.05)'
      }}
    >
      {/* Efeito de Vidro Reflexivo */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/50 pointer-events-none z-10" />

      {/* Linha vermelha/amarela guia central */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-yellow-500/20 -translate-y-1/2 pointer-events-none z-10" />

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
            className="flex items-center justify-center text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black font-mono text-yellow-400 select-none leading-none"
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

  // ── NOVO: Persistência de Intervalos ──
  const [startRange, setStartRange] = useState<string>(() => {
    const saved = sessionStorage.getItem('jackpot_startRange');
    return saved || '';
  });
  const [endRange, setEndRange] = useState<string>(() => {
    const saved = sessionStorage.getItem('jackpot_endRange');
    return saved || '';
  });
  const [processedRanges, setProcessedRanges] = useState<{ start: number, end: number }[]>(() => {
    const saved = sessionStorage.getItem('jackpot_processedRanges');
    return saved ? JSON.parse(saved) : [];
  });

  // Sincroniza intervalos validados com sessionStorage
  useEffect(() => {
    sessionStorage.setItem('jackpot_startRange', startRange);
    sessionStorage.setItem('jackpot_endRange', endRange);
    sessionStorage.setItem('jackpot_processedRanges', JSON.stringify(processedRanges));
  }, [startRange, endRange, processedRanges]);

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

    // ── Validação de Intervalos Numéricos ──
    if (startRange === '' || endRange === '') {
      toast({
        title: 'Faixa Inválida',
        description: 'Por favor, informe a numeração inicial e final do lote.',
        variant: 'destructive'
      });
      return;
    }

    const start = Number(startRange);
    const end = Number(endRange);

    if (start > end) {
      toast({
        title: 'Faixa Inválida',
        description: 'O número inicial não pode ser maior que o final.',
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

      // Filtro estrito: apenas dentro da faixa E que não tenham sido sorteados ainda nesta rodada
      const eligibleList = list.filter((p: any) => p.id >= start && p.id <= end && !currentWinners.find(w => w.id === p.id));

      if (eligibleList.length === 0) {
        throw new Error(`Não há mais alunos elegíveis na faixa solicitada (de ${start} até ${end}) para este sorteio.`);
      }

      const winnerIndex = Math.floor(Math.random() * eligibleList.length);
      const chosenWinner = eligibleList[winnerIndex];

      setParticipants(list);

      const luckyNumber = chosenWinner.id;
      const luckyNumberStr = String(luckyNumber).padStart(5, '0');
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

      // Slot 5 termina em 10.0s
      setTimeout(() => {
        // Interrompe imediatamente a roleta
        if (roletaAudio.current) {
          roletaAudio.current.pause();
          roletaAudio.current.currentTime = 0;
        }

        const updatedWinners = [...currentWinners, chosenWinner];
        setCurrentWinners(updatedWinners);
        setShowWinnerDialog(true);
        setIsSpinning(false);
        setDrawHistory(prev => [chosenWinner, ...prev]);
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
          if (ganhador1Audio.current) ganhador1Audio.current.pause();

          if (vitoriaAudio.current) {
            vitoriaAudio.current.volume = audioVolume;
            safePlay(vitoriaAudio.current);
          }
          setActiveAudioTrack('vitoria');
          setIsMusicPlaying(true);

          // Encerra a faixa e avança
          setProcessedRanges(prev => [...prev, { start, end }]);
          setStartRange(String(end + 1).padStart(5, '0'));
          setEndRange('');
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
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10" style={{ background: 'radial-gradient(ellipse at center, #eab308 0%, transparent 70%)' }} />

      {/* ── BARRA SUPERIOR ── */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center transition-colors text-zinc-400 hover:text-white"
            title="Voltar ao Painel Master"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/30">
                Master
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-zinc-100">Jackpot SorteBIT</h1>
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">Ambiente Seguro & Autenticado</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col text-right items-end justify-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 leading-none">Logado como</span>
            <span className="text-sm font-semibold text-zinc-300 leading-tight">
              {adminUser?.name?.split(' ')[0] || 'Administrador'}
            </span>
          </div>
          <button
            onClick={logout}
            className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors"
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
              className="w-full rounded-[2.5rem] bg-zinc-900 border-2 border-zinc-800 p-6 md:p-12 flex flex-col items-center relative z-10 shadow-[0_0_80px_rgba(0,0,0,0.8)]"
              style={{
                background: 'linear-gradient(145deg, #1e1b15 0%, #121214 100%)',
                boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.8), inset 0 2px 6px rgba(255, 255, 255, 0.05)'
              }}
            >
              <div className="absolute inset-x-8 top-4 h-1.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent blur-[1px] opacity-70 animate-pulse" />

              <div className="flex flex-col items-center mb-10 text-center space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
                  <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 tracking-[0.15em] uppercase">
                    JACKPOT DRAW
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Escola de Tecnologia & Negócios</p>
              </div>

              {/* ÁREA DOS ROLES (SLOTS ROBUSTOS) */}
              <div className="flex items-center justify-center w-full bg-zinc-950/90 p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-inner overflow-hidden max-w-[95%] mx-auto">
                <div className="flex gap-2 sm:gap-4 xl:gap-5 items-center justify-center">
                  <Slot targetDigit={targetDigits[0]} isSpinning={isSpinning} spinTrigger={drawTrigger} spinDuration={5.0} />
                  <Slot targetDigit={targetDigits[1]} isSpinning={isSpinning} spinTrigger={drawTrigger} spinDuration={6.0} />
                  <Slot targetDigit={targetDigits[2]} isSpinning={isSpinning} spinTrigger={drawTrigger} spinDuration={7.0} />
                  <Slot targetDigit={targetDigits[3]} isSpinning={isSpinning} spinTrigger={drawTrigger} spinDuration={8.0} />
                  <Slot targetDigit={targetDigits[4]} isSpinning={isSpinning} spinTrigger={drawTrigger} spinDuration={10.0} />
                </div>
              </div>

              {/* INPUTS DE INTERVALO NUMÉRICO */}
              <div className="w-full mt-10 grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Lote Início</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500/50" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={5}
                      value={startRange}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 5) val = val.slice(0, 5);
                        setStartRange(val);
                      }}
                      disabled={isSpinning}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl h-11 pl-9 pr-3 text-sm font-mono text-zinc-200 focus:outline-none focus:border-yellow-500/50 transition-colors placeholder:text-zinc-700 disabled:opacity-50"
                      placeholder="Ex: 1"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Lote Fim</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500/50" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={5}
                      value={endRange}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 5) val = val.slice(0, 5);
                        setEndRange(val);
                      }}
                      disabled={isSpinning}
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl h-11 pl-9 pr-3 text-sm font-mono text-zinc-200 focus:outline-none focus:border-yellow-500/50 transition-colors placeholder:text-zinc-700 disabled:opacity-50"
                      placeholder="Ex: 50"
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
                    className="w-full max-w-md h-16 rounded-[1.25rem] font-black text-lg uppercase tracking-wider text-zinc-900 bg-zinc-300 hover:bg-zinc-200 border-2 border-zinc-400 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Iniciar Novo Sorteio (Limpar)
                  </Button>
                ) : (
                  <Button
                    onClick={handleDraw}
                    disabled={isSpinning || participants.length === 0 || isLoading}
                    className="w-full max-w-md h-16 rounded-[1.25rem] font-black text-lg uppercase tracking-wider text-zinc-950 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 border-2 border-yellow-300 dark:border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)] hover:shadow-[0_0_40px_rgba(250,204,21,0.55)] transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
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
                  <Sparkles className="w-4 h-4 text-yellow-500/80 animate-pulse" />
                  <span>
                    {currentWinners.length === 2
                      ? 'Sorteio concluído. Limpe para iniciar outro.'
                      : 'Pressione para processar um cupom ativo'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* LADO DIREITO: REVELAÇÃO DO VENCEDOR OU ESPERA */}
          <section className="flex flex-col w-full h-full justify-center min-h-[450px]">
            {showWinnerDialog && currentWinners.length > 0 ? (
              <div className="w-full h-full animate-in fade-in slide-in-from-right-12 duration-700 ease-out fill-mode-forwards flex flex-col justify-center">
                <Card className="border-2 border-yellow-500/50 bg-gradient-to-br from-zinc-900 to-zinc-950 shadow-[0_0_60px_rgba(250,204,21,0.15)] rounded-3xl p-8 lg:p-10 relative overflow-hidden h-full max-h-[600px] flex flex-col items-center justify-center text-center">

                  <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-yellow-500/10 blur-[80px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-yellow-500/10 blur-[80px] pointer-events-none" />

                  <div className="w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-400/50 flex items-center justify-center shadow-lg mb-6 relative z-10 animate-bounce shrink-0">
                    <Trophy className="w-10 h-10 text-yellow-400" />
                  </div>

                  <div className="relative z-10 w-full mb-8 shrink-0">
                    <span className="text-sm font-black uppercase tracking-widest text-yellow-500/80">🏆 GRANDES VENCEDORES 🏆</span>
                  </div>

                  <div className="grid grid-cols-2 gap-8 w-full relative z-10 flex-1 content-center">
                    {[0, 1].map((idx) => {
                      const win = currentWinners[idx];
                      if (win) {
                        return (
                          <div
                            key={`${win.id}-${idx}`}
                            className="flex flex-col items-center justify-center space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700"
                          >
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight text-center break-words w-full drop-shadow-md">
                              {win.name}
                            </h2>
                            <span className="text-xl sm:text-2xl font-mono font-black text-zinc-300 tracking-[0.1em] drop-shadow-sm">
                              #{String(win.id).padStart(5, '0')}
                            </span>
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="flex flex-col items-center justify-center space-y-4 opacity-40 animate-pulse"
                          >
                            <div className="w-24 h-4 bg-zinc-800 rounded-full mb-2"></div>
                            <span className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
                              Aguardando 2º Ganhador
                            </span>
                          </div>
                        );
                      }
                    })}
                  </div>
                </Card>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/80 rounded-[2rem] bg-zinc-900/20 text-zinc-600 p-8 text-center animate-in fade-in duration-500">
                <div className="w-16 h-16 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center mb-6">
                  <Dice5 className="w-8 h-8 text-zinc-700 animate-pulse" />
                </div>
                <h4 className="text-lg font-black uppercase tracking-widest text-zinc-500 mb-2">Aguardando Sorteio</h4>
                <p className="text-sm font-medium mt-2 max-w-xs leading-relaxed text-zinc-600">
                  Clique no botão para rolar as bobinas numéricas. O vencedor será exibido aqui assim que a sequência for travada.
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
                <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  Histórico Recente
                </h3>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {drawHistory.map((winnerRow, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm hover:bg-zinc-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-xs text-yellow-400 font-bold">
                          {drawHistory.length - idx}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-100">{winnerRow.name}</p>
                          <p className="text-[11px] text-zinc-500 font-medium">
                            {winnerRow.daily_code ? 'Código: ' + winnerRow.daily_code : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-sm font-black text-yellow-400 bg-yellow-500/5 px-2.5 py-1 rounded border border-yellow-500/10">
                          {String(winnerRow.id).padStart(5, '0')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* LADO DIREITO: ESTATÍSTICAS E STATUS MASTER E ÁUDIO */}
          <section className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full animate-in fade-in slide-in-from-bottom-8 duration-700">

              {/* Card de Alunos Salvos e Reload */}
              <Card className="p-5 border-zinc-800 bg-zinc-900/60 backdrop-blur-md rounded-2xl flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Alunos Elegíveis</span>
                    <div className="flex items-baseline gap-2">
                      {isLoading ? (
                        <div className="h-8 w-16 bg-zinc-800 animate-pulse rounded mt-1"></div>
                      ) : (
                        <h3 className="text-2xl font-black text-white">{participants.length}</h3>
                      )}
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-yellow-500/20" />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadParticipants}
                  disabled={isLoading || isSpinning}
                  className="mt-4 w-full border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-300"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar Cupons
                </Button>
              </Card>

              {/* Card de Segurança ou Histórico Recente */}
              <Card className="p-5 border-zinc-800 bg-zinc-900/60 backdrop-blur-md rounded-2xl flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <Crown className="w-5 h-5 text-green-500/80" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Status Master</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed flex-1">
                  Rota protegida JWT strict. Acesso seguro.
                </p>

                {/* Histórico sutil integrado na base */}
                {drawHistory.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/80">
                    <span className="text-[10px] font-bold uppercase text-zinc-600 block mb-1">Último Ganhador</span>
                    <p className="text-xs text-zinc-400 truncate">
                      {drawHistory[0].name} <span className="text-yellow-500/70 font-mono ml-1">#{String(drawHistory[0].id).padStart(5, '0')}</span>
                    </p>
                  </div>
                )}
              </Card>

              {/* Card de Controle de Áudio */}
              <Card className="p-5 border-zinc-800 bg-zinc-900/60 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center space-y-4">
                <div className="w-full flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Mídia {activeAudioTrack ? `| ${activeAudioTrack} (${Math.floor(currentAudioTime)}s)` : ''}
                  </span>
                  <Volume2 className="w-4 h-4 text-zinc-500" />
                </div>

                <Button
                  onClick={handleTogglePlay}
                  variant="outline"
                  disabled={!activeAudioTrack}
                  className={`w-full h-12 rounded-xl transition-all ${isMusicPlaying ? 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700' : 'bg-transparent border-zinc-800 hover:bg-zinc-800'}`}
                >
                  {isMusicPlaying ? (
                    <><Pause className="w-4 h-4 mr-2" /> Pausar</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Tocar Faixa Ativa</>
                  )}
                </Button>

                <div className="w-full space-y-2">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase">
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
                    className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:[&::-webkit-slider-thumb]:bg-zinc-300 transition-all"
                  />
                </div>
              </Card>

            </div>
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
