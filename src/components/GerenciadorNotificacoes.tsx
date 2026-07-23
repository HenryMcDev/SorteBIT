import React, { useState, useEffect } from 'react';
import { 
  Bell, Trash2, Edit3, Plus, Send, CheckCircle2, AlertCircle, 
  Clock, Lock, Unlock, Smartphone, Sparkles, Loader2 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: number;
  titulo: string;
  mensagem: string;
  horario_disparo?: string;
  is_fixo?: boolean;
  dias_semana?: number[];
  criado_em?: string;
  atualizado_em?: string;
}

export default function GerenciadorNotificacoes() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Estados do Formulário
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [horarioDisparo, setHorarioDisparo] = useState('12:00');
  const [isFixo, setIsFixo] = useState(false);
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);

  // Estados do Modal de Confirmação de Disparo
  const [confirmTriggerOpen, setConfirmTriggerOpen] = useState(false);
  const [templateToTrigger, setTemplateToTrigger] = useState<Template | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerError, setTriggerError] = useState('');

  // Estados do Modal de Confirmação de Exclusão
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('token') || '';

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/notifications/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setTemplates(data);
      } else {
        showStatus('error', data.error || 'Erro ao carregar templates.');
      }
    } catch (err) {
      showStatus('error', 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (type: string, text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !mensagem) return showStatus('error', 'Preencha o título e a mensagem.');

    setLoading(true);
    const url = isEditing 
      ? `${import.meta.env.VITE_BACKEND_URL || ''}/api/notifications/templates/${currentId}` 
      : `${import.meta.env.VITE_BACKEND_URL || ''}/api/notifications/templates`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('token') || '';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          titulo, 
          mensagem, 
          horario_disparo: horarioDisparo, 
          is_fixo: isFixo,
          dias_semana: isFixo ? diasSemana : []
        })
      });

      const resData = await response.json();

      if (response.ok) {
        showStatus('success', isEditing ? 'Notificação atualizada!' : 'Notificação programada com sucesso!');
        limparFormulario();
        fetchTemplates();
      } else {
        showStatus('error', resData.error || 'Erro ao salvar.');
      }
    } catch (err) {
      showStatus('error', 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (t: Template) => {
    setIsEditing(true);
    setCurrentId(t.id);
    setTitulo(t.titulo);
    setMensagem(t.mensagem);
    setHorarioDisparo(t.horario_disparo ? t.horario_disparo.substring(0, 5) : '12:00');
    setIsFixo(t.is_fixo || false);
    setDiasSemana(t.dias_semana || [1, 2, 3, 4, 5]);
  };

  const handlePrepareDeletar = (t: Template) => {
    setTemplateToDelete(t);
    setDeleteError('');
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDeletar = async () => {
    if (!templateToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('token') || '';

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/notifications/templates/${templateToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: "Notificação excluída",
          description: `A notificação "${templateToDelete.titulo}" foi excluída com sucesso.`,
        });
        setConfirmDeleteOpen(false);
        setTemplateToDelete(null);
        fetchTemplates();
        if (currentId === templateToDelete.id) limparFormulario();
      } else {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.error || 'Erro ao excluir a notificação.');
      }
    } catch (err) {
      setDeleteError('Erro de conexão.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePrepareDisparo = (t: Template) => {
    setTemplateToTrigger(t);
    setTriggerError('');
    setConfirmTriggerOpen(true);
  };

  const handleConfirmDisparar = async () => {
    if (!templateToTrigger) return;
    setTriggerLoading(true);
    setTriggerError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('token') || '';

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/notifications/disparar-imediato/${templateToTrigger.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "O disparo de notificações PWA foi iniciado para todos os alunos!",
        });
        setConfirmTriggerOpen(false);
        setTemplateToTrigger(null);
      } else {
        const data = await response.json().catch(() => ({}));
        setTriggerError(data.error || 'Falha no disparo da notificação.');
      }
    } catch (err) {
      setTriggerError('Erro de conexão com o servidor.');
    } finally {
      setTriggerLoading(false);
    }
  };

  const limparFormulario = () => {
    setIsEditing(false);
    setCurrentId(null);
    setTitulo('');
    setMensagem('');
    setHorarioDisparo('12:00');
    setIsFixo(false);
    setDiasSemana([1, 2, 3, 4, 5]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* Banner de Título Premium */}
      <div className="flex items-center justify-between bg-white dark:bg-[#131517] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 dark:bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Uniforme Premiado — Central de Notificações PWA
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Programe os horários dos alertas diários ou efetue disparos manuais em tempo real.
            </p>
          </div>
        </div>
      </div>

      {/* Alertas de Feedback */}
      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border shadow-sm transition-all ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50' 
            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Formulário Estilizado UX/UI (5 Colunas) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#131517] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2">
              {isEditing ? <Edit3 className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4 text-blue-500" />}
              {isEditing ? 'Editar Notificação' : 'Criar Nova Notificação'}
            </h2>
            {isEditing && (
              <button onClick={limparFormulario} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSalvar} className="space-y-5">
            
            {/* Título */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1.5">
                Título da Notificação
              </label>
              <input 
                type="text" 
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: 👕 Já vestiu seu uniforme?"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1a1c1e] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Mensagem */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1.5">
                Mensagem PUSH
              </label>
              <textarea 
                rows={3}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Ex: Não se esqueça de fazer seu check-in no SorteBIT ao chegar na escola para acumular CashBits!"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1a1c1e] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
              ></textarea>
            </div>

            {/* Horário e Recorrência (Cadeado) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              
              {/* Horário */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1.5">
                  Horário de Disparo
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="time" 
                    value={horarioDisparo}
                    onChange={(e) => setHorarioDisparo(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1a1c1e] text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Cadeado de Fixação Recorrente */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1.5">
                  Regra de Recorrência
                </label>
                <button
                  type="button"
                  onClick={() => setIsFixo(!isFixo)}
                  className={`w-full h-[38px] px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                    isFixo 
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 dark:text-amber-400' 
                      : 'bg-slate-50/50 dark:bg-[#1a1c1e] border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  {isFixo ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4" />}
                  <span>{isFixo ? 'Fixado Diário' : 'Pontual'}</span>
                </button>
              </div>

            </div>

            {/* Seletor de Dias da Semana (Exibido apenas se for Fixo/Recorrente) */}
            {isFixo && (
              <div className="space-y-2 pt-1 animate-in slide-in-from-top-2 duration-200">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  Dias de Disparo
                </label>
                <div className="flex gap-2 justify-between">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, index) => {
                    const selected = diasSemana.includes(index);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            setDiasSemana(diasSemana.filter(d => d !== index));
                          } else {
                            setDiasSemana([...diasSemana, index].sort());
                          }
                        }}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${
                          selected
                            ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-600/20'
                            : 'bg-slate-50 dark:bg-[#1a1c1e] border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Informativo Visual do Cadeado */}
            <div className={`p-3 rounded-xl text-xs transition-all flex items-start gap-2.5 border ${
              isFixo 
                ? 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400/90' 
                : 'bg-slate-100/50 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-800 text-slate-400'
            }`}>
              {isFixo ? <Sparkles className="w-4 h-4 shrink-0 mt-0.5" /> : <Clock className="w-4 h-4 shrink-0 mt-0.5" />}
              <p>
                {isFixo 
                  ? '🔒 Cadeado Ativo: O backend disparará este alerta automaticamente TODOS OS DIAS no horário configurado.' 
                  : '🔓 Modo Livre: A notificação será disparada apenas no próximo horário ou manualmente.'}
              </p>
            </div>

            {/* PRÉ-VISUALIZAÇÃO NO CELULAR DO ALUNO */}
            <div className="mt-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                <span className="text-xs">📱</span> Pré-visualização no celular do aluno
              </label>
              
              {/* Card simulando o Push Notification Nativo */}
              <div className="w-full bg-[#f1f3f5] dark:bg-[#1a1d24] p-3.5 rounded-2xl border border-slate-200/40 dark:border-slate-800/60 shadow-sm flex items-start gap-3 transition-colors duration-200">
                
                {/* Ícone oficial vindo do Bucket do Supabase */}
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-slate-200/50 dark:border-slate-700/30 shadow-sm">
                  <img 
                    src="https://tawhebqohhpqtvijcdvj.supabase.co/storage/v1/object/public/imagens/icon_up_192x192.webp" 
                    alt="Logo SorteBIT" 
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Conteúdo dinâmico baseado nos inputs digitados no formulário */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {titulo || 'Título da notificação...'}
                    </h4>
                    <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500 flex-shrink-0">
                      {horarioDisparo || '12:00'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed break-words">
                    {mensagem || 'Sua mensagem aparecerá assim para os estudantes na tela de bloqueio.'}
                  </p>
                </div>

              </div>
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition disabled:opacity-50 mt-2"
            >
              {isEditing ? 'Atualizar Notificação' : 'Salvar e Programar'}
            </button>
          </form>

        </div>

        {/* Lista de Templates Cadastrados (7 Colunas) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900 dark:text-white">
              Notificações Ativas no Banco
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Total: {templates.length}
            </span>
          </div>
          
          {templates.length === 0 ? (
            <div className="bg-white dark:bg-[#131517] p-12 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 text-sm shadow-sm">
              Nenhuma notificação cadastrada. Preencha o formulário para adicionar.
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div 
                  key={t.id} 
                  className={`bg-white dark:bg-[#131517] p-5 rounded-2xl border transition-all duration-200 shadow-sm flex flex-col justify-between gap-4 ${
                    t.is_fixo 
                      ? 'border-amber-500/30 dark:border-amber-500/20 hover:border-amber-500/50' 
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">{t.titulo}</h3>
                          
                          {/* Selo do Cadeado Recorrente */}
                          {t.is_fixo ? (
                            <span className="flex items-center gap-1 text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-500 px-2 py-0.5 rounded-full font-semibold">
                              <Lock className="w-3 h-3" /> Fixo Diário
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                              <Clock className="w-3 h-3" /> Pontual
                            </span>
                          )}
                        </div>

                        {t.is_fixo && t.dias_semana && t.dias_semana.length > 0 && (
                          <div className="flex gap-1.5 mt-0.5">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, idx) => {
                              const active = t.dias_semana?.includes(idx);
                              return (
                                <span
                                  key={idx}
                                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-extrabold border ${
                                    active
                                      ? 'bg-blue-600/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                                      : 'bg-slate-100 dark:bg-slate-800/40 border-transparent text-slate-400 dark:text-slate-600'
                                  }`}
                                >
                                  {dia}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Horário Badge */}
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-[#1a1c1e] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-mono font-bold border border-slate-200/50 dark:border-slate-800">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        {t.horario_disparo ? t.horario_disparo.substring(0, 5) : '12:00'}
                      </span>
                    </div>

                    {/* Mensagem */}
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t.mensagem}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-1 text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Pronto para envio automático pelo Node.js
                    </span>

                    <div className="flex items-center gap-1">
                      <button 
                        type="button"
                        onClick={() => handlePrepareDisparo(t)}
                        title="Disparar no celular dos alunos agora"
                        className="px-3 py-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 border border-emerald-500/20 font-medium transition flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" /> Disparar Agora
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleEditar(t)}
                        title="Editar"
                        className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handlePrepareDeletar(t)}
                        title="Excluir"
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal de Confirmação de Disparo de Notificação */}
      <Dialog open={confirmTriggerOpen} onOpenChange={setConfirmTriggerOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-900/60 pb-3 flex flex-row items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-amber-500 animate-bounce" />
            </div>
            <DialogTitle className="text-slate-900 dark:text-white text-lg font-bold">
              Confirmar Disparo de Notificação
            </DialogTitle>
          </DialogHeader>

          {templateToTrigger && (
            <div className="space-y-4 pt-3 text-sm">
              <div className="space-y-2 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-100 dark:border-zinc-900">
                <div className="space-y-1">
                  <span className="block text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Título da Notificação
                  </span>
                  <h4 className="font-bold text-slate-800 dark:text-zinc-200">
                    {templateToTrigger.titulo}
                  </h4>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-zinc-900/50">
                  <span className="block text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Mensagem Push
                  </span>
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
                    {templateToTrigger.mensagem}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold">
                  Aviso: Esta notificação será enviada em tempo real para o celular de todos os alunos cadastrados no sistema.
                </p>
              </div>

              {triggerError && (
                <div className="flex items-start gap-2 p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium">
                    {triggerError}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-900/60">
                <Button
                  type="button"
                  variant="outline"
                  disabled={triggerLoading}
                  onClick={() => setConfirmTriggerOpen(false)}
                  className="h-10 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-white dark:border-slate-700 px-4 text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={triggerLoading}
                  onClick={handleConfirmDisparar}
                  className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md px-5 flex items-center justify-center gap-1.5"
                >
                  {triggerLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Disparando...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Sim, Disparar Agora
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão de Notificação */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-900/60 pb-3 flex flex-row items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-rose-500" />
            </div>
            <DialogTitle className="text-slate-900 dark:text-white text-lg font-bold">
              Excluir Notificação
            </DialogTitle>
          </DialogHeader>

          {templateToDelete && (
            <div className="space-y-4 pt-3 text-sm">
              <p className="text-slate-500 dark:text-zinc-400">
                Tem certeza que deseja excluir esta notificação?
              </p>

              <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-100 dark:border-zinc-900">
                <span className="block text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Título da Notificação
                </span>
                <h4 className="font-bold text-slate-800 dark:text-zinc-200">
                  {templateToDelete.titulo}
                </h4>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold">
                  Esta ação não poderá ser desfeita e a notificação será removida permanentemente do banco de dados.
                </p>
              </div>

              {deleteError && (
                <div className="flex items-start gap-2 p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium">
                    {deleteError}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-900/60">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleteLoading}
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="h-10 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-white dark:border-slate-700 px-4 text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleConfirmDeletar}
                  className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md px-5 flex items-center justify-center gap-1.5"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Sim, Excluir
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
