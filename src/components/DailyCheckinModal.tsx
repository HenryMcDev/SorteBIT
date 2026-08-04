import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Coins, Check, Lock, AlertTriangle, AlertCircle, Sparkles, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DailyCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | number;
  currentBalance: number;
  setSaldo: (saldo: number) => void;
  alreadyParticipated: boolean; // Indica se validou a foto hoje
  onCheckinSuccess?: () => void;
}

interface CheckinRecord {
  dia_checkin: number;
  data_resgate: string;
  cashbit_ganho: number;
}

const CHECKIN_VALUES = [
  { dia: 1, valor: 5, dataText: "03/08", year: 2026, month: 7, date: 3 },
  { dia: 2, valor: 10, dataText: "04/08", year: 2026, month: 7, date: 4 },
  { dia: 3, valor: 15, dataText: "05/08", year: 2026, month: 7, date: 5 },
  { dia: 4, valor: 20, dataText: "06/08", year: 2026, month: 7, date: 6 },
  { dia: 5, valor: 25, dataText: "07/08", year: 2026, month: 7, date: 7 },
  { dia: 6, valor: 30, dataText: "10/08", year: 2026, month: 7, date: 10 },
  { dia: 7, valor: 100, dataText: "11/08", year: 2026, month: 7, date: 11 },
];

export const DailyCheckinModal = ({
  isOpen,
  onClose,
  studentId,
  currentBalance,
  setSaldo,
  alreadyParticipated: propAlreadyParticipated,
  onCheckinSuccess
}: DailyCheckinModalProps) => {
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [alreadyParticipated, setAlreadyParticipated] = useState(propAlreadyParticipated);
  const { toast } = useToast();

  const fetchCheckins = async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('campanha_lancamento_checkin' as any)
        .select('dia_checkin, data_resgate, cashbit_ganho')
        .eq('aluno_id', Number(studentId))
        .order('dia_checkin', { ascending: true });

      if (error) throw error;
      
      const records = (data || []) as unknown as CheckinRecord[];
      
      // Auto-reset: Se já completou o dia 7 em uma data anterior (não hoje), reinicia o ciclo deletando registros antigos
      const temDia7 = records.find(r => r.dia_checkin === 7);
      if (temDia7) {
        const dataResgate = new Date(temDia7.data_resgate);
        const hoje = new Date();
        const eHoje = dataResgate.getDate() === hoje.getDate() &&
                      dataResgate.getMonth() === hoje.getMonth() &&
                      dataResgate.getFullYear() === hoje.getFullYear();
        
        if (!eHoje) {
          // Deleta registros para começar novo ciclo
          const { error: deleteError } = await supabase
            .from('campanha_lancamento_checkin' as any)
            .delete()
            .eq('aluno_id', Number(studentId));
          
          if (!deleteError) {
            setCheckins([]);
            setIsLoading(false);
            return;
          }
        }
      }

      setCheckins(records);
    } catch (err) {
      console.error("Erro ao buscar checkins:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkParticipationFromDatabase = async () => {
    if (!studentId) return;
    try {
      // 1. Busca o nome completo do estudante
      const { data: studentData } = await supabase
        .from('estudantes' as any)
        .select('nome_completo')
        .eq('id', Number(studentId))
        .maybeSingle();

      const nomeEstudante = (studentData as any)?.nome_completo;
      if (!nomeEstudante) return;

      // 2. Busca participações do estudante
      const { data: participations } = await supabase
        .from('lottery_participations')
        .select('id, participation_date')
        .eq('name', nomeEstudante);

      if (participations && participations.length > 0) {
        const today = new Date();
        const hasToday = participations.some(p => {
          const pDate = new Date(p.participation_date);
          return pDate.getDate() === today.getDate() &&
                 pDate.getMonth() === today.getMonth() &&
                 pDate.getFullYear() === today.getFullYear();
        });
        
        // Libera se houver hoje ou se houver qualquer registro recente (testes)
        setAlreadyParticipated(hasToday || participations.length > 0);
      } else {
        setAlreadyParticipated(false);
      }
    } catch (err) {
      console.error("Erro ao verificar participações:", err);
    }
  };

  useEffect(() => {
    if (isOpen && studentId) {
      fetchCheckins();
      checkParticipationFromDatabase();
    }
  }, [isOpen, studentId]);

  useEffect(() => {
    setAlreadyParticipated(propAlreadyParticipated);
  }, [propAlreadyParticipated]);

  // Obter o dia da campanha com base na data do calendário (retorna null se fora das datas letivas)
  const getCampaignDayForToday = () => {
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth(); // 0-indexed: 7 é agosto
    const y = today.getFullYear();
    if (y === 2026 && m === 7) {
      if (d === 3) return 1;
      if (d === 4) return 2;
      if (d === 5) return 3;
      if (d === 6) return 4;
      if (d === 7) return 5;
      if (d === 10) return 6;
      if (d === 11) return 7;
    }
    return null;
  };

  const today = new Date();
  const campaignStart = new Date(2026, 7, 3); // 03/08/2026
  const campaignEnd = new Date(2026, 7, 11, 23, 59, 59, 999); // 11/08/2026
  const isBeforeCampaign = today < campaignStart;
  const isAfterCampaign = today > campaignEnd;

  const todayCampaignDay = getCampaignDayForToday();
  const isCampaignActive = todayCampaignDay !== null;

  // Verificação de pausa de fim de semana dentro do período da campanha
  const checkWeekendPause = () => {
    const today = new Date();
    const isCampaignPeriod = today >= campaignStart && today <= campaignEnd;
    const isWeekend = today.getDay() === 0 || today.getDay() === 6; // 0 = Domingo, 6 = Sábado
    return isCampaignPeriod && isWeekend;
  };

  const isWeekendPause = checkWeekendPause();

  // Verifica se o aluno já fez check-in do Dia 1
  const hasClaimedDay1 = checkins.some(c => c.dia_checkin === 1);

  // Determinar o dia atual do check-in a ser resgatado:
  // Se o aluno ainda NÃO resgatou o DIA 1 (03/08), força o resgate do DIA 1 primeiro!
  // Se o aluno JÁ resgatou o DIA 1, avança para o DIA 2 (04/08) ou dia atual da campanha.
  const currentCheckinDay = !hasClaimedDay1
    ? 1
    : (isCampaignActive ? todayCampaignDay! : (isBeforeCampaign ? 1 : 7));

  // Verifica se o aluno já fez check-in referente ao dia ativo atual
  const alreadyCheckedInToday = checkins.some(c => c.dia_checkin === currentCheckinDay);

  // Verificar se a sequência está quebrada/interrompida para o Dia 7
  const checkSequenceInterrupted = () => {
    if (checkins.length < 1) return false;
    for (let i = 1; i < checkins.length; i++) {
      const prevDate = new Date(checkins[i-1].data_resgate);
      const currDate = new Date(checkins[i].data_resgate);
      
      const prevMidnight = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
      const currMidnight = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate());
      
      const diffTime = currMidnight.getTime() - prevMidnight.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        return true; // Houve interrupção!
      }
    }
    return false;
  };

  const isInterrupted = isCampaignActive
    ? Array.from({ length: Math.max(0, (todayCampaignDay || 1) - 1) }, (_, i) => i + 1)
        .some(day => !checkins.some(c => c.dia_checkin === day))
    : checkSequenceInterrupted();
  
  // Total de check-ins concluídos pelo usuário
  const totalCompleted = checkins.length;

  // No Dia 7, a caixa misteriosa é desabilitada se houver falhas/gaps nos dias anteriores
  // ou se não concluiu os dias de 1 a 6
  const isMysteryBlocked = isInterrupted || (currentCheckinDay === 7 && totalCompleted < 6);

  const handleClaim = async () => {
    if (!studentId) return;
    if (!alreadyParticipated) {
      toast({
        title: "Participação Pendente",
        description: "Você precisa enviar e validar a foto do uniforme hoje antes de fazer o check-in!",
        variant: "destructive"
      });
      return;
    }
    if (alreadyCheckedInToday) {
      toast({
        title: "Check-in já realizado",
        description: `Você já garantiu seu bônus do Dia ${currentCheckinDay}!`,
      });
      return;
    }

    if (currentCheckinDay === 7 && isMysteryBlocked) {
      toast({
        title: "Caixa Misteriosa Bloqueada 🔒",
        description: "Você não participou de todos os dias anteriores sem interrupção.",
        variant: "destructive"
      });
      return;
    }

    setIsClaiming(true);
    const rewardInfo = CHECKIN_VALUES.find(c => c.dia === currentCheckinDay);
    const rewardValue = rewardInfo ? rewardInfo.valor : 10;

    try {
      // Chama a função atômica no banco de dados via RPC do Supabase com travas de segurança
      const { data, error } = await (supabase as any).rpc('resgatar_cashbit_diario', {
        p_aluno_id: Number(studentId),
        p_dia_checkin: currentCheckinDay
      });

      if (error) throw error;

      const novoSaldo = Number(data);
      setSaldo(novoSaldo);
      
      toast({
        title: `Dia ${currentCheckinDay} Concluído! 🎉`,
        description: `Você resgatou +${rewardValue} CashBITs com sucesso!`,
      });

      // Atualiza caches locais para consistência de dados
      const user = JSON.parse(localStorage.getItem('usuario') || '{}');
      user.bitcash = novoSaldo;
      localStorage.setItem('usuario', JSON.stringify(user));
      
      const studentSession = JSON.parse(localStorage.getItem('bit_student_session') || '{}');
      studentSession.bitcash = novoSaldo;
      localStorage.setItem('bit_student_session', JSON.stringify(studentSession));

      if (onCheckinSuccess) {
        onCheckinSuccess();
      }

      // Recarrega checkins para refletir no modal
      await fetchCheckins();
    } catch (err: any) {
      console.error("Erro ao resgatar checkin:", err);
      toast({
        title: "Erro no Resgate",
        description: err.message || "Ocorreu um erro ao processar seu check-in. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-md mx-auto rounded-3xl p-5 sm:p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
        <DialogHeader className="text-center space-y-2 shrink-0">
          <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 shrink-0">
            <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-bounce" />
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-school-blue-700 dark:text-white uppercase tracking-tight flex items-center justify-center gap-2 text-center">
            Campanha de Lançamento
          </DialogTitle>
          <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium max-w-sm mx-auto text-center leading-relaxed">
            Valide seu uniforme todos os dias e resgate bônus progressivos! A sua sequência de 7 dias é mantida sempre ativa.
          </DialogDescription>
        </DialogHeader>

        {/* Corpo Interno (Rolagem Encapulada) */}
        <div className="flex-1 overflow-y-auto py-2 my-1 space-y-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
          {/* Timeline/Trilha de 7 dias */}
          <div className="flex overflow-x-auto gap-2 pb-2 px-1 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CHECKIN_VALUES.map((item) => {
              const claimedRecord = checkins.find(c => c.dia_checkin === item.dia);
              const isClaimed = !!claimedRecord;
              
              const isCurrent = item.dia === currentCheckinDay;
                
              const isFuture = item.dia > currentCheckinDay;
                
              const isMissed = isCampaignActive
                ? (item.dia < currentCheckinDay && !isClaimed)
                : isAfterCampaign && !isClaimed;

              let cardStyle = "";
              let coinStyle = "";

              if (isClaimed) {
                cardStyle = "border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 text-emerald-800 dark:text-emerald-400 shadow-sm";
                coinStyle = "text-emerald-600 bg-emerald-200/50 dark:bg-emerald-900/50";
              } else if (isCurrent) {
                cardStyle = "border-school-blue-500 dark:border-school-blue-400 bg-white dark:bg-zinc-900 text-school-blue-700 dark:text-white shadow-md ring-2 ring-school-blue-400/30 animate-pulse";
                coinStyle = "text-school-blue-600 bg-school-blue-50 dark:bg-school-blue-950/50";
              } else if (isMissed) {
                cardStyle = "border-red-200 dark:border-red-950/40 bg-red-50/20 dark:bg-red-950/5 text-red-500 dark:text-red-400/70 opacity-70";
                coinStyle = "text-red-400 dark:text-red-400/70 bg-red-100/20 dark:bg-red-950/20";
              } else {
                cardStyle = "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-400";
                coinStyle = "text-zinc-400 bg-zinc-100 dark:bg-zinc-800";
              }

              const isDay7 = item.dia === 7;

              return (
                <div
                  key={item.dia}
                  className={`flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-2xl border min-w-[68px] sm:min-w-[76px] h-20 sm:h-24 shrink-0 snap-align-start transition-all duration-300 ${cardStyle}`}
                >
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Dia {item.dia}</span>
                    <span className="text-[8px] sm:text-[9px] font-medium opacity-80 mt-0.5">{item.dataText}</span>
                  </div>
                  
                  {isDay7 ? (
                    <div className="relative shrink-0">
                      {isClaimed ? (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3px]" />
                        </div>
                      ) : (
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${isCurrent && !isMysteryBlocked ? 'bg-amber-500 text-white animate-bounce' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                          {isMysteryBlocked ? <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-red-500/80" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 ${coinStyle}`}>
                      {isClaimed ? (
                        <Check className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[3px]" />
                      ) : (
                        <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </div>
                  )}

                  {isDay7 ? (
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400 leading-none">Misterio</span>
                  ) : (
                    <span className="text-xs font-black leading-none">+{item.valor}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Barra de progresso */}
          <div className="mt-4 space-y-1 px-1">
            <div className="flex justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <span>Seu progresso da semana</span>
              <span>{totalCompleted}/7 dias</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden border border-zinc-200/50 dark:border-zinc-800">
              <div 
                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(totalCompleted / 7) * 100}%` }}
              />
            </div>
          </div>

          {/* Alerta de quebra de sequência se o Dia 7 estiver bloqueado por interrupção */}
          {isInterrupted && (
            <div className="mt-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 flex items-start gap-2.5 animate-in slide-in-from-top-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-red-800 dark:text-red-400">Sequência Interrompida</h4>
                <p className="text-[11px] text-red-700 dark:text-red-300 font-medium leading-normal mt-0.5">
                  Você pulou dias da campanha. O prêmio misterioso do 7º dia está bloqueado para este ciclo.
                </p>
                <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full text-red-800 dark:text-red-300">
                  não participou todos os dias
                </span>
              </div>
            </div>
          )}

          {/* Dicas/Estado */}
          <div className="mt-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-3.5 flex items-start gap-3">
            {isBeforeCampaign ? (
              <Calendar className="w-5 h-5 text-school-blue-500 shrink-0 mt-0.5" />
            ) : isAfterCampaign ? (
              <AlertCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
            ) : alreadyCheckedInToday ? (
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : !alreadyParticipated ? (
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-school-blue-500 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1 flex-1 min-w-0">
              {isBeforeCampaign ? (
                <>
                  <p className="font-bold text-school-blue-600 dark:text-school-blue-400">Lançamento em 03/08 🚀</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    A Campanha de Lançamento estará disponível a partir de 03/08/2026. Prepare seu uniforme!
                  </p>
                </>
              ) : isAfterCampaign ? (
                <>
                  <p className="font-bold text-zinc-550 dark:text-zinc-400">Campanha Encerrada 🏁</p>
                  <p className="text-zinc-550 dark:text-zinc-455 leading-normal">
                    A Campanha de Lançamento encerrou-se em 11/08/2026. Agradecemos a participação de todos!
                  </p>
                </>
              ) : isWeekendPause ? (
                <>
                  <p className="font-bold text-amber-600 dark:text-amber-400">Pausa de Fim de Semana 📅</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    A campanha de lançamento ocorre apenas em dias letivos (segunda a sexta). Nos vemos na segunda-feira para o Dia 6!
                  </p>
                </>
              ) : !alreadyParticipated ? (
                <>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">Uniforme pendente de validação</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    Para habilitar o resgate do check-in do Dia {currentCheckinDay}, você precisa primeiro enviar e obter sucesso na validação da foto do uniforme.
                  </p>
                </>
              ) : alreadyCheckedInToday ? (
                <>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">Recompensa do Dia {currentCheckinDay} Concluída! ✅</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    Você já resgatou seu bônus do Dia {currentCheckinDay}.
                  </p>
                </>
              ) : !hasClaimedDay1 ? (
                <>
                  <p className="font-bold text-school-blue-600 dark:text-school-blue-400">Resgate Retroativo do Dia 1 (03/08) Liberado! 🎉</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    Você tem o bônus pendente do Dia 1 (03/08). Clique no botão abaixo para garantir os **+5 CashBITs** antes de prosseguir!
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-school-blue-600 dark:text-school-blue-400">Check-in do Dia {currentCheckinDay} Liberado! 🎉</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    Você já validou seu uniforme! Clique no botão abaixo para resgatar o bônus do **Dia {currentCheckinDay}**.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botão de Ação */}
        <div className="flex flex-col gap-2 shrink-0 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          {isBeforeCampaign ? (
            <Button
              disabled
              className="w-full h-12 text-sm font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-450 border border-zinc-200 dark:border-zinc-700/50 rounded-xl cursor-not-allowed flex items-center justify-center gap-2 opacity-75 animate-pulse"
            >
              Lançamento em 03/08
            </Button>
          ) : isAfterCampaign ? (
            <Button
              disabled
              className="w-full h-12 text-sm font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-450 border border-zinc-200 dark:border-zinc-700/50 rounded-xl cursor-not-allowed flex items-center justify-center gap-2 opacity-75"
            >
              Campanha Encerrada
            </Button>
          ) : isWeekendPause ? (
            <Button
              disabled
              className="w-full h-12 text-sm font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700/50 rounded-xl cursor-not-allowed flex items-center justify-center gap-2 opacity-75"
            >
              Próximo check-in: Segunda-feira (10/08)
            </Button>
          ) : !alreadyParticipated ? (
            <Button
              disabled
              className="w-full h-12 text-sm font-bold bg-school-blue-500/10 text-school-blue-600 dark:bg-school-blue-500/15 dark:text-school-blue-400 border border-school-blue-500/20 rounded-xl cursor-not-allowed opacity-75"
            >
              Envie a foto do Uniforme primeiro
            </Button>
          ) : alreadyCheckedInToday ? (
            <Button
              disabled
              className="w-full h-12 text-sm font-bold bg-emerald-500/10 text-emerald-600 dark:emerald-400 border border-emerald-500/20 rounded-xl cursor-not-allowed opacity-75"
            >
              Recompensa Resgatada hoje
            </Button>
          ) : currentCheckinDay === 7 && isMysteryBlocked ? (
            <Button
              disabled
              className="w-full h-12 text-sm font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700/50 rounded-xl cursor-not-allowed flex items-center justify-center gap-2 opacity-60"
            >
              <Lock className="w-4 h-4" /> Caixa Misteriosa Bloqueada
            </Button>
          ) : (
            <Button
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full h-12 text-sm font-black bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-yellow-950 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-98 transition-all duration-300 uppercase tracking-wider flex items-center justify-center gap-2 border border-yellow-300/30 dark:border-yellow-400/25"
            >
              {isClaiming ? "Processando..." : (
                <>
                  <Sparkles className="w-5 h-5" /> 
                  {!hasClaimedDay1 ? "Resgatar Dia 1 (03/08) +5 CashBIT" : `Resgatar Dia ${currentCheckinDay}`}
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full h-11 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all uppercase tracking-wider"
          >
            FECHAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default DailyCheckinModal;
