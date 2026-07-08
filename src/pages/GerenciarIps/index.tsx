import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, ShieldCheck } from 'lucide-react';

const GerenciarIps = () => {
  const { toast } = useToast();

  const [ips, setIps] = useState<any[]>([]);
  const [novoIp, setNovoIp] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);

  const carregarIps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ips_autorizados' as any)
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setIps(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar IPs:', error);
      toast({
        title: 'Erro ao carregar IPs',
        description: error.message || 'Ocorreu um erro ao buscar os dados do banco.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarIps();
  }, []);

  const handleInsertIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoIp.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, insira um endereço IP válido.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ips_autorizados' as any)
        .insert({
          ip: novoIp.trim(),
          descricao: descricao.trim() || null,
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'IP autorizado cadastrado com sucesso!',
      });

      setNovoIp('');
      setDescricao('');
      await carregarIps();
    } catch (error: any) {
      console.error('Erro ao cadastrar IP:', error);
      toast({
        title: 'Erro ao cadastrar IP',
        description: error.message || 'Ocorreu um erro ao salvar o registro no banco.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIp = async (id: number) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ips_autorizados' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'IP autorizado excluído com sucesso!',
      });

      await carregarIps();
    } catch (error: any) {
      console.error('Erro ao excluir IP:', error);
      toast({
        title: 'Erro ao excluir IP',
        description: error.message || 'Ocorreu um erro ao deletar o registro do banco.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Formulário de Cadastro */}
      <Card className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30">
            <ShieldCheck className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Autorizar Novo Endereço IP</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Permita o acesso à internet/sistema a partir deste endereço IP.</p>
          </div>
        </div>

        <form onSubmit={handleInsertIp} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="novoIp" className="text-zinc-700 dark:text-zinc-200 font-semibold text-sm">
              Endereço IP
            </Label>
            <Input
              id="novoIp"
              type="text"
              placeholder="Ex: 192.168.1.100 ou 200.150.10.5"
              value={novoIp}
              onChange={(e) => setNovoIp(e.target.value)}
              disabled={loading}
              className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-mono text-sm focus-visible:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-zinc-700 dark:text-zinc-200 font-semibold text-sm">
              Descrição / Local
            </Label>
            <Input
              id="descricao"
              type="text"
              placeholder="Ex: Roteador da Sala 05"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={loading}
              className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm focus-visible:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2 flex justify-end mt-2">
            <Button
              type="submit"
              disabled={loading}
              className="h-12 px-6 rounded-xl font-bold text-sm text-white bg-school-blue-600 hover:bg-school-blue-700 transition-all duration-200 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Autorizar IP
            </Button>
          </div>
        </form>
      </Card>

      {/* Listagem de IPs cadastrados */}
      <Card className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-2xl shadow-sm">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">IPs Autorizados no Sistema</h3>

        {loading && ips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-school-blue-500 animate-spin" />
            <p className="text-sm text-zinc-500">Carregando endereços cadastrados...</p>
          </div>
        ) : ips.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/20 rounded-2xl">
            <p className="text-sm text-zinc-500">Nenhum endereço IP cadastrado ou autorizado no momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                  <th className="p-4">IP</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {ips.map((ipRow) => (
                  <tr key={ipRow.id} className="border-b border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors text-sm">
                    <td className="p-4 font-mono font-semibold text-zinc-800 dark:text-zinc-200">{ipRow.ip}</td>
                    <td className="p-4 text-zinc-600 dark:text-zinc-400">{ipRow.descricao || 'Sem descrição'}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteIp(ipRow.id)}
                        disabled={loading}
                        className="bg-red-50 dark:bg-red-500/10 hover:bg-red-600 dark:hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-1.5 font-bold text-xs transition-all duration-200"
                      >
                        Excluir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default GerenciarIps;
