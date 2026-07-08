import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ShieldCheck, Loader2, RefreshCw, CheckCheck, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ClassCodeManager from '@/components/ClassCodeManager';

const AdminCodes = () => {
  const { toast } = useToast();
  const [generatedAdminCode, setGeneratedAdminCode] = useState('');
  const [isGeneratingAdminCode, setIsGeneratingAdminCode] = useState(false);
  const [adminCodeCopied, setAdminCodeCopied] = useState(false);
  const [adminCodeDebugError, setAdminCodeDebugError] = useState<string | null>(null);

  const generateAdminCode = async () => {
    setIsGeneratingAdminCode(true);
    setAdminCodeDebugError(null);
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const code = Array.from({ length: 8 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');

      const { error } = await supabase.from('code_adm').insert({ code });

      if (error) {
        const debugMsg = [
          `message: ${error.message}`,
          `code: ${error.code}`,
          error.details ? `details: ${error.details}` : null,
          error.hint ? `hint: ${error.hint}` : null,
        ]
          .filter(Boolean)
          .join('\n');
        setAdminCodeDebugError(debugMsg);
        throw error;
      }

      setGeneratedAdminCode(code);
      toast({ title: 'Código gerado!', description: `Código "${code}" salvo com sucesso.` });
    } catch (err) {
      if (!adminCodeDebugError) {
        const msg = err instanceof Error ? err.message : String(err);
        setAdminCodeDebugError(`Erro inesperado: ${msg}`);
      }
      toast({
        title: 'Erro ao gerar código',
        description: 'Não foi possível salvar o código. Veja o debug abaixo.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAdminCode(false);
    }
  };

  const copyAdminCode = () => {
    if (!generatedAdminCode) return;
    navigator.clipboard.writeText(generatedAdminCode);
    setAdminCodeCopied(true);
    setTimeout(() => setAdminCodeCopied(false), 2000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Admin Invite Code Generator */}
      <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-2xl shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30">
              <ShieldCheck className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Código de Convite Administrativo</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Gere e compartilhe com quem deve se registrar como administrador.</p>
            </div>
          </div>

          <button
            onClick={generateAdminCode}
            disabled={isGeneratingAdminCode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
          >
            {isGeneratingAdminCode
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
              : <><RefreshCw className="w-4 h-4" /> Gerar Novo Código</>}
          </button>

          {adminCodeDebugError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 space-y-1">
              <p className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-widest mb-2">⚠ Debug — Erro do Supabase</p>
              {adminCodeDebugError.split('\n').map((line, i) => (
                <p key={i} className="text-xs font-mono text-red-600 dark:text-red-300 break-all">{line}</p>
              ))}
            </div>
          )}

          {generatedAdminCode && (
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 mt-2">
              <code className="flex-1 text-lg font-mono font-bold tracking-[0.2em] text-blue-600 dark:text-blue-400 select-all">
                {generatedAdminCode}
              </code>
              <button
                onClick={copyAdminCode}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${adminCodeCopied
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
              >
                {adminCodeCopied
                  ? <><CheckCheck className="w-3.5 h-3.5" /> Copiado!</>
                  : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
              </button>
            </div>
          )}
        </div>
      </Card>
      <ClassCodeManager />
    </div>
  );
};

export default AdminCodes;
