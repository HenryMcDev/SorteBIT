import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, RefreshCw, Search, Users, Shield, User, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { getBackendUrl } from '@/utils/backendUrl';
import { Button } from '@/components/ui/button';

interface ClassCode {
  id: string;
  code: string;
  turma?: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  is_expired: boolean;
  professor_name: string;
  use_count: number;
}

const ClassCodeManager = () => {
  const [classCodes, setClassCodes] = useState<ClassCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const { toast } = useToast();

  const fetchClassCodes = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data: classCodesData, error: classCodesError } = await supabase
        .from('class_codes' as any)
        .select(`
          id,
          code,
          turma,
          created_at,
          expires_at,
          is_active,
          professor_id,
          professores (
            nome
          )
        `)
        .order('created_at', { ascending: false });

      if (classCodesError) {
        throw classCodesError;
      }

      const { data: participationsData, error: partError } = await supabase
        .from('lottery_participations' as any)
        .select('daily_code, created_at');

      if (partError) {
        console.error('Erro ao buscar participações:', partError);
      }

      const mappedCodes = (classCodesData || []).map((cc: any) => {
        const codeCreated = new Date(cc.created_at).getTime();
        const codeExpires = new Date(cc.expires_at).getTime();
        
        const matches = (participationsData || []).filter((p: any) => {
          if (p.daily_code !== cc.code) return false;
          const partTime = new Date(p.created_at).getTime();
          return partTime >= codeCreated && partTime <= codeExpires;
        });

        const isExpired = Date.now() > codeExpires || !cc.is_active;

        return {
          id: cc.id,
          code: cc.code,
          turma: cc.turma,
          created_at: cc.created_at,
          expires_at: cc.expires_at,
          is_active: cc.is_active,
          is_expired: isExpired,
          professor_name: cc.professores?.nome || 'Desconhecido',
          use_count: matches.length
        };
      });

      setClassCodes(mappedCodes);
    } catch (error: any) {
      console.error('Erro ao buscar códigos de aula:', error);
      if (!silent) {
        toast({
          title: 'Erro ao carregar',
          description: error.message || 'Não foi possível carregar a lista de códigos de aula.',
          variant: 'destructive',
        });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Poll class codes every 10 seconds
  useEffect(() => {
    fetchClassCodes();

    const pollInterval = setInterval(() => {
      fetchClassCodes(true);
    }, 10000);

    return () => clearInterval(pollInterval);
  }, []);

  // Update current time every second for active countdowns
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // Format creation time to HH:mm:ss
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return dateString;
    }
  };

  // Get status details (is_active and time remaining)
  const getStatusBadge = (item: ClassCode) => {
    const expiresTime = new Date(item.expires_at).getTime();
    const remainingSeconds = Math.max(0, Math.floor((expiresTime - currentTime) / 1000));

    if (remainingSeconds > 0 && item.is_active && !item.is_expired) {
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm animate-pulse">
          <Clock className="w-3 h-3" />
          Ativo ({formattedTime})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/10 shadow-sm">
        <AlertCircle className="w-3 h-3 text-zinc-500" />
        Expirado
      </span>
    );
  };

  const filteredCodes = classCodes.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.code.toLowerCase().includes(searchLower) ||
      item.professor_name.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-150 dark:border-zinc-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/20 dark:border-blue-500/30">
            <Shield className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-950 dark:text-white text-lg tracking-tight">Monitoramento de Códigos de Aula</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Acompanhe e audite os códigos gerados pelos professores em tempo real.</p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => fetchClassCodes()}
          disabled={isLoading}
          className="flex items-center gap-2 h-10 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-750 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold transition-all px-4 rounded-xl"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar por professor ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-11 pl-10 pr-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* Table Section */}
      {isLoading && classCodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-semibold tracking-wide">Carregando códigos de aula...</p>
        </div>
      ) : filteredCodes.length > 0 ? (
        <div className="overflow-x-auto overflow-y-auto max-h-[450px] border border-zinc-200 dark:border-zinc-800/80 rounded-xl relative">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800/80">
              <tr className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 select-none">
                <th className="py-3.5 px-4 font-bold">Código</th>
                <th className="py-3.5 px-4 font-bold">Turma</th>
                <th className="py-3.5 px-4 font-bold">Professor</th>
                <th className="py-3.5 px-4 font-bold">Gerado em</th>
                <th className="py-3.5 px-4 font-bold text-center">Uso</th>
                <th className="py-3.5 px-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-sm">
              {filteredCodes.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                  <td className="py-4 px-4 font-mono font-black text-blue-600 dark:text-blue-400 tracking-wider text-base">
                    {item.code}
                  </td>
                  <td className="py-4 px-4 font-semibold text-zinc-900 dark:text-zinc-150">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/15">
                      {item.turma || 'TCG01'}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-semibold text-zinc-900 dark:text-zinc-150">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-500 border border-blue-500/10">
                        {item.professor_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[180px]">{item.professor_name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-zinc-500 dark:text-zinc-400 font-mono">
                    {formatTime(item.created_at)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="inline-flex items-center justify-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded-lg text-xs font-semibold border border-zinc-200/50 dark:border-zinc-700/50">
                      <Users className="w-3 h-3 text-zinc-400" />
                      {item.use_count}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {getStatusBadge(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
            <User className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">Nenhum código encontrado</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-450 max-w-xs mx-auto">
              {searchTerm 
                ? "Nenhum resultado corresponde à sua pesquisa. Tente buscar por outros termos." 
                : "Nenhum código de aula foi gerado por professores recentemente."}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ClassCodeManager;
