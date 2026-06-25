import { useState, useEffect } from "react";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { supabase } from "@/integrations/supabase/client";
import { PremioCard, Premio } from "@/components/PremioCard";
import StudentNavbar from "@/components/StudentNavbar";
import { PackageOpen, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Nome do bucket no Supabase Storage onde as fotos dos prêmios são armazenadas
const PREMIOS_BUCKET = 'premios_imagens';

const Vitrine = () => {
  const { studentUser, logout } = useStudentAuth();
  const [premios, setPremios] = useState<Premio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const handleResgatar = (id: number) => {
    // Apenas UI por enquanto
    toast({
      title: "Resgate em processamento",
      description: "Funcionalidade de resgate será conectada ao sistema em breve!",
    });
  };

  const renderSkeletons = () => {
    return Array.from({ length: 4 }).map((_, index) => (
      <Card key={index} className="flex flex-col h-full overflow-hidden border border-gray-100 dark:border-zinc-800 rounded-2xl p-0">
        <div className="w-full aspect-square bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-5/6"></div>
          </div>
          <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-16"></div>
            <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-32"></div>
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

        {error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30">
            <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2">Ops! Algo deu errado.</h2>
            <p className="text-red-600 dark:text-red-300 max-w-md">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
