import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Save, Loader2, Image as ImageIcon, X, Pencil } from 'lucide-react';
import ListaPremios from './ListaPremios';

const CadastroPremios = () => {
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fotoPreview, setFotoPreview] = useState('');
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();

  const handleOtimizarDescricao = async () => {
    if (!nome.trim() || !descricao.trim()) {
      toast({
        title: "Campos vazios",
        description: "Preencha o nome do produto e a descrição atual antes de otimizar.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setIsVisible(false);

    try {
      const { data, error } = await supabase.functions.invoke('otimizar-descricao', {
        body: { nome, descricao }
      });

      if (error) throw error;

      if (data?.textoOtimizado) {
        setDescricao(data.textoOtimizado);
      } else {
        throw new Error("Resposta inválida da IA.");
      }
    } catch (error: any) {
      console.error("Erro ao otimizar descrição:", error);
      toast({
        title: "Erro ao otimizar",
        description: error.message || "Falha ao se comunicar com a inteligência artificial.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsVisible(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !valor.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome e o valor do prêmio.",
        variant: "destructive"
      });
      return;
    }

    const valorNumerico = parseInt(valor.replace(/\D/g, ''), 10);

    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido em BITCash.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const formData = new FormData();
      formData.append('action', 'produto');
      formData.append('id', crypto.randomUUID());
      formData.append('nome', nome.trim());
      formData.append('valor', valorNumerico.toString());
      if (descricao.trim()) {
        formData.append('descricao', descricao.trim());
      }
      if (fotoArquivo) {
        formData.append('foto', fotoArquivo);
      }

      const response = await fetch('https://bitn8n.infinityflowapp.com/webhook/produto', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      // Captura a resposta exata que o n8n envia no Respond to Webhook6
      if (data.ProductExist === 'Existe') {
        const errorMsg = "Este produto já foi cadastrado anteriormente no sistema, por favor utilize outro      identificador.";
        setServerError(errorMsg);
        toast({
          title: "Produto já cadastrado",
          description: errorMsg,
          variant: "destructive"
        });
        return; // Interrompe o código aqui para não limpar o formulário
      }

      // Se não caiu no erro acima, avalia o sucesso do cadastro
      if (data.sucesso === true || data.mensagem === "Produto cadastrado com sucesso!") {
        toast({
          title: "Sucesso!",
          description: data.mensagem || "Prêmio cadastrado com sucesso."
        });

        // Limpar formulário apenas em caso de sucesso real
        setNome('');
        setValor('');
        setDescricao('');
        setFotoPreview('');
        setFotoArquivo(null);
      } else {
        setServerError(data.mensagem || "Ocorreu um erro no processamento pelo servidor.");
      }

    } catch (error: any) {
      console.error("Erro ao cadastrar prêmio:", error);
      setServerError(error.message || "Erro de rede ou falha na comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-6 md:p-8 shadow-xl border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl max-w-2xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-school-yellow-500/20 border border-school-yellow-500/30">
            <Gift className="w-5 h-5 text-school-yellow-600 dark:text-school-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-school-blue-800 dark:text-white">Cadastrar Novo Prêmio</h2>
            <p className="text-sm text-school-blue-600 dark:text-zinc-400">Adicione produtos disponíveis para resgate com BITCash.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-school-blue-700 dark:text-zinc-200 font-semibold">
              Nome do Produto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              type="text"
              placeholder="Ex: Fone de Ouvido Bluetooth"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={isSubmitting}
              className="h-12 bg-zinc-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl text-school-blue-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor" className="text-school-blue-700 dark:text-zinc-200 font-semibold">
              Valor em BITCash <span className="text-red-500">*</span>
            </Label>
            <Input
              id="valor"
              type="number"
              placeholder="Ex: 500"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              disabled={isSubmitting}
              min="1"
              className="h-12 bg-zinc-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl text-school-blue-900 dark:text-zinc-100 placeholder:text-zinc-400 font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-school-blue-700 dark:text-zinc-200 font-semibold">
              Descrição Detalhada
            </Label>
            <div className="relative">
              <Textarea
                id="descricao"
                placeholder="Descreva as características e detalhes do prêmio..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                disabled={isSubmitting || isLoading}
                className={`min-h-[100px] bg-zinc-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl text-school-blue-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-y transition-opacity duration-500 pr-12 ${!isVisible ? 'opacity-0' : 'opacity-100'}`}
              />
              <button
                type="button"
                onClick={handleOtimizarDescricao}
                disabled={isLoading || isSubmitting}
                className="absolute top-2 right-2 p-2 bg-school-blue-100 hover:bg-school-blue-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-school-blue-600 dark:text-school-blue-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Otimizar descrição com Inteligência Artificial"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fotoArquivo" className="text-school-blue-700 dark:text-zinc-200 font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Foto do Produto
            </Label>

            <div className="relative h-48 md:h-56 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 flex justify-center items-center shadow-sm hover:border-school-blue-500 dark:hover:border-school-blue-500 hover:shadow-md transition-all duration-300 ease-in-out group overflow-hidden">

              {fotoPreview ? (
                <>
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                    <img
                      src={fotoPreview}
                      alt="Preview do produto"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400?text=Erro+na+Imagem';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center pointer-events-none">
                      <ImageIcon className="w-8 h-8 text-white mb-2" />
                      <span className="text-white font-medium text-sm">Clique ou arraste para trocar</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFotoArquivo(null);
                      setFotoPreview('');
                    }}
                    className="absolute top-3 right-3 z-20 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:scale-110 transition-all"
                    title="Remover foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="absolute flex flex-col items-center pointer-events-none px-4 text-center">
                  <div className="w-12 h-12 mb-3 rounded-full bg-school-blue-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-school-blue-200 dark:group-hover:bg-school-blue-900/50 transition-all duration-300">
                    <ImageIcon className="w-6 h-6 text-school-blue-600 dark:text-school-blue-400" />
                  </div>
                  <span className="block text-school-blue-900 dark:text-zinc-200 font-semibold">Arraste e solte sua foto aqui</span>
                  <span className="block text-zinc-500 dark:text-zinc-400 font-normal mt-1 text-sm">ou clique para procurar no computador</span>
                </div>
              )}

              <input
                key={fotoPreview ? 'has-file' : 'empty'}
                id="fotoArquivo"
                type="file"
                accept="image/*"
                title=""
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFotoArquivo(file);
                    setFotoPreview(URL.createObjectURL(file));
                  } else {
                    setFotoArquivo(null);
                    setFotoPreview('');
                  }
                }}
                disabled={isSubmitting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {serverError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm">
              <strong>Erro: </strong> {serverError}
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 md:h-14 bg-school-blue-600 hover:bg-school-blue-700 text-white font-bold rounded-xl shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Cadastrar Produto
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Card>
    
    <div className="max-w-2xl mx-auto w-full">
      <ListaPremios />
    </div>
    </div>
  );
};

export default CadastroPremios;
