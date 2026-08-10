import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBackendUrl } from '@/utils/backendUrl';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  CheckCircle2,
  AlertTriangle, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  Play, 
  X, 
  Terminal, 
  FileJson, 
  Workflow, 
  ArrowRight,
  Info,
  Globe,
  Database,
  Bot,
  FolderOpen,
  UserPlus,
  Mail,
  Link2,
  PlayCircle,
  Code,
  Sparkles,
  Cpu,
  Brain,
  Layers,
  Sliders,
  Copy,
  Check,
  XCircle
} from 'lucide-react';

interface WorkflowInfo {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionInfo {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  workflowId: string;
}

interface ExecutionDetails {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt: string;
  resultData?: {
    runData: Record<string, any[]>;
  };
  data?: {
    resultData: {
      runData: Record<string, any[]>;
    };
  };
  workflowData?: {
    nodes: any[];
    connections: any;
  };
}

const nodeMappings: Record<string, { name: string; icon: React.ComponentType<any> }> = {
  'Webhook': { name: 'Entrada de Dados (Webhook)', icon: Globe },
  'On webhook call': { name: 'Gatilhador Webhook', icon: Globe },
  'gemini-2.5-flash': { name: 'Análise de Imagem (IA Gemini)', icon: Brain },
  'gemini-2.5-pro': { name: 'Análise Avançada (IA Gemini)', icon: Brain },
  'GPT-4o-Mini1': { name: 'Análise de Imagem (IA GPT-4o)', icon: Bot },
  'gpt-4o-mini': { name: 'Análise de Imagem (IA GPT-4o)', icon: Bot },
  'OpenAI': { name: 'Processamento OpenAI', icon: Bot },
  'Search a bucket': { name: 'Busca no Storage', icon: FolderOpen },
  'Read from bucket': { name: 'Leitura de Arquivo', icon: FolderOpen },
  'Upload to bucket': { name: 'Upload de Arquivo', icon: FolderOpen },
  'create_user': { name: 'Cadastro de Participante', icon: UserPlus },
  'Create User': { name: 'Cadastro de Participante', icon: UserPlus },
  'Validate Ticket': { name: 'Validação de Cupom', icon: Sparkles },
  'MySQL': { name: 'Banco de Dados (MySQL)', icon: Database },
  'PostgreSQL': { name: 'Banco de Dados (PostgreSQL)', icon: Database },
  'Supabase': { name: 'Banco de Dados (Supabase)', icon: Database },
  'Database': { name: 'Operação de Banco de Dados', icon: Database },
  'Execute Workflow': { name: 'Executar Sub-Fluxo', icon: Workflow },
  'Send Email': { name: 'Envio de Email', icon: Mail },
  'Email': { name: 'Notificação por Email', icon: Mail },
  'HTTP Request': { name: 'Integração HTTP', icon: Link2 },
  'Code': { name: 'Código Personalizado (JS)', icon: Code },
  'Set': { name: 'Definição de Variáveis', icon: Layers },
  'Merge': { name: 'Mesclagem de Dados', icon: Layers },
  'Filter': { name: 'Filtro de Dados', icon: Sliders }
};

const getNodeDetails = (nodeName: string) => {
  if (nodeMappings[nodeName]) {
    return nodeMappings[nodeName];
  }
  const nameLower = nodeName.toLowerCase();
  for (const [key, mapping] of Object.entries(nodeMappings)) {
    if (nameLower.includes(key.toLowerCase())) {
      return mapping;
    }
  }
  return {
    name: nodeName,
    icon: Cpu
  };
};

// N8nSimpleStatusViewer is a simplified operational status viewer for workflows,
// ensuring compliance with data security and privacy (LGPD).
interface N8nSimpleStatusViewerProps {
  workflowData: any;
  executionDetails: any;
}

export function N8nSimpleStatusViewer({ workflowData, executionDetails }: N8nSimpleStatusViewerProps) {
  const runData = executionDetails?.resultData?.runData || 
                  executionDetails?.data?.resultData?.runData || 
                  executionDetails?.executionData?.resultData?.runData || {};
  let nodes = workflowData?.nodes || [];
  if (nodes.length === 0) {
    nodes = Object.keys(runData).map(name => ({
      name,
      type: 'unknown'
    }));
  }

  // Mapeia os nós identificando apenas se foi executado e se houve erro
  const executedNodes = nodes.map((node: any) => {
    const nodeRun = runData[node.name];
    const isExecuted = !!nodeRun;
    
    // Suporta tanto objeto simples quanto array
    const runArray = Array.isArray(nodeRun) ? nodeRun : (nodeRun ? [nodeRun] : []);
    
    const hasError = runArray.some((run: any) => run.error !== undefined);
    const executionTime = runArray.reduce((acc: number, run: any) => acc + (run.executionTime || 0), 0);

    return {
      name: node.name,
      type: node.type,
      isExecuted,
      success: isExecuted && !hasError,
      executionTime: isExecuted ? executionTime : undefined,
    };
  });

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 flex flex-col h-full shadow-sm min-h-[400px]">
      <h3 className="text-sm font-bold text-zinc-800 dark:text-white mb-4 uppercase tracking-wider">
        MAPA DE NÓS EXECUTADOS
      </h3>

      {/* Container com Scroll Interno para a Sequência de Nós */}
      <div className="flex-1 max-h-[calc(100vh-240px)] lg:max-h-[600px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800">
        {executedNodes.map((node: any, index: number) => (
          <div
            key={index}
            className={`w-full p-4 rounded-xl border flex items-center justify-between transition-colors ${
              node.isExecuted
                ? node.success
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-800 dark:text-zinc-200'
                  : 'bg-red-500/5 border-red-500/20 text-zinc-800 dark:text-zinc-200'
                : 'bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 opacity-60'
            }`}
          >
            {/* Nome e Tipo do Nó */}
            <div className="flex items-center gap-3">
              {node.isExecuted ? (
                node.success ? (
                  <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                ) : (
                  <XCircle className="text-red-500 shrink-0" size={20} />
                )
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 shrink-0" />
              )}

              <div>
                <p className="text-sm font-semibold">{node.name}</p>
                <p className="text-xs text-zinc-400 font-mono">{node.type}</p>
              </div>
            </div>

            {/* Tempo de Execução */}
            {node.isExecuted && node.executionTime !== undefined && (
              <div className="flex items-center gap-1 text-xs font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <Clock size={12} />
                <span>{node.executionTime}ms</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminN8N: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [executions, setExecutions] = useState<ExecutionInfo[]>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [executionDetails, setExecutionDetails] = useState<ExecutionDetails | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [inputTab, setInputTab] = useState<'friendly' | 'raw'>('friendly');
  const [outputTab, setOutputTab] = useState<'friendly' | 'raw'>('friendly');

  useEffect(() => {
    setSelectedNode(null);
  }, [executionDetails]);

  useEffect(() => {
    setInputTab('friendly');
    setOutputTab('friendly');
  }, [selectedNode]);

  const handleCopyJson = (jsonObj: any) => {
    navigator.clipboard.writeText(JSON.stringify(jsonObj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch(`${getBackendUrl()}/api/admin/n8n/workflows`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || 'Falha ao buscar workflows.');
      }

      const data = await response.json();
      const workflowList = (data.data || data) as WorkflowInfo[];
      const allowedNames = ["SorteBIT", "back-end sorteBIT", "admin-sortebit", "acess-sortebit"];
      const filteredList = workflowList.filter(wf => allowedNames.includes(wf.name));
      setWorkflows(filteredList);
      
      if (filteredList.length > 0) {
        setSelectedWorkflowId(filteredList[0].id);
        fetchExecutions(filteredList[0].id);
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao carregar workflows',
        description: err.message || 'Verifique se a variável N8N_API_KEY está configurada no backend.',
        variant: 'destructive',
      });
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const fetchExecutions = async (workflowId: string) => {
    if (!workflowId) return;
    setLoadingExecutions(true);
    setExecutions([]);
    setSelectedExecutionId(null);
    setExecutionDetails(null);
    setSelectedNode(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch(`${getBackendUrl()}/api/admin/n8n/workflows/${workflowId}/executions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || 'Falha ao buscar execuções.');
      }

      const data = await response.json();
      
      // n8n returns executions list inside data.data or directly as array
      const rawList = data.data || data;
      const list = Array.isArray(rawList) ? rawList : [];

      // Map n8n specific status output
      const mappedList: ExecutionInfo[] = list.map((item: any) => {
        let status: 'success' | 'error' | 'running' | 'waiting' = 'running';
        if (item.finished) {
          status = 'success';
        } else if (item.status === 'failed' || item.status === 'crashed') {
          status = 'error';
        } else if (item.status === 'waiting') {
          status = 'waiting';
        } else if (item.status === 'success') {
          status = 'success';
        } else if (item.status === 'error' || item.status === 'failed') {
          status = 'error';
        }
        return {
          id: item.id,
          finished: item.finished,
          mode: item.mode,
          startedAt: item.startedAt,
          stoppedAt: item.stoppedAt,
          status,
          workflowId: item.workflowId
        };
      });

      setExecutions(mappedList);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao carregar execuções',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingExecutions(false);
    }
  };

  const fetchExecutionDetails = async (executionId: string) => {
    setLoadingDetails(true);
    setExecutionDetails(null);
    setSelectedNode(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch(`${getBackendUrl()}/api/admin/n8n/executions/${executionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || 'Falha ao buscar detalhes da execução.');
      }

      const data = await response.json();
      setExecutionDetails(data);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao carregar detalhes',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleWorkflowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedWorkflowId(id);
    fetchExecutions(id);
  };

  const handleRefresh = () => {
    if (selectedWorkflowId) {
      fetchExecutions(selectedWorkflowId);
    } else {
      fetchWorkflows();
    }
  };

  const handleSelectExecution = (executionId: string) => {
    setSelectedExecutionId(executionId);
    fetchExecutionDetails(executionId);
  };

  const getSelectedWorkflow = () => {
    return workflows.find(w => w.id === selectedWorkflowId);
  };

  const formatDuration = (start: string, end: string) => {
    if (!start || !end) return '-';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMs = endTime - startTime;
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    }
    return `${(durationMs / 1000).toFixed(2)}s`;
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const activeWorkflow = getSelectedWorkflow();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4.1 Barra de Controle Superior */}
      <Card className="p-6 bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800/80 shadow-sm rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 max-w-md">
              <label htmlFor="workflow-selector" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Selecione o Workflow
              </label>
              <div className="relative">
                <select
                  id="workflow-selector"
                  value={selectedWorkflowId}
                  onChange={handleWorkflowChange}
                  disabled={loadingWorkflows}
                  className="w-full bg-slate-50 dark:bg-[#1a1c1e] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                >
                  {loadingWorkflows && <option>Carregando fluxos...</option>}
                  {!loadingWorkflows && workflows.length === 0 && (
                    <option>Nenhum fluxo encontrado</option>
                  )}
                  {workflows.map(wf => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {activeWorkflow && (
              <div className="self-end pb-1 sm:pb-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  Status no n8n
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border ${
                  activeWorkflow.active 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    activeWorkflow.active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'
                  }`} />
                  {activeWorkflow.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-end self-end">
            <Button
              onClick={handleRefresh}
              disabled={loadingWorkflows || loadingExecutions}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 h-auto rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${loadingExecutions || loadingWorkflows ? 'animate-spin' : ''}`} />
              Atualizar Execuções
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 4.2 Lista de Execuções Recentes */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-sm font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-1">
            Execuções Recentes (Lim. 10)
          </h3>
          
          {loadingExecutions ? (
            <Card className="p-12 flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-400 dark:text-slate-500">Buscando execuções do n8n...</p>
            </Card>
          ) : executions.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800 rounded-2xl">
              <Info className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Nenhuma execução encontrada para este workflow.
              </p>
            </Card>
          ) : (
            <div className="max-h-[calc(100vh-230px)] lg:max-h-[650px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800">
              {executions.map(exec => {
                const isSelected = selectedExecutionId === exec.id;
                return (
                  <Card 
                    key={exec.id}
                    onClick={() => handleSelectExecution(exec.id)}
                    className={`p-4 cursor-pointer transition-all duration-200 rounded-xl border hover:scale-[1.01] ${
                      isSelected 
                        ? 'bg-blue-500/5 border-blue-500 dark:bg-blue-500/10' 
                        : 'bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-[#1a1c1e]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                            #{exec.id}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            exec.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : exec.status === 'error'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : exec.status === 'waiting'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            {exec.status === 'success' && 'Sucesso'}
                            {exec.status === 'error' && 'Erro'}
                            {exec.status === 'waiting' && 'Aguardando'}
                            {exec.status === 'running' && 'Em Andamento'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(exec.startedAt)}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 justify-end">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDuration(exec.startedAt, exec.stoppedAt)}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${
                          exec.mode === 'webhook'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : exec.mode === 'manual'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                        }`}>
                          {exec.mode === 'webhook' && <Globe className="w-2.5 h-2.5" />}
                          {exec.mode === 'manual' && <PlayCircle className="w-2.5 h-2.5" />}
                          {exec.mode === 'webhook' ? 'Webhook' : exec.mode === 'manual' ? 'Manual' : exec.mode}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* 4.3 Visualizador Simplificado do Status dos Nós (N8nSimpleStatusViewer) */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedExecutionId ? (
            <Card className="p-12 text-center bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center min-h-[300px]">
              <Workflow className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
              <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">Nenhuma Execução Selecionada</h4>
              <p className="text-slate-400 dark:text-slate-500 text-sm max-w-xs">
                Selecione uma execução na lista à esquerda para carregar e visualizar o mapa de nós processados.
              </p>
            </Card>
          ) : loadingDetails ? (
            <Card className="p-12 flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800 rounded-2xl min-h-[300px]">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-400 dark:text-slate-500">Carregando mapa de nós...</p>
            </Card>
          ) : !executionDetails ? (
            <Card className="p-12 text-center bg-white dark:bg-[#131517] border-slate-200 dark:border-slate-800 rounded-2xl min-h-[300px] flex items-center justify-center">
              <p className="text-rose-500 text-sm font-semibold">Erro ao carregar detalhes desta execução.</p>
            </Card>
          ) : (
            <N8nSimpleStatusViewer 
              workflowData={executionDetails?.workflowData} 
              executionDetails={executionDetails} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminN8N;
