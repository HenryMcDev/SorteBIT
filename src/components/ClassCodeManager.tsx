import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, RefreshCw, PlusCircle } from 'lucide-react';


interface DailyCode {
  id: string;
  code: string;
  created_at: string;
}

const ClassCodeManager = () => {
  const [currentCode, setCurrentCode] = useState<DailyCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const formatToBrazilTime = (dateString: string) => {
    try {
      // Remove o "Z" e qualquer offset de fuso horário (+00:00, -03:00) 
      // para forçar o construtor Date a assumir o fuso local da máquina,
      // evitando assim aplicar a subtração de horas duplamente.
      const localDateString = dateString.replace(/(Z|[+-]\d{2}(?::?\d{2})?)$/, '');
      const d = new Date(localDateString);

      const formatted = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(d);

      return formatted.replace(/,?\s+/, ' às ');
    } catch {
      return dateString;
    }
  };

  const loadCurrentCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_codes')
        .select('id, code, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      let latestCode = data;

      const isFromToday = (dateString: string) => {
        const date = new Date(dateString.replace(/(Z|[+-]\d{2}(?::?\d{2})?)$/, ''));
        const today = new Date();
        return date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear();
      };

      if (!latestCode || !isFromToday(latestCode.created_at)) {
        const chars = '0123456789';
        let newCode = '';
        for (let i = 0; i < 6; i++) {
          newCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const { data: newCodeData, error: insertError } = await supabase
          .from('daily_codes')
          .insert({ code: newCode })
          .select('id, code, created_at')
          .single();

        if (insertError) throw insertError;
        latestCode = newCodeData;
      }

      setCurrentCode(latestCode);
    } catch (error) {
      console.error('Erro ao carregar código do dia:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o código do dia.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentCode();
  }, []);

  return (
    <Card className="p-6 mb-6 bg-school-blue-50 dark:bg-slate-800 border-2 border-school-blue-200 dark:border-slate-700">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-6 h-6 text-school-blue-700 dark:text-school-blue-300" />
            <h3 className="text-xl font-bold text-school-blue-700 dark:text-school-blue-300">
              Gerador de Código do Dia
            </h3>
          </div>
          <Button
            onClick={loadCurrentCode}
            size="sm"
            disabled={isLoading}
            className="bg-school-blue-500 hover:bg-school-blue-600 text-white shadow-md transition-all duration-200 border-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-xl border-2 border-school-blue-100 dark:border-slate-700 shadow-inner">
          {currentCode ? (
            <div className="text-center space-y-4">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Código Atual</p>
              <div className="text-5xl font-mono font-bold text-school-blue-800 dark:text-white tracking-widest bg-school-yellow-100 dark:bg-zinc-800 py-4 px-8 rounded-lg border-2 border-school-yellow-300 dark:border-zinc-600">
                {currentCode.code}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gerado em: {formatToBrazilTime(currentCode.created_at)}
              </p>
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-6">
              Nenhum código gerado para hoje ainda.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ClassCodeManager;
