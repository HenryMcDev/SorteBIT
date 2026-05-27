import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Loader2, Save, X, Image as ImageIcon } from 'lucide-react';
import { Premio } from '@/components/PremioCard';

// Nome do bucket no Supabase Storage onde as fotos dos prêmios são armazenadas
const PREMIOS_BUCKET = 'premios_imagens';

const ListaPremios = () => {
  const [premios, setPremios] = useState<Premio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Edit form state
  const [editNome, setEditNome] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editFotoFile, setEditFotoFile] = useState<File | null>(null);
  const [editFotoPreview, setEditFotoPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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
  }, []);

  const getPublicUrl = (fotoPath: string) => {
    if (!fotoPath) return '';
    if (fotoPath.startsWith('http')) return fotoPath;
    const { data } = supabase.storage.from(PREMIOS_BUCKET).getPublicUrl(fotoPath);
    return data?.publicUrl || '';
  };

  const handleEditClick = (premio: Premio) => {
    setEditingId(premio.id);
    setEditNome(premio.nome);
    setEditValor(premio.valor.toString());
    setEditDescricao(premio.descricao || '');
    setEditFotoPreview(getPublicUrl(premio.foto));
    setEditFotoFile(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNome('');
    setEditValor('');
    setEditDescricao('');
    setEditFotoPreview('');
    setEditFotoFile(null);
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
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const saveEdit = async (id: number) => {
    if (!editNome.trim() || !editValor.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha o nome e o valor.', variant: 'destructive' });
      return;
    }

    const valorNumerico = parseInt(editValor.replace(/\D/g, ''), 10);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast({ title: 'Valor inválido', description: 'Insira um valor válido.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      let fotoPathToSave = premios.find(p => p.id === id)?.foto || '';

      if (editFotoFile) {
        const fileExt = editFotoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(PREMIOS_BUCKET)
          .upload(filePath, editFotoFile);

        if (uploadError) throw uploadError;
        fotoPathToSave = filePath;
      }

      const { error } = await supabase
        .from('premios')
        .update({
          nome: editNome.trim(),
          valor: valorNumerico,
          descricao: editDescricao.trim(),
          foto: fotoPathToSave
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Sucesso!", description: "Prêmio atualizado." });
      cancelEdit();
      fetchPremios(); // Refresh the list
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-xl font-bold text-school-blue-800 dark:text-white">Gerenciar Prêmios Cadastrados</h3>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-school-blue-500" />
        </div>
      ) : premios.length === 0 ? (
        <Card className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 border-0 shadow-sm dark:border dark:border-zinc-800 rounded-2xl">
          Nenhum prêmio cadastrado.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {premios.map(premio => (
            <Card key={premio.id} className="overflow-hidden border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm rounded-xl">
              {editingId === premio.id ? (
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Produto</Label>
                    <Input value={editNome} onChange={e => setEditNome(e.target.value)} disabled={isSaving} className="bg-zinc-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (BITCash)</Label>
                    <Input type="number" value={editValor} onChange={e => setEditValor(e.target.value)} disabled={isSaving} className="bg-zinc-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={editDescricao} onChange={e => setEditDescricao(e.target.value)} disabled={isSaving} className="bg-zinc-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 min-h-[80px]" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Foto do Produto (opcional)</Label>
                    <div className="flex items-center gap-4">
                      {editFotoPreview && (
                        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          <img src={editFotoPreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <Input 
                        type="file" 
                        accept="image/*" 
                        disabled={isSaving}
                        className="bg-zinc-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setEditFotoFile(file);
                            setEditFotoPreview(URL.createObjectURL(file));
                          }
                        }} 
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => saveEdit(premio.id)} disabled={isSaving} className="flex-1 bg-school-blue-600 hover:bg-school-blue-700 text-white">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Salvar
                    </Button>
                    <Button onClick={cancelEdit} disabled={isSaving} variant="outline" className="flex-1 border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800">
                      <X className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row p-4 gap-4 items-center">
                  <div className="w-16 h-16 shrink-0 bg-zinc-100 dark:bg-zinc-900 rounded-lg flex justify-center items-center overflow-hidden border border-zinc-200 dark:border-zinc-800">
                    {premio.foto ? (
                      <img src={getPublicUrl(premio.foto)} alt={premio.nome} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-grow text-center sm:text-left min-w-0">
                    <h4 className="font-bold text-school-blue-900 dark:text-zinc-100 truncate">{premio.nome}</h4>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{premio.descricao}</p>
                    <span className="inline-block mt-1 text-xs font-bold bg-school-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-500 px-2 py-0.5 rounded-full">
                      {premio.valor} BITCash
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button onClick={() => handleEditClick(premio)} disabled={isDeleting === premio.id} size="sm" variant="outline" className="border-school-blue-200 text-school-blue-600 hover:bg-school-blue-50 dark:border-zinc-700 dark:text-blue-400 dark:hover:bg-zinc-800">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => handleDelete(premio.id)} disabled={isDeleting === premio.id} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20">
                      {isDeleting === premio.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListaPremios;
