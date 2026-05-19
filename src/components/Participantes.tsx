import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Users, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Participant {
  name: string;
  count: number;
}

const Participantes = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchParticipants = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('lottery_participations')
        .select('name');

      if (error) {
        throw error;
      }

      if (data) {
        // Lógica de agrupamento e soma
        const counts: Record<string, number> = {};
        data.forEach((row) => {
          const name = row.name?.trim() || 'Desconhecido';
          counts[name] = (counts[name] || 0) + 1;
        });

        // Converter para array e ordenar (alfabético ou por quantidade, escolhemos alfabético)
        const grouped = Object.entries(counts).map(([name, count]) => ({
          name,
          count,
        }));

        grouped.sort((a, b) => a.name.localeCompare(b.name));

        setParticipants(grouped);
      }
    } catch (error: any) {
      console.error('Erro ao buscar participantes:', error);
      setErrorMsg(error?.message || 'Erro inesperado de comunicação com o Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  return (
    <Card className="p-6 md:p-8 shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl w-full max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 shadow-inner">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-800 dark:text-white">
              Lista de Participantes
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Alunos concorrendo no sorteio
            </p>
          </div>
        </div>

        <Button
          onClick={fetchParticipants}
          disabled={isLoading}
          className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-md transition-all duration-200 rounded-xl px-6 h-12 w-full sm:w-auto active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Lista
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/50 shadow-sm">
        <div className="w-full max-h-[550px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-zinc-900/50 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/80">
                <th className="sticky top-0 z-10 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-sm px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-300 shadow-[0_1px_0_0_rgba(228,228,231,0.8)] dark:shadow-[0_1px_0_0_rgba(39,39,42,0.8)]">
                  Participante
                </th>
                <th className="sticky top-0 z-10 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-sm px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-300 text-right md:text-center w-1/3 shadow-[0_1px_0_0_rgba(228,228,231,0.8)] dark:shadow-[0_1px_0_0_rgba(39,39,42,0.8)]">
                  Total de Cupons / Participações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
              {participants.length > 0 ? (
                participants.map((p, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {p.name}
                    </td>
                    <td className="px-6 py-4 text-right md:text-center">
                      <span className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-bold rounded-full bg-blue-100/80 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/30 shadow-sm">
                        {p.count} {p.count === 1 ? 'Cupom' : 'Cupons'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-6 py-16 text-center">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <RefreshCw className="w-8 h-8 text-blue-500/50 animate-spin" />
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Buscando dados no Supabase...</p>
                      </div>
                    ) : errorMsg ? (
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-red-100/50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 flex items-center justify-center">
                          <AlertCircle className="w-7 h-7 text-red-500 dark:text-red-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-red-600 dark:text-red-400 font-semibold">
                            Erro ao carregar participantes
                          </p>
                          <p className="text-red-500 dark:text-red-500/80 text-sm max-w-md mx-auto">
                            {errorMsg}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                          <AlertCircle className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-zinc-600 dark:text-zinc-300 font-semibold">
                            Nenhum participante encontrado
                          </p>
                          <p className="text-zinc-500 dark:text-zinc-500 text-sm">
                            Ainda não há alunos cadastrados no sorteio.
                          </p>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default Participantes;
