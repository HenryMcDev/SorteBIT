import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Star, MessageSquareWarning, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FeedbackPendentes {
  id: string;
  nome_aluno: string;
  nota: number;
  comentario: string;
  created_at: string;
  aprovado: boolean;
}

const FeedbackModeration = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackPendentes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPendentes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Erro ao buscar feedbacks pendentes:', error);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível carregar os comentários pendentes.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendentes();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setActionLoadingId(id);
      const { error } = await (supabase as any)
        .from('feedbacks')
        .update({ aprovado: true })
        .eq('id', id);

      if (error) throw error;

      setFeedbacks((prev) => prev.map(f => f.id === id ? { ...f, aprovado: true } : f));
      toast({
        title: "Comentário Aprovado!",
        description: "O feedback agora está visível no Mural da Galera.",
      });
    } catch (error: any) {
      console.error('Erro detalhado no Supabase:', {
        message: error?.message,
        details: error?.details,
        fullError: error
      });
      toast({
        title: "Erro ao aprovar",
        description: error?.message || "Não foi possível atualizar o status do comentário.",
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionLoadingId(id);
      const { error } = await (supabase as any)
        .from('feedbacks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFeedbacks((prev) => prev.filter(f => f.id !== id));
      toast({
        title: "Comentário Rejeitado e Excluído",
        description: "O registro foi apagado permanentemente.",
        variant: "destructive" // Usando destructive pra dar a conotação de exclusão
      });
    } catch (error: any) {
      console.error('Erro ao excluir feedback:', error);
      toast({
        title: "Erro ao excluir",
        description: error?.message || "Não foi possível deletar o comentário do banco.",
        variant: "destructive"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] shadow-xl border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden">
      {/* Header Fixo */}
      <div className="flex-none p-6 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-school-blue-50 dark:bg-school-blue-900/20 border border-school-blue-100 dark:border-school-blue-800/30">
              <MessageSquareWarning className="w-5 h-5 text-school-blue-600 dark:text-school-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-school-blue-800 dark:text-white">Moderação e Histórico</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Histórico completo de feedbacks enviados pelos alunos.
              </p>
            </div>
          </div>
          
          <Button
            onClick={fetchPendentes}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2 border-school-blue-200 text-school-blue-700 hover:bg-school-blue-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:bg-zinc-900 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </Button>
        </div>
      </div>

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-school-blue-500" />
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Buscando feedbacks...</p>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium text-gray-500 dark:text-zinc-400">Tudo limpo por aqui!</p>
            <p className="text-sm text-gray-400 dark:text-zinc-500">Nenhum comentário aguardando moderação.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {feedbacks.map((feedback) => (
              <Card key={feedback.id} className="p-5 border border-gray-100 shadow-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 transition-all hover:border-school-blue-200 dark:hover:border-zinc-700">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  {/* Info do Comentário */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-bold text-school-blue-800 dark:text-zinc-100 text-lg">
                        {feedback.nome_aluno}
                      </span>
                      {feedback.aprovado && (
                        <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-md border border-green-200 dark:border-green-800/50 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Aprovado
                        </span>
                      )}
                      <div className="flex gap-1 bg-school-yellow-50 dark:bg-school-yellow-900/10 px-2 py-1 rounded-full border border-school-yellow-100 dark:border-school-yellow-900/30">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < feedback.nota
                                ? 'fill-school-yellow-400 text-school-yellow-400 dark:fill-school-yellow-500 dark:text-school-yellow-500'
                                : 'fill-transparent text-gray-300 dark:text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-zinc-300 text-sm leading-relaxed mb-1">
                      "{feedback.comentario}"
                    </p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">
                      Enviado em {new Date(feedback.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  {/* Ações */}
                  {!feedback.aprovado && (
                    <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-0 border-gray-100 dark:border-zinc-800">
                      <Button
                        onClick={() => handleApprove(feedback.id)}
                        disabled={actionLoadingId === feedback.id}
                        className="flex-1 md:flex-none h-10 px-4 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800/50 transition-all shadow-none"
                      >
                        {actionLoadingId === feedback.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <><CheckCircle2 className="w-5 h-5 mr-1" /> Aprovar</>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleReject(feedback.id)}
                        disabled={actionLoadingId === feedback.id}
                        className="flex-1 md:flex-none h-10 w-12 px-0 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/30 transition-all shadow-none flex items-center justify-center"
                        title="Excluir Comentário"
                      >
                        {actionLoadingId === feedback.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default FeedbackModeration;
