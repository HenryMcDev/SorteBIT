import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Premio } from '@/components/PremioCard';

// Nome do bucket no Supabase Storage onde as fotos dos prêmios são armazenadas
const PREMIOS_BUCKET = 'premios_imagens';

interface ListaPremiosProps {
  onEdit?: (premio: Premio) => void;
  refreshTrigger?: number;
}

const ListaPremios = ({ onEdit, refreshTrigger }: ListaPremiosProps) => {
  const [premios, setPremios] = useState<Premio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const { toast } = useToast();

  const fetchPremios = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('premios')
        .select('id, nome, valor, descricao, foto, estoque')
        .order('id', { ascending: false });

      if (error) throw error;
      setPremios(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar prêmios:', err);
      toast({
        title: 'Erro ao carregar prêmios',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPremios();
  }, [refreshTrigger]);

  const getPublicUrl = (fotoPath: string) => {
    if (!fotoPath) return '';
    if (fotoPath.startsWith('http')) return fotoPath;
    const { data } = supabase.storage.from(PREMIOS_BUCKET).getPublicUrl(fotoPath);
    return data?.publicUrl || '';
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este prêmio definitivamente?")) return;
    
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('premios').delete().eq('id', id);
      if (error) throw error;
      
      setPremios(premios.filter(p => p.id !== id));
      toast({
        title: "Prêmio excluído",
        description: "O prêmio foi removido com sucesso."
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao excluir",
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-school-blue-800 dark:text-white border-b border-gray-100 dark:border-zinc-800/80 pb-3">
        Prêmios Cadastrados
      </h3>
      
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-school-blue-500" />
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Carregando prêmios...</p>
        </div>
      ) : premios.length === 0 ? (
        <Card className="p-12 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 border-0 shadow-sm dark:border dark:border-zinc-800 rounded-2xl">
          <ImageIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="font-semibold text-zinc-850 dark:text-zinc-300">Nenhum prêmio cadastrado</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Cadastre novos produtos para que fiquem disponíveis aos alunos.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {premios.map(premio => (
            <Card key={premio.id} className="group relative flex flex-col justify-between overflow-hidden border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl">
              <div className="relative h-40 w-full bg-zinc-50/70 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800/80 overflow-hidden flex items-center justify-center">
                {premio.foto ? (
                  <img 
                    src={getPublicUrl(premio.foto)} 
                    alt={premio.nome} 
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-700">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute top-2.5 right-2.5 bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                  🪙 {premio.valor} CashBIT
                </div>
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">{premio.nome}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[32px] leading-relaxed">
                    {premio.descricao || 'Sem descrição cadastrada.'}
                  </p>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                  <Button 
                    onClick={() => onEdit?.(premio)} 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:border-zinc-800 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-zinc-900 font-semibold rounded-lg text-xs h-8"
                  >
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button 
                    onClick={() => handleDelete(premio.id)} 
                    disabled={isDeleting === premio.id} 
                    size="sm" 
                    variant="outline" 
                    className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:border-red-950/30 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/20 font-semibold rounded-lg text-xs h-8"
                  >
                    {isDeleting === premio.id ? (
                      <Loader2 className="w-3 animate-spin mr-1" />
                    ) : (
                      <Trash2 className="w-3 h-3 mr-1" />
                    )} 
                    Excluir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListaPremios;
