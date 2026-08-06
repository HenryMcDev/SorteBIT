import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Users, AlertCircle, Coins, ChevronDown, Calendar, Image as ImageIcon, Tag, Search, Download, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getBackendUrl } from '@/utils/backendUrl';
import axios from 'axios';

interface Coupon {
  id: string;
  created_at: string;
  daily_code: string;
  participation_date: string;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  bitcash: number;
  coupons: Coupon[];
  lastParticipation: string | null;
  user_id?: string;
}

// Helper para sanitizar o nome completo removendo acentos/diacríticos e todos os espaços
const sanitizarNomePasta = (name: string): string => {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
};

const Participantes = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();

  // Estados de controle para busca e filtros de saldo CashBIT e cupons
  const [searchTerm, setSearchTerm] = useState('');
  const [cashBitFilter, setCashBitFilter] = useState<'todos' | 'com_saldo' | 'sem_saldo' | 'com_cupons'>('todos');

  // Estados de controle para expandir linhas e carregar fotos sob demanda
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [studentPhotos, setStudentPhotos] = useState<Record<string, string[]>>({});
  const [loadingPhotosId, setLoadingPhotosId] = useState<string | null>(null);

  // Estados para ampliação segura da foto no modal
  const [selectedPhotoBlob, setSelectedPhotoBlob] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Estados para edição de e-mail de alunos e confirmação de segurança
  const [editingEmails, setEditingEmails] = useState<Record<string, string>>({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [targetStudentId, setTargetStudentId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetOldEmail, setTargetOldEmail] = useState('');
  const [targetNewEmail, setTargetNewEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // Referência para guardar todas as Object URLs (blobs) criadas por estudante
  const activeBlobsRef = useRef<Record<string, string[]>>({});

  const handleOpenConfirmModal = (studentId: string, userId: string, oldEmail: string, newEmail: string) => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, digite um e-mail válido para o aluno.",
        variant: "destructive"
      });
      return;
    }
    if (oldEmail.toLowerCase() === newEmail.trim().toLowerCase()) {
      toast({
        title: "Nenhuma alteração",
        description: "O novo e-mail é idêntico ao e-mail atual do aluno.",
        variant: "destructive"
      });
      return;
    }
    setTargetStudentId(studentId);
    setTargetUserId(userId);
    setTargetOldEmail(oldEmail);
    setTargetNewEmail(newEmail.trim());
    setAdminPassword('');
    setIsConfirmModalOpen(true);
  };

  const handleConfirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      toast({
        title: "Senha obrigatória",
        description: "Por favor, insira a sua senha de administrador.",
        variant: "destructive"
      });
      return;
    }

    setIsSavingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await axios.post(`${getBackendUrl()}/api/admin/update-student-email`, {
        studentId: Number(targetStudentId),
        userId: targetUserId,
        newEmail: targetNewEmail,
        adminPassword: adminPassword
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data?.sucesso) {
        toast({
          title: "E-mail atualizado!",
          description: "O e-mail do aluno foi alterado com sucesso.",
        });

        setIsConfirmModalOpen(false);

        // Atualiza a lista local de participantes com o novo e-mail
        setParticipants(prev => prev.map(p => {
          if (p.id === targetStudentId || (p.user_id && p.user_id === targetUserId)) {
            return { ...p, email: targetNewEmail };
          }
          return p;
        }));
      } else {
        throw new Error(response.data?.erro || 'Erro ao atualizar e-mail.');
      }
    } catch (err: any) {
      console.error('Erro ao atualizar e-mail:', err);
      toast({
        title: "Erro na alteração",
        description: err.response?.data?.erro || err.message || "Não foi possível alterar o e-mail.",
        variant: "destructive"
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      let records: { name: string; participation_date: string }[] = [];

      // 1. Tenta buscar do backend seguro
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }

        const response = await axios.get(`${getBackendUrl()}/api/admin/export-participantes`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data?.sucesso) {
          records = response.data.participations || [];
        } else {
          throw new Error(response.data?.erro || 'Erro retornado pela API.');
        }
      } catch (backendErr: any) {
        console.warn('Falha ao obter dados do backend. Tentando consulta direta via Supabase client...', backendErr);
        
        // 2. Fallback: Consulta direta via cliente Supabase
        const now = new Date();
        let prevMonthYear = now.getFullYear();
        let prevMonth = now.getMonth() - 1;
        if (prevMonth < 0) {
          prevMonth = 11;
          prevMonthYear -= 1;
        }

        const startDate = new Date(prevMonthYear, prevMonth, 1, 0, 0, 0, 0);
        const endDate = new Date(prevMonthYear, prevMonth + 1, 0, 23, 59, 59, 999);

        const { data, error } = await supabase
          .from('lottery_participations')
          .select('name, participation_date')
          .gte('participation_date', startDate.toISOString())
          .lte('participation_date', endDate.toISOString())
          .order('participation_date', { ascending: true });

        if (error) {
          throw error;
        }

        records = (data || []).map((row: any) => ({
          name: row.name || 'Aluno Desconhecido',
          participation_date: row.participation_date || row.created_at
        }));
      }

      // 3. Valida se existem registros
      if (records.length === 0) {
        toast({
          title: "Nenhum registro encontrado",
          description: "Não foram encontradas participações confirmadas no mês anterior.",
          variant: "destructive"
        });
        return;
      }

      // 4. Formata as colunas do CSV
      const csvHeader = 'Nome do Aluno,Data da Participação';
      const csvRows = records.map(row => {
        // Escapa aspas duplas duplicando-as e envolve o nome em aspas
        const escapedName = `"${row.name.replace(/"/g, '""')}"`;
        
        // Formata data em pt-BR (DD/MM/AAAA HH:mm:ss)
        const d = new Date(row.participation_date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

        return `${escapedName},${formattedDate}`;
      });

      // 5. Injeta o caractere UTF-8 BOM (\uFEFF)
      const csvContent = '\uFEFF' + [csvHeader, ...csvRows].join('\n');
      
      // 6. Define o MIME type e aciona o download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'participantes_mes_anterior_sortebit.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Sucesso!",
        description: `Exportação concluída com ${records.length} registros.`,
      });

    } catch (err: any) {
      console.error('Erro na exportação de participantes:', err);
      toast({
        title: "Erro na exportação",
        description: err.message || "Ocorreu um erro ao gerar o arquivo CSV.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const fetchParticipants = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Busca todos os estudantes cadastrados e as participações geradas de forma paralela
      const [estudantesRes, participationsRes] = await Promise.all([
        supabase.from('estudantes' as any).select('id, nome_completo, bitcash, email, user_id'),
        supabase.from('lottery_participations').select('id, name, created_at, daily_code, participation_date')
      ]);

      if (estudantesRes.error) throw estudantesRes.error;
      if (participationsRes.error) throw participationsRes.error;

      const estudantesData = estudantesRes.data || [];
      const participationsData = participationsRes.data || [];

      // Mapeamento de participações indexadas pelo nome limpo (casing/spaces) do aluno
      const participationsMap = new Map<string, Coupon[]>();
      participationsData.forEach((row: any) => {
        if (row.name) {
          const cleanName = row.name.trim().toLowerCase();
          if (!participationsMap.has(cleanName)) {
            participationsMap.set(cleanName, []);
          }
          participationsMap.get(cleanName)!.push({
            id: row.id,
            created_at: row.created_at || row.participation_date,
            daily_code: row.daily_code || '',
            participation_date: row.participation_date || row.created_at
          });
        }
      });

      // Mesclagem global garantindo que alunos sem participações também apareçam
      const mapped = estudantesData.map((est: any) => {
        const cleanName = est.nome_completo?.trim().toLowerCase() || '';
        const studentParticipations = participationsMap.get(cleanName) || [];

        // Ordena participações por data decrescente (mais recente primeiro)
        studentParticipations.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const lastParticipation = studentParticipations.length > 0
          ? studentParticipations[0].created_at
          : null;

        return {
          id: String(est.id),
          name: est.nome_completo || 'Aluno Desconhecido',
          email: est.email || '',
          bitcash: est.bitcash || 0,
          coupons: studentParticipations,
          lastParticipation,
          user_id: est.user_id || ''
        };
      });

      // Ordenar alfabeticamente
      mapped.sort((a, b) => a.name.localeCompare(b.name));
      setParticipants(mapped);
    } catch (error: any) {
      console.error('Erro ao buscar participantes:', error);
      setErrorMsg(error?.message || 'Erro inesperado de comunicação com o Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  // Revoga as Object URLs criadas para um estudante específico para liberar memória
  const revokeStudentBlobs = (studentId: string) => {
    const urls = activeBlobsRef.current[studentId] || [];
    urls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Erro ao revogar URL do blob:', err);
      }
    });
    delete activeBlobsRef.current[studentId];

    setStudentPhotos((prev) => {
      const copy = { ...prev };
      delete copy[studentId];
      return copy;
    });
  };

  useEffect(() => {
    fetchParticipants();

    // Cleanup: revoga TODOS os blobs de todos os alunos ao desmontar o componente
    return () => {
      Object.keys(activeBlobsRef.current).forEach((studentId) => {
        const urls = activeBlobsRef.current[studentId] || [];
        urls.forEach((url) => {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            console.error('Erro de cleanup ao desmontar componente:', e);
          }
        });
      });
    };
  }, []);

  // Lógica reativa para expandir o participante e carregar fotos do bucket de forma segura usando download direto autenticado (Blob URL)
  const handleToggleExpand = async (studentId: string, studentName: string) => {
    if (expandedId === studentId) {
      setExpandedId(null);
      // Limpa e revoga os blobs do aluno ao fechar
      revokeStudentBlobs(studentId);
      return;
    }

    // Se já havia outro aluno aberto, fecha e revoga os blobs dele preventivamente
    if (expandedId && expandedId !== studentId) {
      revokeStudentBlobs(expandedId);
    }

    setExpandedId(studentId);

    // Se já buscamos fotos para esse estudante, pula nova requisição
    if (studentPhotos[studentId]) return;

    setLoadingPhotosId(studentId);
    try {
      // Remove acentos e espaços do nome completo para corresponder ao padrão de subpastas do bucket 'Fotos'
      const studentFolder = sanitizarNomePasta(studentName);
      
      // Lista as fotos presentes na pasta do estudante
      const { data: files, error } = await supabase.storage
        .from('Fotos')
        .list(studentFolder, { limit: 50 });

      if (error) throw error;

      // Filtra e prepara caminhos dos arquivos do bucket
      const filePaths = (files || [])
        .filter(f => f.name && f.name !== '.emptyFolderPlaceholder')
        .map(f => `${studentFolder}/${f.name}`);

      if (filePaths.length > 0) {
        // Faz o download de cada arquivo em paralelo como bytes binários (Blob) sob autenticação e gera Object URLs locais
        const localBlobUrls: string[] = [];
        await Promise.all(
          filePaths.map(async (path) => {
            try {
              // Download do arquivo usando a autenticação ativa (POST para download de storage)
              const { data: rawBlob, error: downloadError } = await supabase.storage
                .from('Fotos')
                .download(path);

              if (downloadError) throw downloadError;
              if (!rawBlob) return;

              // Cria a Object URL local do Blob retornado íntegro
              const localUrl = URL.createObjectURL(rawBlob);
              localBlobUrls.push(localUrl);
            } catch (err) {
              console.error(`Erro ao baixar arquivo ${path}:`, err);
            }
          })
        );

        // Armazena as Object URLs locais na referência ativa
        activeBlobsRef.current[studentId] = localBlobUrls;
        setStudentPhotos(prev => ({ ...prev, [studentId]: localBlobUrls }));
      } else {
        setStudentPhotos(prev => ({ ...prev, [studentId]: [] }));
      }
    } catch (err) {
      console.error('Erro ao carregar fotos do bucket:', err);
    } finally {
      setLoadingPhotosId(null);
    }
  };

  // Método seguro para abrir a imagem no modal - apenas reutilizamos o blob local já carregado na memória do navegador
  const handleOpenPhotoPreview = (blobUrl: string) => {
    setIsPhotoModalOpen(true);
    setSelectedPhotoBlob(blobUrl);
  };

  const handleClosePhotoPreview = () => {
    setIsPhotoModalOpen(false);
    setSelectedPhotoBlob(null);
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Nenhuma participação registrada';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Cálculo do total acumulado de cupons ativos no sistema
  const totalActiveCoupons = useMemo(() => {
    return participants.reduce((sum, p) => sum + (p.coupons?.length || 0), 0);
  }, [participants]);

  // Filtragem dinâmica de participantes em memória usando useMemo
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter = true;
      if (cashBitFilter === 'com_saldo') {
        matchesFilter = p.bitcash > 0;
      } else if (cashBitFilter === 'sem_saldo') {
        matchesFilter = p.bitcash === 0;
      } else if (cashBitFilter === 'com_cupons') {
        matchesFilter = (p.coupons?.length || 0) > 0;
      }

      return matchesSearch && matchesFilter;
    });
  }, [participants, searchTerm, cashBitFilter]);

  return (
    <Card className="p-6 md:p-8 shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/85 dark:bg-[#131517]/85 backdrop-blur-xl rounded-2xl w-full max-w-5xl mx-auto transition-colors duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 shadow-inner">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-800 dark:text-white flex items-center gap-2">
              Lista de Participantes
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-100/80 dark:bg-blue-500/25 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200/50 dark:border-blue-500/30">
                {totalActiveCoupons} {totalActiveCoupons === 1 ? 'Cupom Ativo' : 'Cupons Ativos'}
              </span>
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Alunos concorrendo no sorteio
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={handleExportCSV}
            disabled={isExporting || isLoading}
            className="bg-emerald-600 hover:bg-emerald-750 text-white shadow-md transition-all duration-200 rounded-xl px-6 h-12 w-full sm:w-auto active:scale-[0.98] border-0"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar CSV Mês Anterior
          </Button>

          <Button
            onClick={fetchParticipants}
            disabled={isLoading}
            className="bg-school-blue-600 hover:bg-school-blue-700 text-white shadow-md transition-all duration-200 rounded-xl px-6 h-12 w-full sm:w-auto active:scale-[0.98] border-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar Lista
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Barra de Ferramentas: Caixa de Busca e Filtros de Saldo */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10 p-3 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/50">
          
          {/* Campo de Pesquisa por Nome */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar aluno pelo nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1a1c1e] text-sm font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-500/20 transition-all shadow-sm"
            />
          </div>

          {/* Seletor de Filtro de Saldo CashBIT e Cupons */}
          <div className="flex bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl w-full md:w-auto border border-zinc-200/10">
            {(['todos', 'com_saldo', 'sem_saldo', 'com_cupons'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCashBitFilter(filter)}
                className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                  cashBitFilter === filter
                    ? 'bg-white dark:bg-[#131517] text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {filter === 'todos' && 'Todos'}
                {filter === 'com_saldo' && 'Quem tem CashBIT'}
                {filter === 'sem_saldo' && 'Quem não tem CashBIT'}
                {filter === 'com_cupons' && 'Com Cupons Ativos'}
              </button>
            ))}
          </div>

        </div>

        {/* Listagem de Participantes com Altura Controlada e Scroll Interno */}
        {isLoading && participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-500/50 animate-spin" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Buscando dados no Supabase...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100/50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-500 dark:text-red-400" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-red-600 dark:text-red-400 font-semibold">
                Erro ao carregar participantes
              </p>
              <p className="text-red-500 dark:text-red-500/80 text-sm max-w-md mx-auto">
                {errorMsg}
              </p>
            </div>
          </div>
        ) : filteredParticipants.length > 0 ? (
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-y-auto max-h-[520px] divide-y divide-zinc-200 dark:divide-zinc-850/80 bg-white dark:bg-zinc-950/20 shadow-lg [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-zinc-900/20 [&::-webkit-scrollbar-thumb]:bg-zinc-700/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600/85">
            {filteredParticipants.map((p, index) => {
              const isExpanded = expandedId === p.id;
              const photos = studentPhotos[p.id] || [];
              const isLoadingPhotos = loadingPhotosId === p.id;

              return (
                <div key={p.id} className="transition-all duration-200 bg-white dark:bg-zinc-950/10">
                  {/* Cabeçalho da Linha (Clicável) */}
                  <button
                    type="button"
                    onClick={() => handleToggleExpand(p.id, p.name)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 w-1/3">
                      <span className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500 min-w-[20px] text-right shrink-0">
                        {index + 1}.
                      </span>
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-600 dark:text-zinc-300 shrink-0">
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 block">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block truncate">
                          {p.email || 'Sem e-mail cadastrado'}
                        </span>
                      </div>
                    </div>

                    <div className="w-1/4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100/80 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-800 dark:text-yellow-400 rounded-lg shadow-sm">
                        <Coins className="w-4 h-4" />
                        <span className="font-bold text-sm">{p.bitcash}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 w-1/3">
                      <span className={`inline-flex items-center justify-center px-3.5 py-1 text-xs font-bold rounded-full border shadow-sm ${
                        p.coupons.length > 0
                          ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-500/25 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/30'
                          : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 border-transparent'
                      }`}>
                        {p.coupons.length} {p.coupons.length === 1 ? 'Cupom' : 'Cupons'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-blue-500' : ''
                      }`} />
                    </div>
                  </button>

                  {/* Painel de Conteúdo Expansível */}
                  {isExpanded && (
                    <div className="px-6 py-5 bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-zinc-100 dark:border-zinc-850/80 space-y-5 animate-in fade-in duration-200">
                      
                      {/* Grid de Informações Adicionais */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* Box 1: Última Participação */}
                        <div className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/60 shadow-sm space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            Última Participação
                          </h4>
                          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            {formatDateTime(p.lastParticipation)}
                          </div>
                        </div>

                        {/* Box 2: Cupons / Códigos de Sorteio */}
                        <div className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/60 shadow-sm space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-amber-500" />
                            Códigos dos Cupons
                          </h4>
                          {p.coupons.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                              {p.coupons.map((c) => (
                                <span
                                  key={c.id}
                                  title={`Código Diário: ${c.daily_code} - Data: ${formatDateTime(c.created_at)}`}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                                >
                                  {c.id}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              Nenhum cupom ativo para este aluno.
                            </div>
                          )}
                        </div>

                        {/* Box 3: Alterar E-mail do Aluno */}
                        <div className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/60 shadow-sm space-y-3 col-span-1 md:col-span-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-blue-500" />
                            Alterar E-mail do Aluno
                          </h4>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <input
                              type="email"
                              value={editingEmails[p.id] !== undefined ? editingEmails[p.id] : p.email}
                              onChange={(e) => setEditingEmails(prev => ({ ...prev, [p.id]: e.target.value }))}
                              placeholder="novo-email@aluno.com"
                              className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1a1c1e] text-zinc-900 dark:text-white placeholder-zinc-450 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            />
                            <Button
                              type="button"
                              onClick={() => handleOpenConfirmModal(p.id, p.user_id || '', p.email, editingEmails[p.id] !== undefined ? editingEmails[p.id] : p.email)}
                              disabled={isSavingEmail && targetStudentId === p.id}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 h-9 rounded-lg font-semibold active:scale-[0.98] border-0"
                            >
                              Salvar E-mail
                            </Button>
                          </div>
                        </div>

                      </div>

                      {/* Box 3: Galeria de Fotos */}
                      <div className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/60 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                          Fotos de Validação (Uniforme)
                        </h4>

                        {isLoadingPhotos ? (
                          <div className="flex items-center gap-2 py-6 text-xs text-zinc-500">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                            Acessando galeria no Supabase...
                          </div>
                        ) : photos.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {photos.map((url, index) => (
                              <div
                                key={index}
                                className="relative aspect-square rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden group shadow-sm bg-zinc-50 dark:bg-zinc-900"
                              >
                                <img
                                  src={url}
                                  alt={`Validação ${index + 1}`}
                                  className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-105 pointer-events-none select-none"
                                  loading="lazy"
                                  onContextMenu={(e) => e.preventDefault()}
                                  onDragStart={(e) => e.preventDefault()}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Erro+imagem';
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenPhotoPreview(url)}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold cursor-pointer border-0 z-20"
                                >
                                  Ampliar Foto
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
                            Nenhuma validação de uniforme registrada para este estudante.
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-zinc-600 dark:text-zinc-300 font-semibold">
                Nenhum participante encontrado
              </p>
              <p className="text-zinc-500 dark:text-zinc-500 text-sm">
                Nenhum participante atende aos filtros selecionados.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog do Shadcn UI para ampliação segura */}
      <Dialog open={isPhotoModalOpen} onOpenChange={(open) => { if (!open) handleClosePhotoPreview(); }}>
        <DialogContent className="max-w-2xl bg-zinc-950/95 border-zinc-800 text-white rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center">
          <DialogHeader className="w-full text-center">
            <DialogTitle className="text-lg font-bold text-zinc-100">Visualização Segura de Foto</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Esta imagem é protegida por direitos de privacidade do estudante. Cópia ou download não são permitidos.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-4 w-full aspect-square md:aspect-[4/3] max-h-[70vh] rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900 flex items-center justify-center">
            {selectedPhotoBlob ? (
              <img
                src={selectedPhotoBlob}
                alt="Foto de validação ampliada"
                className="max-w-full max-h-full object-contain pointer-events-none select-none"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
            ) : (
              <div className="text-sm text-zinc-500 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Não foi possível carregar a imagem.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Segurança para Alteração de E-mail */}
      <Dialog open={isConfirmModalOpen} onOpenChange={(open) => { if (!open) setIsConfirmModalOpen(false); }}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
              Confirmar Alteração de E-mail
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              Você está alterando o e-mail do aluno de <strong className="text-zinc-700 dark:text-zinc-300">{targetOldEmail}</strong> para <strong className="text-zinc-700 dark:text-zinc-200">{targetNewEmail}</strong>.
              Esta operação atualiza o cadastro principal e a autenticação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmEmailChange} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="confirmAdminPass" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Senha Atual do Administrador
              </label>
              <input
                id="confirmAdminPass"
                type="password"
                required
                placeholder="Digite sua senha de admin"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                disabled={isSavingEmail}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-850/80 bg-white dark:bg-[#1a1c1e] text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSavingEmail}
                className="rounded-lg text-xs font-semibold px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingEmail || !adminPassword}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg active:scale-[0.98] border-0 flex items-center"
              >
                {isSavingEmail ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : null}
                Confirmar Alteração de E-mail
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Participantes;
