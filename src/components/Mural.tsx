import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Feedback {
  id: string;
  nome_aluno: string;
  nota: number;
  comentario: string;
  created_at: string;
  aprovado: boolean;
}

const Mural = () => {
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [nota, setNota] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const scrollRef = useRef<HTMLDivElement>(null);
  const isInteracting = useRef(false);

  useEffect(() => {
    let animationFrameId: number;

    const animateScroll = () => {
      if (scrollRef.current && !isInteracting.current) {
        scrollRef.current.scrollLeft += 0.5;
        // Se o scroll alcançou a metade (o primeiro array de feedbacks já passou), volta para o 0
        if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth / 2) {
          scrollRef.current.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(animateScroll);
    };

    animationFrameId = requestAnimationFrame(animateScroll);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('feedbacks')
        .select('*')
        .eq('aprovado', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbacks(data as Feedback[] || []);
    } catch (error) {
      console.error('Erro ao buscar feedbacks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();

    // Inscrição em tempo real para refletir a aprovação (UPDATE), nova inclusão (INSERT) ou exclusão (DELETE)
    const channel = supabase
      .channel('feedbacks_mural_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks' },
        (payload: any) => {
          console.log('Evento de tempo real recebido:', payload);
          
          if (payload.eventType === 'INSERT') {
            const novo = payload.new as Feedback;
            if (novo.aprovado) {
              setFeedbacks((prev) => [novo, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const atualizado = payload.new as Feedback;
            setFeedbacks((prev) => {
              if (atualizado.aprovado) {
                // Se já existe na lista, apenas atualiza
                const existe = prev.some((f) => f.id === atualizado.id);
                if (existe) {
                  return prev.map((f) => f.id === atualizado.id ? atualizado : f);
                } else {
                  // Se não existia (foi aprovado agora), insere no topo
                  return [atualizado, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                }
              } else {
                // Se foi desaprovado, remove da lista do mural
                return prev.filter((f) => f.id !== atualizado.id);
              }
            });
          } else if (payload.eventType === 'DELETE') {
            const deletado = payload.old as { id: string };
            setFeedbacks((prev) => prev.filter((f) => f.id !== deletado.id));
          }
        }
      )
      .subscribe();

    // Cleanup: remove a inscrição quando o componente for desmontado para evitar vazamento de memória
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !mensagem.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('feedbacks')
        .insert([{
          nome_aluno: nome.trim(),
          comentario: mensagem.trim(),
          nota: Math.floor(nota),
          aprovado: false // Sempre inicia como não aprovado para moderação
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Seu comentário foi enviado para moderação.",
      });

      setNome('');
      setMensagem('');
      setNota(5);
    } catch (error: any) {
      console.error('Erro detalhado no Supabase:', {
        message: error?.message,
        details: error?.details,
        fullError: error
      });
      toast({
        title: "Erro",
        description: "Não foi possível enviar o comentário. Verifique o console.",
        variant: "destructive"
      });
      setIsSubmitting(false); // Garante que o botão seja liberado
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Formulário de Feedback */}
      <Card className="p-6 shadow-xl border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl">
        <div className="flex flex-col items-center justify-center space-y-2 mb-6">
          <div className="w-12 h-12 bg-school-blue-50 dark:bg-zinc-900 rounded-full flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-school-blue-600 dark:text-zinc-400" />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-school-blue-700 dark:text-white">
            Deixe seu Comentário
          </h2>
          <p className="text-sm text-school-blue-600 dark:text-zinc-400 text-center">
            Compartilhe sua experiência com a escola!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nomeFeedback" className="text-school-blue-700 dark:text-zinc-200 font-semibold">
              Seu Nome *
            </Label>
            <Input
              id="nomeFeedback"
              placeholder="Como quer ser chamado?"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-12 border-2 border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white focus:border-school-blue-500 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-school-blue-700 dark:text-zinc-200 font-semibold">
              Sua Nota *
            </Label>
            <div className="flex gap-2 p-2 bg-gray-50 dark:bg-zinc-900/50 rounded-xl w-fit">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNota(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= nota
                        ? 'fill-school-yellow-400 text-school-yellow-400 dark:fill-school-yellow-500 dark:text-school-yellow-500'
                        : 'fill-transparent text-gray-300 dark:text-zinc-600'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem" className="text-school-blue-700 dark:text-zinc-200 font-semibold">
              Sua Mensagem *
            </Label>
            <Textarea
              id="mensagem"
              placeholder="O que você achou do sorteio?"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="min-h-[100px] resize-none border-2 border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white focus:border-school-blue-500 rounded-xl"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-base font-bold rounded-xl shadow-sm bg-school-blue-600 hover:bg-school-blue-700 text-white dark:bg-school-blue-600 dark:hover:bg-school-blue-700 transition-all duration-300"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Comentário'}
          </Button>
        </form>
      </Card>

      {/* Lista de Feedbacks */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-school-blue-800 dark:text-zinc-100 flex items-center gap-2 px-2">
          <Star className="w-5 h-5 text-school-yellow-500 fill-school-yellow-500" />
          Mural da Turma
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-school-blue-500"></div>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border border-gray-100 dark:border-zinc-800/50">
            <p className="text-gray-500 dark:text-zinc-400">
              Ainda não há comentários. Seja o primeiro a deixar um!
            </p>
          </div>
        ) : (
          <div 
            ref={scrollRef}
            className="flex flex-row overflow-x-auto gap-4 py-4 px-2 scrollbar-none snap-none pointer-events-auto"
            onTouchStart={() => (isInteracting.current = true)}
            onTouchEnd={() => (isInteracting.current = false)}
            onMouseDown={() => (isInteracting.current = true)}
            onMouseUp={() => (isInteracting.current = false)}
            onMouseLeave={() => (isInteracting.current = false)}
          >
            {[...feedbacks, ...feedbacks].map((feedback, index) => (
              <Card key={`${feedback.id}-${index}`} className="min-w-[280px] md:min-w-[350px] inline-block snap-center bg-zinc-900 border border-zinc-800 rounded-2xl p-4 whitespace-normal transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="font-bold text-school-blue-800 dark:text-zinc-100 text-lg truncate block max-w-[180px]" title={feedback.nome_aluno}>
                    {feedback.nome_aluno}
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < feedback.nota
                            ? 'fill-school-yellow-400 text-school-yellow-400 dark:fill-school-yellow-500 dark:text-school-yellow-500'
                            : 'fill-transparent text-gray-200 dark:text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 dark:text-zinc-300 text-sm leading-relaxed">
                  "{feedback.comentario}"
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Mural;
