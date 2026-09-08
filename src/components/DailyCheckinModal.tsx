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
  const [totalParticipacoes, setTotalParticipacoes] = useState(0);
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

      const count = participations ? participations.length : 0;
      setTotalParticipacoes(count);

      if (participations && participations.length > 0) {
        const today = new Date();
        const hasToday = participations.some(p => {
          const pDate = new Date(p.participation_date);
          return pDate.getDate() === today.getDate() &&
                 pDate.getMonth() === today.getMonth() &&
                 pDate.getFullYear() === today.getFullYear();
        });
        
        // Libera se houver hoje no banco ou se o prop já indica participação hoje
        setAlreadyParticipated(hasToday || propAlreadyParticipated);
      } else {
        setAlreadyParticipated(propAlreadyParticipated);
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
  const campaignEnd = new Date(2026, 7, 14, 23, 59, 59, 999); // 14/08/2026
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

  // Total de check-ins concluídos pelo usuário
  const totalCompleted = checkins.length;

  // Lógica de resgate acumulado baseada nas participações validadas (check-ins)
  const diasPendentes = CHECKIN_VALUES
    .filter((item) => item.dia <= totalParticipacoes && !checkins.some((c) => c.dia_checkin === item.dia))
    .map((item) => item.dia);

  const totalCashbitJaResgatadoNaCampanha = checkins.reduce((sum, c) => sum + (c.cashbit_ganho || 0), 0);

  const saldoPendente = CHECKIN_VALUES
    .filter((item) => diasPendentes.includes(item.dia))
    .reduce((sum, item) => sum + item.valor, 0);

  const saldoDisponivelComTeto = Math.max(
    0,
    Math.min(saldoPendente, 150 - totalCashbitJaResgatadoNaCampanha)
  );

  // Indica se já atingiu o teto da campanha
  const limiteAtingido = totalCashbitJaResgatadoNaCampanha >= 150;

  // Indica se hoje já realizou participação de foto e check-in (para estados informativos)
  const alreadyCheckedInToday = checkins.some((c) => {
    const cDate = new Date(c.data_resgate);
    return cDate.getDate() === today.getDate() &&
           cDate.getMonth() === today.getMonth() &&
           cDate.getFullYear() === today.getFullYear();
  });

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
    if (diasPendentes.length === 0) {
      toast({
        title: "Nenhuma Recompensa Pendente",
        description: "Você já resgatou todas as suas recompensas liberadas!",
      });
      return;
    }

    setIsClaiming(true);
    try {
      let novoSaldo = currentBalance;
      // Loop sequencial para resgatar todos os dias pendentes
      for (const dia of diasPendentes) {
        const { data, error } = await (supabase as any).rpc('resgatar_cashbit_diario', {
          p_aluno_id: Number(studentId),
          p_dia_checkin: dia
        });

        if (error) throw error;
        novoSaldo = Number(data);
      }

      setSaldo(novoSaldo);
      
      toast({
        title: `Bônus Resgatado! 🎉`,
        description: `Você resgatou +${saldoDisponivelComTeto} CashBITs acumulados com sucesso!`,
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
              const isClaimed = checkins.some(c => c.dia_checkin === item.dia);
              const isEligible = item.dia <= totalParticipacoes && !isClaimed;
              const isLocked = item.dia > totalParticipacoes;

              let cardStyle = "";
              let coinStyle = "";

              if (isClaimed) {
                cardStyle = "border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 text-emerald-800 dark:text-emerald-400 shadow-sm";
                coinStyle = "text-emerald-600 bg-emerald-200/50 dark:bg-emerald-900/50";
              } else if (isEligible) {
                cardStyle = "border-school-blue-500 dark:border-school-blue-400 bg-white dark:bg-zinc-900 text-school-blue-700 dark:text-white shadow-md ring-2 ring-school-blue-400/30 animate-pulse";
                coinStyle = "text-school-blue-600 bg-school-blue-50 dark:bg-school-blue-950/50";
              } else {
                cardStyle = "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-400 opacity-75";
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
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${isEligible ? 'bg-amber-500 text-white animate-bounce' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                          {isLocked ? <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />}
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

          {/* Dicas/Estado */}
          <div className="mt-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-3.5 flex items-start gap-3">
            {isBeforeCampaign ? (
              <Calendar className="w-5 h-5 text-school-blue-500 shrink-0 mt-0.5" />
            ) : isAfterCampaign ? (
              <AlertCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
            ) : limiteAtingido ? (
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            ) : !alreadyParticipated ? (
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            ) : diasPendentes.length > 0 ? (
              <Sparkles className="w-5 h-5 text-school-blue-500 shrink-0 mt-0.5" />
            ) : (
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1 flex-1 min-w-0">
              {isBeforeCampaign ? (
                <>
                  <p className="font-bold text-school-blue-600 dark:text-school-blue-400">Lançamento em 03/08 🚀</p>
                  <p className="text-zinc-550 dark:text-zinc-400 leading-normal">
                    A Campanha de Lançamento estará disponível a partir de 03/08/2026. Prepare seu uniforme!
                  </p>
                </>
              ) : isAfterCampaign ? (
                <>
                  <p className="font-bold text-zinc-500 dark:text-zinc-400">Campanha Encerrada 🏁</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    A Campanha de Lançamento encerrou-se em 14/08/2026. Agradecemos a participação de todos!
                  </p>
                </>
              ) : limiteAtingido ? (
                <>
                  <p className="font-bold text-amber-600 dark:text-amber-400">Limite de Bônus Atingido 🎉</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    Você já resgatou o limite máximo de **150 CashBITs** nesta campanha! Muito obrigado pela participação!
                  </p>
                </>
              ) : isWeekendPause ? (
                <>
                  <p className="font-bold text-amber-600 dark:text-amber-400">Pausa de Fim de Semana 📅</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    A campanha de lançamento ocorre apenas em dias letivos (segunda a sexta). Nos vemos na segunda-feira!
                  </p>
                </>
              ) : !alreadyParticipated ? (
                <>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">Uniforme pendente de validação</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    Você precisa enviar e obter sucesso na validação da foto do uniforme de hoje para liberar seus resgates pendentes.
                  </p>
                </>
              ) : diasPendentes.length > 0 ? (
                <>
                  <p className="font-bold text-school-blue-600 dark:text-school-blue-400">Recompensas Acumuladas Disponíveis! 🎉</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    Você possui **{diasPendentes.length}** {diasPendentes.length === 1 ? 'nível pendente' : 'níveis pendentes'} para resgate. Clique abaixo para resgatar todos acumulados!
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">Tudo resgatado! ✅</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">
                    Você já resgatou todos os bônus liberados pelas suas {totalParticipacoes} participações. Envie mais fotos do uniforme nos próximos dias para liberar novos níveis!
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
          ) : limiteAtingido ? (
            <Button
              disabled
              className="w-full h-12 text-sm font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl cursor-not-allowed opacity-75"
            >
              Bônus Máximo Atingido (150 CashBITs)
            </Button>
          ) : isWeekendPause ? (
            <Button
              disabled
              className="w-full h-12 text-sm font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700/50 rounded-xl cursor-not-allowed flex items-center justify-center gap-2 opacity-75"
            >
              Próximo check-in: Segunda-feira
            </Button>
          ) : !alreadyParticipated ? (
            <Button
              disabled
              className="w-full h-12 text-sm font-bold bg-school-blue-500/10 text-school-blue-600 dark:bg-school-blue-500/15 dark:text-school-blue-400 border border-school-blue-500/20 rounded-xl cursor-not-allowed opacity-75"
            >
              Envie a foto do Uniforme primeiro
            </Button>
          ) : diasPendentes.length > 0 ? (
            <Button
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full h-12 text-sm font-black bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-yellow-950 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-98 transition-all duration-300 uppercase tracking-wider flex items-center justify-center gap-2 border border-yellow-300/30 dark:border-yellow-400/25"
            >
              {isClaiming ? "Processando..." : (
                <>
                  <Sparkles className="w-5 h-5" /> 
                  Resgatar Bônus Acumulado (+{saldoDisponivelComTeto} CashBIT)
                </>
              )}
            </Button>
          ) : alreadyCheckedInToday ? (
            <Button
              disabled
              className="w-full h-12 text-sm font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl cursor-not-allowed opacity-75"
            >
              Recompensa Resgatada hoje
            </Button>
          ) : (
            <Button
              disabled
              className="w-full h-12 text-sm font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700/50 rounded-xl cursor-not-allowed opacity-75"
            >
              Nenhuma Recompensa Pendente
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
