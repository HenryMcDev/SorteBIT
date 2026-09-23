import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, AlertTriangle, Download, RefreshCw, FileJson, FileText, Database, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getBackendUrl } from '@/utils/backendUrl';
import axios from 'axios';

// Duração da janela de "desfazer" antes da exclusão real (ms)
const COUNTDOWN_MS = 10000;
// Intervalo de atualização visual da barra de progresso (ms)
const TICK_MS = 100;

type Fase = 'idle' | 'modal1' | 'modal2' | 'countdown' | 'deleting';

interface ResetParticipacaoProps {
  /** Chamado após a exclusão bem-sucedida no backend, para o pai recarregar a lista */
  onResetConcluido?: () => void;
  /** Desabilita o botão principal (ex.: enquanto a lista carrega) */
  disabled?: boolean;
}

const ResetParticipacao = ({ onResetConcluido, disabled }: ResetParticipacaoProps) => {
  const { toast } = useToast();

  const [fase, setFase] = useState<Fase>('idle');
  const [confirmacaoTexto, setConfirmacaoTexto] = useState('');
  const [backupFormato, setBackupFormato] = useState<'sql' | 'csv' | 'json' | null>(null);
  const [progresso, setProgresso] = useState(0); // 0-100

  // Referências para timers e para leitura síncrona da fase dentro de listeners
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faseRef = useRef<Fase>('idle');

  useEffect(() => {
    faseRef.current = fase;
  }, [fase]);

  // Limpa o timer da contagem regressiva
  const limparTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Retorna o token de acesso da sessão ativa (Supabase)
  const obterToken = useCallback(async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || localStorage.getItem('token') || '';
  }, []);

  // Reseta todos os estados internos para o ponto inicial
  const voltarParaIdle = useCallback(() => {
    limparTimer();
    setProgresso(0);
    setConfirmacaoTexto('');
    setBackupFormato(null);
    setFase('idle');
  }, [limparTimer]);

  // Aborta a operação em andamento (usado por "Desfazer" e por perda de foco)
  const abortar = useCallback((motivoToast?: string) => {
    limparTimer();
    setProgresso(0);
    setConfirmacaoTexto('');
    setFase('idle');
    if (motivoToast) {
      toast({ title: 'Reset cancelado', description: motivoToast });
    }
  }, [limparTimer, toast]);

  // Executa o backup (download) no formato escolhido — opcional, não avança o fluxo
  const handleBackup = async (formato: 'sql' | 'csv' | 'json') => {
    setBackupFormato(formato);
    try {
      const token = await obterToken();
      const resp = await axios.get(
        `${getBackendUrl()}/api/admin/backup-participacoes?formato=${formato}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // O backend responde JSON (não-blob de arquivo) quando não há registros.
      const contentType = String(resp.headers['content-type'] || '');
      if (contentType.includes('application/json')) {
        // Precisa ler o blob como texto para detectar o aviso de vazio
        const texto = await (resp.data as Blob).text();
        try {
          const json = JSON.parse(texto);
          if (json.vazio) {
            toast({
              title: 'Nada para exportar',
              description: json.mensagem || 'Nenhum registro do mês anterior.',
            });
            return;
          }
        } catch {
          // Se não for JSON válido, segue para download
        }
      }

      // Dispara o download do arquivo recebido
      const blob = resp.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const ext = formato;
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_participacoes.${ext}`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Backup gerado',
        description: `Arquivo ${formato.toUpperCase()} baixado com sucesso.`,
      });
    } catch (err: any) {
      console.error('Erro ao gerar backup:', err);
      const status = err?.response?.status;
      toast({
        title: 'Erro no backup',
        description: status === 401
          ? 'Sessão expirada. Faça login novamente.'
          : 'Não foi possível gerar o backup. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBackupFormato(null);
    }
  };

  // Chamada real ao backend que apaga os registros do mês anterior
  const executarDelete = useCallback(async () => {
    setFase('deleting');
    try {
      const token = await obterToken();
      const resp = await axios.post(
        `${getBackendUrl()}/api/admin/reset-participacoes`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = resp.data || {};
      toast({
        title: 'Participação resetada',
        description: data.mensagem || `${data.apagados ?? 0} cupom(ns) apagado(s).`,
      });
      voltarParaIdle();
      onResetConcluido?.();
    } catch (err: any) {
      console.error('Erro ao resetar participação:', err);
      const status = err?.response?.status;
      toast({
        title: 'Erro ao resetar',
        description: status === 401
          ? 'Sessão expirada. Faça login novamente.'
          : (err?.response?.data?.erro || 'Não foi possível apagar as participações.'),
        variant: 'destructive',
      });
      voltarParaIdle();
    }
  }, [obterToken, toast, voltarParaIdle, onResetConcluido]);

  // Inicia a barra de contagem regressiva de 10s
  const iniciarCountdown = useCallback(() => {
    setConfirmacaoTexto('');
    setProgresso(0);
    setFase('countdown');

    const inicio = Date.now();
    limparTimer();
    intervalRef.current = setInterval(() => {
      const decorrido = Date.now() - inicio;
      const pct = Math.min(100, (decorrido / COUNTDOWN_MS) * 100);
      setProgresso(pct);
      if (decorrido >= COUNTDOWN_MS) {
        limparTimer();
        executarDelete();
      }
    }, TICK_MS);
  }, [limparTimer, executarDelete]);

  // Perda de foco (troca de aba, minimizar) ou fechamento aborta a contagem
  useEffect(() => {
    const abortarSePerderFoco = () => {
      if (faseRef.current === 'countdown') {
        abortar('A aba perdeu o foco. Inicie o reset novamente para continuar.');
      }
    };
    const onVisibility = () => {
      if (document.hidden) abortarSePerderFoco();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', abortarSePerderFoco);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', abortarSePerderFoco);
    };
  }, [abortar]);

  // Cleanup de timer ao desmontar
  useEffect(() => {
    return () => limparTimer();
  }, [limparTimer]);

  const confirmacaoValida = confirmacaoTexto.trim().toUpperCase() === 'SIM';
  const segundosRestantes = Math.ceil((COUNTDOWN_MS * (1 - progresso / 100)) / 1000);

  return (
    <>
      {/* Botão principal */}
      <Button
        onClick={() => setFase('modal1')}
        disabled={disabled || fase !== 'idle'}
        className="bg-red-600 hover:bg-red-700 text-white shadow-md transition-all duration-200 rounded-xl px-6 h-12 w-full sm:w-auto active:scale-[0.98] border-0"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Resetar Participação
      </Button>

      {/* Modal 1: aviso + backup opcional */}
      <Dialog open={fase === 'modal1'} onOpenChange={(open) => { if (!open) voltarParaIdle(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Resetar participação do mês anterior
            </DialogTitle>
            <DialogDescription className="pt-2">
              Esta ação vai <strong>apagar permanentemente</strong> os cupons do{' '}
              <strong>mês anterior</strong>. Os cupons do mês atual serão preservados.
              Recomendamos fazer um backup antes de continuar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Backup (opcional)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => handleBackup('sql')}
                disabled={backupFormato !== null}
                className="rounded-xl h-11 flex-col gap-1 text-xs"
              >
                {backupFormato === 'sql'
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Database className="w-4 h-4" />}
                SQL
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBackup('csv')}
                disabled={backupFormato !== null}
                className="rounded-xl h-11 flex-col gap-1 text-xs"
              >
                {backupFormato === 'csv'
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <FileText className="w-4 h-4" />}
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBackup('json')}
                disabled={backupFormato !== null}
                className="rounded-xl h-11 flex-col gap-1 text-xs"
              >
                {backupFormato === 'json'
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <FileJson className="w-4 h-4" />}
                JSON
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={voltarParaIdle} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={() => setFase('modal2')}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: confirmação por digitação de "SIM" */}
      <Dialog open={fase === 'modal2'} onOpenChange={(open) => { if (!open) voltarParaIdle(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Confirmação final
            </DialogTitle>
            <DialogDescription className="pt-2">
              Esta ação é <strong>irreversível</strong>. Para confirmar, digite{' '}
              <strong>SIM</strong> no campo abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <input
              type="text"
              autoFocus
              value={confirmacaoTexto}
              onChange={(e) => setConfirmacaoTexto(e.target.value)}
              placeholder='Digite "SIM" para confirmar'
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1a1c1e] text-sm font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={voltarParaIdle} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={iniciarCountdown}
              disabled={!confirmacaoValida}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50"
            >
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barra de contagem regressiva de 10s com opção de desfazer */}
      <Dialog
        open={fase === 'countdown' || fase === 'deleting'}
        onOpenChange={(open) => {
          // Fechar (X, ESC ou clique fora) durante a contagem equivale a "Desfazer".
          // Durante o delete em andamento, ignora o fechamento.
          if (!open && faseRef.current === 'countdown') {
            abortar();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              {fase === 'deleting'
                ? <RefreshCw className="w-5 h-5 animate-spin" />
                : <Trash2 className="w-5 h-5" />}
              {fase === 'deleting' ? 'Apagando participações...' : 'Apagando em instantes'}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {fase === 'deleting'
                ? 'Aguarde enquanto os registros são removidos do banco de dados.'
                : `Os cupons do mês anterior serão apagados em ${segundosRestantes}s. Não troque de aba ou a operação será cancelada.`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-[width] ease-linear"
                style={{ width: `${progresso}%`, transitionDuration: `${TICK_MS}ms` }}
              />
            </div>
          </div>

          {fase === 'countdown' && (
            <DialogFooter>
              <Button
                onClick={() => abortar()}
                variant="outline"
                className="rounded-xl w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Desfazer
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ResetParticipacao;
