import { useState, useEffect } from "react";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { supabase } from "@/integrations/supabase/client";
import { PremioCard, Premio } from "@/components/PremioCard";
import StudentNavbar from "@/components/StudentNavbar";
import DesktopBlocker from "@/components/DesktopBlocker";
import { Navigate } from "react-router-dom";
import { PackageOpen, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Nome do bucket no Supabase Storage onde as fotos dos prêmios são armazenadas
const PREMIOS_BUCKET = 'premios_imagens';

const Vitrine = () => {
  const isMobile = useMobileDetection();
  const { studentUser, isAuthenticated, logout } = useStudentAuth();
  const [premios, setPremios] = useState<Premio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPremios = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('premios')
        .select('id, nome, valor, descricao, foto, estoque')
        .order('id', { ascending: false });

      if (fetchError) throw fetchError;

      // Converte o caminho relativo de cada prêmio em URL pública do Supabase Storage.
      // Caso a coluna `foto` já seja uma URL absoluta (legado), ela é usada diretamente.
      const premiosComFoto: Premio[] = (data || []).map((item: any) => {
        let fotoUrl = item.foto || '';
        if (fotoUrl && !fotoUrl.startsWith('http')) {
          const { data: storageData } = supabase.storage
            .from(PREMIOS_BUCKET)
            .getPublicUrl(fotoUrl);
          fotoUrl = storageData?.publicUrl || '';
        }
        return { ...item, foto: fotoUrl } as Premio;
      });

      setPremios(premiosComFoto);
    } catch (err: any) {
      console.error("Erro ao buscar prêmios:", err);
      setError("Não foi possível carregar a vitrine de prêmios neste momento. Verifique a conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPremios();
  }, []);

  if (!isMobile) {
    return <DesktopBlocker />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleResgatar = async (id: number) => {
    if (!studentUser?.id) return;
    if (isProcessing) return;

    // Validação de segurança: apenas entre os dias 1 e 10 de cada mês (COMENTADO PARA TESTES)
    /*
    const currentDay = new Date().getDate();
    if (currentDay < 1 || currentDay > 10) {
      toast({
        title: "Período encerrado",
        description: "Solicitações de resgate de prêmios só são permitidas entre os dias 01 e 10 de cada mês.",
        variant: "destructive",
      });
      return;
    }
    */

    const premio = premios.find(p => p.id === id);
    if (!premio) {
      toast({
        title: "Erro",
        description: "Prêmio não encontrado.",
        variant: "destructive",
      });
      return;
    }

    const custoPremio = premio.valor;
    const premioId = premio.id;

    if (premio.estoque !== null && premio.estoque <= 0) {
      toast({
        title: "Produto esgotado",
        description: "Este prêmio não está mais disponível no estoque.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Não confie no localStorage! Busca o saldo REAL e atualizado do banco de dados agora mesmo
      const { data: estudanteReal, error: erroEstudante } = await supabase
        .from('estudantes' as any)
        .select('bitcash')
        .eq('id', studentUser.id)
        .maybeSingle();

      if (erroEstudante || !estudanteReal) {
        toast({
          title: "Erro ao verificar dados",
          description: "Erro ao verificar seus dados. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      const bitcashReal = (estudanteReal as any).bitcash || 0;

      // 2. Compara com o saldo vindo direto do BANCO DE DADOS
      if (bitcashReal < custoPremio) {
        toast({
          title: "Saldo insuficiente",
          description: `Saldo insuficiente! Seu saldo real é ${bitcashReal} CashBIT.`,
          variant: "destructive",
        });

        // Correção de segurança: Atualiza o localStorage do espertinho com o valor real para travar a tela dele
        const dadosLocais = JSON.parse(localStorage.getItem('bit_student_session') || '{}');
        dadosLocais.bitcash = bitcashReal;
        localStorage.setItem('bit_student_session', JSON.stringify(dadosLocais));
        
        // Recarrega a página para atualizar o estado do auth e travar a tela
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        return; // Barra o resgate aqui!
      }

      // 3. Executa o resgate de forma atômica no banco de dados via RPC
      const { error: rpcError } = await (supabase as any)
        .rpc('resgatar_premio', {
          p_aluno_id: studentUser.id,
          p_produto_id: premioId
        });

      if (rpcError) throw rpcError;

      const novoSaldoNum = bitcashReal - custoPremio;

      // Sincroniza estoque local se aplicável
      if (premio.estoque !== null) {
        const novoEstoque = Math.max(0, premio.estoque - 1);
        setPremios(prev => prev.map(p => p.id === premio.id ? { ...p, estoque: novoEstoque } : p));
      }

      // Atualiza o localStorage com o novo saldo
      const dadosLocais = JSON.parse(localStorage.getItem('bit_student_session') || '{}');
      dadosLocais.bitcash = novoSaldoNum;
      localStorage.setItem('bit_student_session', JSON.stringify(dadosLocais));

      toast({
        title: "Sucesso!",
        description: "Prêmio resgatado com sucesso!",
      });

      // Recarrega a página após o sucesso para sincronizar o estado geral do estudanteUser
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error(error);
      toast({
        title: "Erro no resgate",
        description: "Ocorreu um erro ao processar o seu resgate. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSkeletons = () => {
    return Array.from({ length: 4 }).map((_, index) => (
      <Card key={index} className="flex flex-row items-center gap-4 p-3.5 md:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 w-full">
        {/* Imagem placeholder */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl animate-pulse shrink-0"></div>
        {/* Conteúdo */}
        <div className="flex flex-col justify-between flex-1 min-w-0 space-y-3">
          <div className="space-y-2">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full"></div>
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-5/6"></div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800/50">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-16"></div>
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-24"></div>
          </div>
        </div>
      </Card>
    ));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-outfit">
      <StudentNavbar
        studentName={studentUser?.name || "Aluno"}
        bitcash={studentUser?.bitcash || 0}
        onLogout={logout}
        studentId={studentUser?.id}
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-school-blue-900 dark:text-white tracking-tight">
            Vitrine de Prêmios
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-2xl">
            Troque seus CashBIT acumulados por prêmios incríveis. Escolha o seu favorito e faça o resgate!
          </p>
        </div>

        {new Date().getDate() > 10 && (
          <div className="mb-6 p-4 border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-2xl flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm md:text-base">Período de Resgates Encerrado</h3>
              <p className="text-xs md:text-sm mt-0.5 text-amber-700 dark:text-amber-400">
                O período de resgates do mês atual está encerrado. Novos pedidos reabrirão no dia 01 do próximo mês.
              </p>
            </div>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30">
            <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2">Ops! Algo deu errado.</h2>
            <p className="text-red-600 dark:text-red-300 max-w-md">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
            {renderSkeletons()}
          </div>
        ) : premios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white dark:bg-zinc-900/50 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
            <div className="w-20 h-20 bg-school-blue-50 dark:bg-school-blue-900/20 rounded-full flex items-center justify-center mb-6">
              <PackageOpen className="w-10 h-10 text-school-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-school-blue-900 dark:text-white mb-2">Vitrine Vazia</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
              Ainda não temos prêmios disponíveis para resgate no momento. Continue acumulando seus CashBIT e volte em breve!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
            {premios.map((premio) => (
              <PremioCard
                key={premio.id}
                premio={premio}
                studentBitcash={studentUser?.bitcash || 0}
                onResgatar={handleResgatar}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Vitrine;
