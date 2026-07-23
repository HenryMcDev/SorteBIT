import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Calendar, Filter, Eye, RefreshCw, X, ClipboardList } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
}

const translateAction = (action: string) => {
  switch (action) {
    case 'INSERT': return 'Inclusão';
    case 'UPDATE': return 'Edição';
    case 'DELETE': return 'Exclusão';
    default: return action;
  }
};

const translateTable = (tableName: string) => {
  switch (tableName) {
    case 'premios': return 'Prêmios';
    case 'resgates': return 'Resgates';
    case 'estudantes': return 'Estudantes';
    default: return tableName;
  }
};

const AdminLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm.trim()) {
        query = query.or(`user_email.ilike.%${searchTerm.trim()}%,record_id.ilike.%${searchTerm.trim()}%`);
      }

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00Z`);
      }

      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59Z`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setLogs((data as AuditLog[]) || []);
    } catch (err: any) {
      console.error('Erro ao carregar logs de auditoria:', err);
      toast({
        title: 'Erro ao carregar logs',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setDateFrom('');
    setDateTo('');
    setTimeout(() => {
      fetchLogs();
    }, 0);
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDiffModalOpen(true);
  };

  const renderDiffContent = (log: AuditLog) => {
    if (log.action === 'INSERT') {
      const data = log.new_data || {};
      return (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Registro criado com os seguintes dados:
          </p>
          <div className="border border-emerald-100 dark:border-emerald-950/60 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold border-b border-emerald-100 dark:border-emerald-950/60">
                  <th className="p-3 w-1/3">Propriedade</th>
                  <th className="p-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data).map(([key, val]) => (
                  <tr key={key} className="border-b border-emerald-50/50 dark:border-emerald-950/20 bg-emerald-50/5 dark:bg-emerald-950/5">
                    <td className="p-3 font-semibold font-mono text-zinc-650 dark:text-zinc-350">{key}</td>
                    <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 break-all">{JSON.stringify(val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (log.action === 'DELETE') {
      const data = log.old_data || {};
      return (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            Registro removido com os seguintes dados:
          </p>
          <div className="border border-rose-100 dark:border-rose-950/60 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-rose-50/50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-semibold border-b border-rose-100 dark:border-rose-950/60">
                  <th className="p-3 w-1/3">Propriedade</th>
                  <th className="p-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data).map(([key, val]) => (
                  <tr key={key} className="border-b border-rose-50/50 dark:border-rose-950/20 bg-rose-50/5 dark:bg-rose-950/5">
                    <td className="p-3 font-semibold font-mono text-zinc-650 dark:text-zinc-350">{key}</td>
                    <td className="p-3 font-mono text-rose-600 dark:text-rose-400 break-all">{JSON.stringify(val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (log.action === 'UPDATE') {
      const oldData = log.old_data || {};
      const newData = log.new_data || {};
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      const changedKeys: string[] = [];

      for (const key of allKeys) {
        if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
          changedKeys.push(key);
        }
      }

      if (changedKeys.length === 0) {
        return (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
            Nenhuma alteração de valor detectada no payload.
          </p>
        );
      }

      return (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            Valores modificados no registro:
          </p>
          <div className="border border-zinc-150 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold border-b border-zinc-150 dark:border-zinc-800">
                  <th className="p-3 w-1/4">Campo</th>
                  <th className="p-3 w-3/8 text-rose-600 dark:text-rose-400">Valor Anterior</th>
                  <th className="p-3 w-3/8 text-emerald-600 dark:text-emerald-400">Valor Novo</th>
                </tr>
              </thead>
              <tbody>
                {changedKeys.map(key => (
                  <tr key={key} className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                    <td className="p-3 font-semibold font-mono text-zinc-650 dark:text-zinc-350">{key}</td>
                    <td className="p-3 font-mono bg-rose-50/10 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 break-all">
                      {oldData[key] !== undefined ? JSON.stringify(oldData[key]) : <span className="text-zinc-400 italic">nulo</span>}
                    </td>
                    <td className="p-3 font-mono bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 break-all">
                      {newData[key] !== undefined ? JSON.stringify(newData[key]) : <span className="text-zinc-400 italic">nulo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-gray-150 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-school-blue-100 dark:bg-zinc-900 border border-school-blue-200 dark:border-zinc-800">
            <ClipboardList className="w-5 h-5 text-school-blue-600 dark:text-school-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-school-blue-800 dark:text-white">Logs de Auditoria</h2>
            <p className="text-sm text-school-blue-600 dark:text-zinc-400">
              Rastreie as ações de criação, edição e remoção realizadas pelos administradores.
            </p>
          </div>
        </div>
        <Button onClick={fetchLogs} variant="outline" className="gap-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-white dark:border-slate-700 h-10 rounded-xl">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="p-5 border border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pesquisa Geral</Label>
              <div className="relative">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="E-mail ou ID do Registro..."
                  className="pl-9 h-10 rounded-xl border-gray-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm"
                />
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Action Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Tipo de Ação</Label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm px-3 text-zinc-700 dark:text-zinc-350 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Todas as Ações</option>
                <option value="INSERT">Inclusão (INSERT)</option>
                <option value="UPDATE">Edição (UPDATE)</option>
                <option value="DELETE">Exclusão (DELETE)</option>
              </select>
            </div>

            {/* Date From */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">A partir de</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-9 h-10 rounded-xl border-gray-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm text-slate-800 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark]"
                  style={{ colorScheme: 'light dark' }}
                />
                <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Até a data</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-9 h-10 rounded-xl border-gray-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm text-slate-800 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark]"
                  style={{ colorScheme: 'light dark' }}
                />
                <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-900/60">
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              className="h-10 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-white dark:border-slate-700 text-xs font-semibold"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Limpar Filtros
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-xl bg-school-blue-600 hover:bg-school-blue-700 text-white text-xs font-bold shadow-md px-5"
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Buscar Logs
            </Button>
          </div>
        </form>
      </Card>

      {/* Logs Table Grid */}
      <Card className="overflow-hidden border border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl shadow-sm">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-school-blue-500" />
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Consultando trilha de auditoria...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 dark:text-zinc-400">
            <ClipboardList className="w-12 h-12 text-zinc-300 dark:text-zinc-750 mx-auto mb-3" />
            <p className="font-semibold text-sm">Nenhum log de auditoria encontrado</p>
            <p className="text-xs text-zinc-400 mt-1">Experimente alterar os termos da pesquisa ou os filtros de data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-xs">
                  <th className="p-4">Data/Hora</th>
                  <th className="p-4">Administrador</th>
                  <th className="p-4">Ação</th>
                  <th className="p-4">Módulo/Tabela</th>
                  <th className="p-4">ID do Registro</th>
                  <th className="p-4 text-center">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="p-4 font-mono text-xs text-slate-700 font-medium dark:text-slate-300">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-4 font-medium text-zinc-800 dark:text-zinc-200">
                      {log.user_email || 'Sistema'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold leading-relaxed ${
                        log.action === 'INSERT'
                          ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400'
                          : log.action === 'UPDATE'
                          ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-450'
                          : 'bg-rose-100 dark:bg-rose-950/30 text-rose-800 dark:text-rose-455'
                      }`}>
                        {translateAction(log.action)}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-zinc-700 dark:text-zinc-300">
                      {translateTable(log.table_name)}
                    </td>
                    <td className="p-4 font-mono text-xs text-zinc-500 dark:text-zinc-450 truncate max-w-[150px]" title={log.record_id}>
                      {log.record_id}
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        onClick={() => handleViewDetails(log)}
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 font-semibold gap-1 text-xs px-2.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Diff Comparer Modal */}
      <Dialog open={diffModalOpen} onOpenChange={setDiffModalOpen}>
        <DialogContent className="sm:max-w-3xl bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-900 pb-3">
            <DialogTitle className="text-school-blue-800 dark:text-white text-lg font-bold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-school-blue-600 dark:text-school-blue-400" />
              Detalhes do Log de Auditoria
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-3">
              {/* Log Metadata Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-900 text-xs">
                <div>
                  <span className="block text-zinc-400 mb-0.5">Operação</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{translateAction(selectedLog.action)}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 mb-0.5">Tabela/Módulo</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{translateTable(selectedLog.table_name)}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 mb-0.5">Administrador</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedLog.user_email || 'Sistema'}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 mb-0.5">Data/Hora</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Dynamic Diff Content Section */}
              {renderDiffContent(selectedLog)}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-zinc-100 dark:border-zinc-900/60">
            <Button onClick={() => setDiffModalOpen(false)} className="rounded-xl bg-school-blue-600 hover:bg-school-blue-700 text-white font-bold h-10 px-6">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLogs;
