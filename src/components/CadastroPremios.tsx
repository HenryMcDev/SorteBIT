import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Save, Loader2, Image as ImageIcon, X, Pencil, Crop } from 'lucide-react';
import ListaPremios from './ListaPremios';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/utils/cropImage';
import { compressAndConvertToWebP } from '@/utils/imageProcessor';
import { generateSlug } from '@/utils/slugify';

const PREMIOS_BUCKET = 'premios_imagens';

const CadastroPremios = () => {
  const [activeTab, setActiveTab] = useState<'lista' | 'cadastro'>('lista');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalFotoPath, setOriginalFotoPath] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  // Estados para o Cropper
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const getPublicUrl = (fotoPath: string) => {
    if (!fotoPath) return '';
    if (fotoPath.startsWith('http')) return fotoPath;
    const { data } = supabase.storage.from(PREMIOS_BUCKET).getPublicUrl(fotoPath);
    return data?.publicUrl || '';
  };

  const handleEditClick = (premio: any) => {
    setEditingId(premio.id);
    setNome(premio.nome);
    setValor(premio.valor.toString());
    setDescricao(premio.descricao || '');
    setFotoPreview(getPublicUrl(premio.foto));
    setOriginalFotoPath(premio.foto);
    setFotoArquivo(null);
    setActiveTab('cadastro');
  };

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

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    try {
      setIsCropping(true);
      const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (croppedFile) {
        setCropModalOpen(false);
        setZoom(1);
        setCrop({ x: 0, y: 0 });

        // Conversão para WebP & Compressão
        try {
          const webpFile = await compressAndConvertToWebP(croppedFile);
          setFotoArquivo(webpFile);
          setFotoPreview(URL.createObjectURL(webpFile));
        } catch (webpError: any) {
          console.error("Falha na conversão para WebP:", webpError);
          setFotoArquivo(croppedFile);
          setFotoPreview(URL.createObjectURL(croppedFile));
          toast({
            title: "Erro na otimização",
            description: "Não foi possível otimizar ou converter para WebP. Usando o recorte original.",
            variant: "destructive"
          });
        }
      }
    } catch (e) {
      console.error("Erro geral no processamento de imagem:", e);
      toast({ title: "Erro no recorte", description: "Não foi possível processar a imagem.", variant: "destructive" });
    } finally {
      setIsCropping(false);
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
        description: "Por favor, insira um valor válido em CashBIT.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      if (editingId !== null) {
        // Fluxo de Edição (Usa Supabase diretamente para preservar lógica existente)
        let fotoUrlPath = originalFotoPath;

        if (fotoArquivo) {
          const slug = generateSlug(nome);
          const filename = `${slug || 'produto'}_${Date.now()}.webp`;
          
          const { error: uploadError } = await supabase.storage
            .from(PREMIOS_BUCKET)
            .upload(filename, fotoArquivo, {
              contentType: 'image/webp',
              upsert: true
            });

          if (uploadError) throw uploadError;
          fotoUrlPath = filename;
        }

        const { error } = await supabase
          .from('premios')
          .update({
            nome: nome.trim(),
            valor: valorNumerico,
            descricao: descricao.trim(),
            foto: fotoUrlPath
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Sucesso!",
          description: "Prêmio atualizado com sucesso."
        });

        // Reset
        setEditingId(null);
        setNome('');
        setValor('');
        setDescricao('');
        setFotoPreview('');
        setFotoArquivo(null);
        setOriginalFotoPath('');
        setRefreshTrigger(prev => prev + 1);
        setActiveTab('lista');
      } else {
        // Fluxo de Cadastro existente (webhook n8n)
        const formData = new FormData();
        formData.append('action', 'produto');
        formData.append('id', crypto.randomUUID());
        formData.append('nome', nome.trim());
        formData.append('valor', valorNumerico.toString());
        if (descricao.trim()) {
          formData.append('descricao', descricao.trim());
        }
        if (fotoArquivo) {
          const slug = generateSlug(nome);
          const filename = `${slug || 'produto'}.webp`;
          const renamedFile = new File([fotoArquivo], filename, { type: 'image/webp' });
          formData.append('foto', renamedFile);
        }

        const response = await fetch('https://bitn8n.infinityflowapp.com/webhook/produto', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.ProductExist === 'Existe') {
          const errorMsg = "Este produto já foi cadastrado anteriormente no sistema, por favor utilize outro identificador.";
          setServerError(errorMsg);
          toast({
            title: "Produto já cadastrado",
            description: errorMsg,
            variant: "destructive"
          });
          return;
        }

        if (data.sucesso === true || data.mensagem === "Produto cadastrado com sucesso!") {
          toast({
            title: "Sucesso!",
            description: data.mensagem || "Prêmio cadastrado com sucesso."
          });

          setNome('');
          setValor('');
          setDescricao('');
          setFotoPreview('');
          setFotoArquivo(null);
          setRefreshTrigger(prev => prev + 1);
          setActiveTab('lista');
        } else {
          setServerError(data.mensagem || "Ocorreu um erro no processamento pelo servidor.");
        }
      }
    } catch (error: any) {
      console.error("Erro ao cadastrar prêmio:", error);
      setServerError(error.message || "Erro de rede ou falha na comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 dark:border-zinc-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-school-yellow-500/20 border border-school-yellow-500/30">
            <Gift className="w-5 h-5 text-school-yellow-600 dark:text-school-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-school-blue-800 dark:text-white">
              {editingId ? 'Editar Prêmio' : 'Gestão de Prêmios'}
            </h2>
            <p className="text-sm text-school-blue-600 dark:text-zinc-400">
              {editingId ? 'Atualize as informações do prêmio selecionado.' : 'Gerencie e adicione produtos disponíveis para resgate com CashBIT.'}
            </p>
          </div>
        </div>

        {activeTab === 'lista' && (
          <Button
            onClick={() => {
              setEditingId(null);
              setNome('');
              setValor('');
              setDescricao('');
              setFotoPreview('');
              setFotoArquivo(null);
              setOriginalFotoPath('');
              setActiveTab('cadastro');
            }}
            className="bg-school-blue-600 hover:bg-school-blue-700 text-white font-bold rounded-xl shadow-md gap-2"
          >
            <Gift className="w-4 h-4" />
            + Cadastrar Novo Prêmio
          </Button>
        )}
      </div>

      {/* Seletor de Abas */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-zinc-800/80 pb-2">
        <button
          onClick={() => {
            setActiveTab('lista');
            setEditingId(null);
          }}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            activeTab === 'lista'
              ? 'bg-school-blue-50 text-school-blue-600 dark:bg-zinc-900 dark:text-white'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          Prêmios Cadastrados
        </button>
        <button
          onClick={() => {
            if (!editingId) {
              setNome('');
              setValor('');
              setDescricao('');
              setFotoPreview('');
              setFotoArquivo(null);
              setOriginalFotoPath('');
            }
            setActiveTab('cadastro');
          }}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            activeTab === 'cadastro'
              ? 'bg-school-blue-50 text-school-blue-600 dark:bg-zinc-900 dark:text-white'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          {editingId ? 'Editar Prêmio' : 'Cadastrar Novo Prêmio'}
        </button>
      </div>

      {/* Exibição Condicional baseada na Aba */}
      {activeTab === 'lista' ? (
        <div className="w-full">
          <ListaPremios onEdit={handleEditClick} refreshTrigger={refreshTrigger} />
        </div>
      ) : (
        <Card className="p-6 md:p-8 shadow-xl border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl max-w-2xl mx-auto w-full">
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-school-blue-800 dark:text-white border-b border-gray-100 dark:border-zinc-800 pb-3">
              {editingId ? 'Informações do Prêmio' : 'Formulário de Cadastro'}
            </h3>

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
                  Valor em CashBIT <span className="text-red-500">*</span>
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
                  Foto do Produto (Corte 1:1)
                </Label>

                <div className="relative h-48 md:h-56 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 flex justify-center items-center shadow-sm hover:border-school-blue-500 dark:hover:border-school-blue-500 hover:shadow-md transition-all duration-300 ease-in-out group overflow-hidden">
                  {fotoPreview ? (
                    <>
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNlZWUiLz48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZWVlIi8+PC9zdmc+)] dark:bg-[url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMyMjIiLz48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMjIyIi8+PC9zdmc+)] bg-repeat">
                        <img
                          src={fotoPreview}
                          alt="Preview do produto"
                          className="w-full h-full object-contain p-4"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400?text=Erro+na+Imagem';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center pointer-events-none">
                          <Crop className="w-8 h-8 text-white mb-2" />
                          <span className="text-white font-medium text-sm">Clique ou arraste para trocar foto</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFotoArquivo(null);
                          setFotoPreview('');
                          setOriginalFotoPath('');
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
                      <span className="block text-zinc-500 dark:text-zinc-400 font-normal mt-1 text-sm">ou clique para procurar e recortar no computador</span>
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
                        setImageToCrop(URL.createObjectURL(file));
                        setCropModalOpen(true);
                      }
                      e.target.value = '';
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

              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3">
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setNome('');
                      setValor('');
                      setDescricao('');
                      setFotoPreview('');
                      setFotoArquivo(null);
                      setOriginalFotoPath('');
                      setActiveTab('lista');
                    }}
                    className="w-full sm:w-1/3 h-12 md:h-14 border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    Cancelar Edição
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-grow h-12 md:h-14 font-bold rounded-xl shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2 text-white ${
                    editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-school-blue-600 hover:bg-school-blue-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Cropper Modal */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-school-blue-800 dark:text-white text-xl">Recortar Foto do Produto (1:1)</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[350px] md:h-[450px] bg-zinc-900 rounded-xl overflow-hidden shadow-inner">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { background: '#18181b' }
              }}
            />
          </div>
          <div className="py-4 space-y-3">
            <div className="flex justify-between items-center text-sm font-medium text-school-blue-700 dark:text-zinc-300">
              <span>Menos Zoom</span>
              <span>Mais Zoom</span>
            </div>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.05}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-school-blue-100 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800 accent-school-blue-600"
            />
          </div>
          <DialogFooter className="flex gap-2 sm:justify-between mt-2">
            <Button variant="outline" onClick={() => setCropModalOpen(false)} className="w-full sm:w-auto rounded-xl border-gray-200 dark:border-zinc-700">
              Cancelar
            </Button>
            <Button onClick={handleCropConfirm} disabled={isCropping} className="w-full sm:w-auto bg-school-blue-600 text-white hover:bg-school-blue-700 rounded-xl shadow-md">
              {isCropping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crop className="w-4 h-4 mr-2" />}
              Confirmar Recorte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CadastroPremios;
