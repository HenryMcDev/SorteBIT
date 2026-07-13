import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { MapPin, MapPinOff, AlertCircle, Camera, RefreshCw, X, AlertTriangle, Clock, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocationVerification } from '@/hooks/useLocationVerification';
import { PushNotificationModal } from './PushNotificationModal';
import Celebration from './Celebration';
import Mural from './Mural';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { TermosCondicoes } from './TermosCondicoes';
import { useNavigate } from 'react-router-dom';


interface StudentUser {
  id: string;
  name: string;
  termos_aceitos?: boolean;
}

interface LotteryFormProps {
  studentUser?: StudentUser;
}

const LotteryForm = ({ studentUser }: LotteryFormProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'sorteio' | 'mural'>('sorteio');
  const [userIp, setUserIp] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) throw new Error('Falha ao obter IP');
        const data = await response.json();
        setUserIp(data.ip);
      } catch (err) {
        console.error('Erro ao buscar IP:', err);
        setUserIp('Indisponível');
      }
    };
    fetchUserIp();
  }, []);
  const [name, setName] = useState(studentUser?.name || '');
  const [studentCode, setStudentCode] = useState('');
  const [phone, setPhone] = useState('');
  const [submissionState, setSubmissionState] = useState<'idle' | 'enviando' | 'processando' | 'erro' | 'sucesso'>('idle');
  const [photo, setPhoto] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [photoValidationError, setPhotoValidationError] = useState<string | null>(null);
  const [tentativasRestantes, setTentativasRestantes] = useState(3);
  const [tentativasCodigo, setTentativasCodigo] = useState(3);
  const [generatedTicket, setGeneratedTicket] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [tempoRestante, setTempoRestante] = useState<string>('');
  const [alreadyParticipated, setAlreadyParticipated] = useState(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const zoomLimitsRef = useRef({ min: 1, max: 3 });
  const [terminoFixo, setTerminoFixo] = useState<number | null>(null);
  const [isGracePeriod, setIsGracePeriod] = useState(true);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isAcceptingTerms, setIsAcceptingTerms] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();

  // Use location verification only for non-admin mode
  const {
    isLoading,
    isWithinRange,
    locationProgress,
    distance,
    retryLocation,
    error: locationError,
    showPushModal,
    isPushLoading,
    pushError,
    pushSuccess,
    requestPushPermission,
    dismissPushModal
  } = useLocationVerification(false);

  useEffect(() => {
    if (studentUser && studentUser.termos_aceitos === false) {
      setIsTermsOpen(true);
    }
  }, [studentUser?.termos_aceitos]);

  const handleAcceptTerms = async () => {
    if (!studentUser?.id) return;
    setIsAcceptingTerms(true);
    try {
      const { error } = await supabase
        .from('estudantes' as any)
        .update({ termos_aceitos: true })
        .eq('id', studentUser.id);

      if (error) throw error;

      setIsTermsOpen(false);
      toast({ title: "Termos Aceitos", description: "Obrigado por aceitar os termos de uso!" });

      // Atualiza o estado local temporariamente caso o hook demore
      if (studentUser) {
        studentUser.termos_aceitos = true;
      }
    } catch (err) {
      console.error('Erro ao aceitar termos:', err);
      toast({ title: "Erro", description: "Não foi possível confirmar o aceite. Tente novamente.", variant: "destructive" });
    } finally {
      setIsAcceptingTerms(false);
    }
  };

  useEffect(() => {
    if (studentUser?.name) {
      setName(studentUser.name);
    }
  }, [studentUser?.name]);

  useEffect(() => {
    const fetchDailyCode = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Removemos o filtro de data rigoroso via string para evitar bugs de fuso horário (UTC vs GMT-3)
        // e simplesmente ordenamos para capturar a chave de acesso mais recente gerada pelo professor.
        const { data, error } = await supabase
          .from('daily_codes')
          .select('code')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar o código diário:', error);
          return;
        }

        if (data?.code) {
          setStudentCode(data.code);
        }
      } catch (err) {
        console.error('Falha inesperada ao buscar código:', err);
      }
    };

    fetchDailyCode();
  }, []);

  useEffect(() => {
    // Única consulta de sincronia ao banco de dados local na inicialização
    const savedExpiration = localStorage.getItem('bit_expiration_time');
    if (savedExpiration) {
      const expirationTime = parseInt(savedExpiration, 10);
      const remainingMs = expirationTime - Date.now();
      if (remainingMs > 0) {
        setTerminoFixo(performance.now() + remainingMs);
        setAlreadyParticipated(true);
      } else {
        localStorage.removeItem('bit_expiration_time');
      }
    } else {
      // Fallback para manter compatibilidade com usuários que possuam o localStorage antigo
      const today = new Date().toDateString();
      if (localStorage.getItem('bit_participacao_concluida') === today) {
        const agora = new Date();
        const meiaNoite = new Date();
        meiaNoite.setHours(23, 59, 59, 999);
        const remainingMs = meiaNoite.getTime() - agora.getTime();
        if (remainingMs > 0) {
          setTerminoFixo(performance.now() + remainingMs);
          setAlreadyParticipated(true);
          localStorage.setItem('bit_expiration_time', (Date.now() + remainingMs).toString());
        }
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsGracePeriod(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!alreadyParticipated || terminoFixo === null) {
      setTempoRestante('');
      return;
    }

    const atualizarCronometro = () => {
      // Subtrai o tempo de execução atual do ponto de término fixo (alta performance, imune a mudanças de data/hora do SO durante o uso)
      const agoraPerf = performance.now();
      const diferenca = terminoFixo - agoraPerf;

      if (diferenca > 0) {
        const horas = Math.floor((diferenca / (1000 * 60 * 60)) % 24);
        const minutos = Math.floor((diferenca / 1000 / 60) % 60);
        const segundos = Math.floor((diferenca / 1000) % 60);

        setTempoRestante(
          `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`
        );
      } else {
        setTempoRestante('00:00:00');
        localStorage.removeItem('bit_expiration_time');
        localStorage.removeItem('bit_participacao_concluida');
        setAlreadyParticipated(false);
        setTerminoFixo(null);
      }
    };

    atualizarCronometro(); // Atualiza o visual imediatamente
    const timer = setInterval(atualizarCronometro, 1000); // Otimizado: atualiza estritamente uma vez por segundo

    // Limpa o lixo de memória ao desmontar o componente
    return () => clearInterval(timer);
  }, [alreadyParticipated, terminoFixo]);

  useEffect(() => {
    if (pushSuccess) {
      toast({
        title: "Notificações Ativas! ✅",
        description: "Pronto! Você receberá lembretes diários para o check-in do uniforme.",
      });
    }
  }, [pushSuccess, toast]);

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPhoto(imageSrc);
    }
  }, [webcamRef]);

  const retakePhoto = () => {
    setPhoto(null);
  };

  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const studentName = studentUser?.name || '';
    if (!name.trim() || !studentCode.trim()) {
      toast({
        title: "Erro",
        description: "Falha na sincronização dos dados automáticos. Tente recarregar a página.",
        variant: "destructive"
      });
      return;
    }

    if (!photo || typeof photo !== 'string' || photo.length < 50) {
      setPhotoValidationError("Sua foto não foi carregada corretamente. O navegador pode ter descartado o arquivo por falta de memória. Por favor, capture a foto novamente.");
      setPhoto(null);
      return;
    }

    setSubmissionState('enviando');
    setPhotoValidationError(null); // Limpa alertas anteriores

    try {
      let isSuccess = false;
      let ticketFromServer = '';

      setSubmissionState('processando');
      try {
        // Envolvemos toda a lógica de serialização e fetch em um try-catch robusto
        const payload = JSON.stringify({
          nome: name.trim(),
          codigo: studentCode.trim(),
          fotoBase64: photo,
        });

        const webhookResponse = await fetch('https://bitn8n.infinityflowapp.com/webhook/sortebit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: payload,
        });

        const responseData = await webhookResponse.json();

        if (responseData.sucesso === true) {
          isSuccess = true;
          ticketFromServer = responseData.ticket || 'SORTEBIT#VALIDADO';
        } else if (responseData.sucesso === false) {
          // Captura o texto exato da API e evita crash no React com tipos inesperados
          const erroMensagem = typeof responseData.erro === 'string'
            ? responseData.erro
            : (responseData.erro ? JSON.stringify(responseData.erro) : "A validação falhou.");

          const serverErrorType = responseData.tipoErro || null;
          setErrorType(serverErrorType);

          // Mantém a compatibilidade com a trava diária do sistema
          if (serverErrorType === 'erroParticipacao') {
            const tempoRestanteSegundos = responseData.tempoRestante;
            let remainingMs;
            if (typeof tempoRestanteSegundos === 'number') {
              remainingMs = tempoRestanteSegundos * 1000;
            } else {
              const agora = new Date();
              const meiaNoite = new Date();
              meiaNoite.setHours(23, 59, 59, 999);
              remainingMs = meiaNoite.getTime() - agora.getTime();
            }

            localStorage.setItem('bit_expiration_time', (Date.now() + remainingMs).toString());
            localStorage.setItem('bit_participacao_concluida', new Date().toDateString()); // Fallback visual antigo

            setTerminoFixo(performance.now() + remainingMs);
            setAlreadyParticipated(true);

            setAnalysisError(null);
            setErrorType(null);
            setSubmissionState('idle');
            return;
          } else if (serverErrorType === 'erroUniforme') {
            setTentativasRestantes(prev => prev > 0 ? prev - 1 : 0);
            setAnalysisError(erroMensagem);
          } else if (serverErrorType === 'erroCode') {
            setTentativasCodigo(prev => prev > 0 ? prev - 1 : 0);
            setAnalysisError(erroMensagem);
          } else if (serverErrorType === 'erroSeguranca') {
            setAnalysisError(erroMensagem);
          } else {
            setPhotoValidationError(erroMensagem);
          }
          setSubmissionState('erro');
          return;
        } else {
          const erroGenerico = typeof responseData.erro === 'string'
            ? responseData.erro
            : (responseData.mensagem || "A análise detectou um problema na sua foto.");

          const serverErrorType = responseData.tipoErro || null;
          setErrorType(serverErrorType);

          if (serverErrorType === 'erroParticipacao') {
            const tempoRestanteSegundos = responseData.tempoRestante;
            let remainingMs;
            if (typeof tempoRestanteSegundos === 'number') {
              remainingMs = tempoRestanteSegundos * 1000;
            } else {
              const agora = new Date();
              const meiaNoite = new Date();
              meiaNoite.setHours(23, 59, 59, 999);
              remainingMs = meiaNoite.getTime() - agora.getTime();
            }

            localStorage.setItem('bit_expiration_time', (Date.now() + remainingMs).toString());
            localStorage.setItem('bit_participacao_concluida', new Date().toDateString()); // Fallback visual antigo

            setTerminoFixo(performance.now() + remainingMs);
            setAlreadyParticipated(true);

            setAnalysisError(null);
            setErrorType(null);
            setSubmissionState('idle');
            return;
          } else if (serverErrorType === 'erroUniforme') {
            setTentativasRestantes(prev => prev > 0 ? prev - 1 : 0);
            setAnalysisError(String(erroGenerico));
          } else if (serverErrorType === 'erroCode') {
            setTentativasCodigo(prev => prev > 0 ? prev - 1 : 0);
            setAnalysisError(String(erroGenerico));
          } else if (serverErrorType === 'erroSeguranca') {
            setAnalysisError(String(erroGenerico));
          } else {
            setPhotoValidationError(String(erroGenerico));
          }
          setSubmissionState('erro');
          return;
        }
      } catch (error: any) {
        console.error("Webhook error:", error);
        // Atualiza estado de erro ao invés de manipular o DOM
        setPhotoValidationError("Não foi possível conectar ao servidor. Verifique sua internet ou tente novamente mais tarde.");
        setSubmissionState('erro');
        return;
      }

      if (isSuccess) {
        setSubmissionState('sucesso');
        const formattedTicket = ticketFromServer;
        setGeneratedTicket(formattedTicket);
      }

    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmissionState('erro');
      toast({
        title: "Erro",
        description: "Erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    }
  };


  // Show error UI if photo validation fails
  if (analysisError && errorType === 'erroUniforme') {
    return (
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl">
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center">
              <Camera className="w-12 h-12 text-red-500 dark:text-red-400" />
            </div>

            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="w-6 h-6 text-school-yellow-500 dark:text-school-yellow-400 fill-current" />
                <h2 className="text-xl md:text-2xl font-bold text-school-blue-700 dark:text-white">
                  {tentativasRestantes > 0 ? 'Sua foto precisa de um ajuste' : 'Tentativas Esgotadas'}
                </h2>
              </div>
              <span className="text-sm font-bold px-4 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full border border-red-200 dark:border-red-800/50">
                Você tem mais {tentativasRestantes} tentativa{tentativasRestantes !== 1 ? 's' : ''} de 3
              </span>
            </div>

            <p className="text-gray-600 dark:text-zinc-400 px-2">
              {tentativasRestantes > 0
                ? 'A análise detectou um problema. Vamos resolver isso para você!'
                : 'Você atingiu o limite de envios. Por favor, procure um instrutor para validação manual.'}
            </p>

            {tentativasRestantes > 0 ? (
              <>
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg p-4 max-w-sm mx-auto">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{analysisError}</p>
                </div>

                <ul className="text-left text-sm md:text-base text-gray-500 dark:text-zinc-400 space-y-2 max-w-sm mx-auto list-disc pl-5">
                  <li>Certifique-se de que o logo da BIT na sua roupa está visível</li>
                  <li>Mostre seu rosto claramente</li>
                  <li>Evite fundos com reflexos de telas</li>
                </ul>

                <div className="border-2 border-yellow-200 dark:border-yellow-800/50 rounded-2xl p-4 md:p-6 my-6 max-w-sm mx-auto">
                  <Button
                    onClick={() => {
                      setAnalysisError(null);
                      setErrorType(null);
                      setSubmissionState('idle');
                      setPhoto(null);
                      setZoom(1);
                      setIsCameraOpen(true);
                    }}
                    className="w-full h-14 md:h-16 text-base md:text-lg font-bold bg-[#FFF9D6] hover:bg-[#FFF4B3] text-school-blue-800 dark:text-white rounded-xl shadow-sm transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
                    Tentar Novamente
                  </Button>
                </div>
              </>
            ) : (
              <div className="border-2 border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 rounded-2xl p-4 md:p-6 my-6 max-w-sm mx-auto">
                <Button
                  disabled
                  className="w-full h-14 md:h-16 text-base md:text-lg font-bold bg-red-50 dark:bg-red-950/300 text-white rounded-xl shadow-sm opacity-100 flex items-center justify-center gap-2"
                >
                  Envio Bloqueado
                </Button>
              </div>
            )}

            <div className="text-center pt-4 border-t border-gray-100 dark:border-slate-800 mt-6">
              <img
                src="/img/logo.png"
                alt="Logo da Escola"
                className="mx-auto h-12 md:h-16 w-auto object-contain block dark:hidden"
              />
              <img
                src="/img/logo_branca.png"
                alt="Logo da Escola"
                className="mx-auto h-12 md:h-16 w-auto object-contain hidden dark:block"
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (analysisError && errorType === 'erroSeguranca') {
    return (
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl">
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center">
              <Camera className="w-12 h-12 text-red-500 dark:text-red-400" />
            </div>

            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="w-6 h-6 text-school-yellow-500 dark:text-school-yellow-400 fill-current" />
                <h2 className="text-xl md:text-2xl font-bold text-school-blue-700 dark:text-white">
                  Validação de Segurança
                </h2>
              </div>
            </div>

            <p className="text-gray-600 dark:text-zinc-400 px-2">
              Não foi possível validar sua foto. Por favor, certifique-se de tirar uma foto real neste momento.
            </p>

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg p-4 max-w-sm mx-auto">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{analysisError}</p>
            </div>

            <ul className="text-left text-sm md:text-base text-gray-500 dark:text-zinc-400 space-y-2 max-w-sm mx-auto list-disc pl-5">
              <li>Tire uma foto sua agora (selfie)</li>
              <li>Não tire fotos de outras telas ou monitores</li>
              <li>Não utilize fotos impressas ou de documentos</li>
            </ul>

            <div className="border-2 border-yellow-200 dark:border-yellow-800/50 rounded-2xl p-4 md:p-6 my-6 max-w-sm mx-auto">
              <Button
                onClick={() => {
                  setAnalysisError(null);
                  setErrorType(null);
                  setSubmissionState('idle');
                  setPhoto(null);
                  setZoom(1);
                  setIsCameraOpen(true);
                }}
                className="w-full h-14 md:h-16 text-base md:text-lg font-bold bg-[#FFF9D6] hover:bg-[#FFF4B3] text-school-blue-800 dark:text-white rounded-xl shadow-sm transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
                Tentar Novamente
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-gray-100 dark:border-slate-800 mt-6">
              <img
                src="/img/logo.png"
                alt="Logo da Escola"
                className="mx-auto h-12 md:h-16 w-auto object-contain block dark:hidden"
              />
              <img
                src="/img/logo_branca.png"
                alt="Logo da Escola"
                className="mx-auto h-12 md:h-16 w-auto object-contain hidden dark:block"
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Show success UI if ticket is generated
  if (generatedTicket) {
    return (
      <Celebration
        nome={studentUser?.name || 'Aluno'}
        onClose={() => {
          setGeneratedTicket(null);
          setSubmissionState('idle');
          setPhone('');
          setPhoto(null);
        }}
      />
    );
  }

  // Standard user interface
  return (
    <>
      {activeTab === 'sorteio' && !isLoading && isWithinRange === false && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] backdrop-blur-md bg-zinc-950/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900/90 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-xl w-full max-w-sm animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
              <MapPinOff className="w-8 h-8 text-red-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {locationError ? "Acesso Bloqueado" : "Acesso Bloqueado por Proximidade"}
            </h3>
            <p className="text-zinc-300 text-sm">
              {locationError ? locationError : (
                <>
                  {distance !== null
                    ? `Você está a aproximadamente ${(distance).toFixed(0)} metros de distância. `
                    : 'Não conseguimos obter sua localização exata. '}
                  É obrigatório estar na BIT para participar.
                </>
              )}
            </p>
            <Button
              type="button"
              onClick={retryLocation}
              className="mt-4 w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4">
        {/* Navigation Tabs */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900/80 p-1.5 rounded-full mb-6 mx-auto border border-gray-200 dark:border-zinc-800 shadow-sm relative z-10">
          <button
            type="button"
            onClick={() => setActiveTab('sorteio')}
            className={`flex-1 py-3 px-4 rounded-full text-sm md:text-base font-bold transition-all duration-300 ${activeTab === 'sorteio'
              ? 'bg-school-blue-600 text-white shadow-md'
              : 'text-gray-500 dark:text-zinc-400 hover:text-school-blue-600 dark:hover:text-white'
              }`}
          >
            Participar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mural')}
            className={`flex-1 py-3 px-4 rounded-full text-sm md:text-base font-bold transition-all duration-300 ${activeTab === 'mural'
              ? 'bg-school-blue-600 text-white shadow-md'
              : 'text-gray-500 dark:text-zinc-400 hover:text-school-blue-600 dark:hover:text-white'
              }`}
          >
            Feedback da Campanha
          </button>
        </div>

        {activeTab === 'sorteio' ? (
          <Card className="p-6 md:p-8 shadow-xl border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-black text-school-blue-700 dark:text-white">
                  Participe da Campanha!
                </h2>
              </div>
              {alreadyParticipated ? (
                <div className="bg-school-blue-50 dark:bg-slate-800 border border-school-blue-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 mt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-14 h-14 bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center shadow-sm text-school-blue-600 dark:text-zinc-400 mb-2">
                      <Clock className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-school-blue-800 dark:text-white">Participação Concluída</h3>
                    <p className="text-school-blue-600 dark:text-zinc-400 font-medium">
                      Você já registrou sua participação no sorteio de hoje.
                    </p>
                    <div className="pt-6 border-t border-school-blue-200 dark:border-slate-700/50 w-full mt-2">
                      <p className="text-xs font-bold text-school-blue-700 dark:text-white uppercase tracking-widest mb-3">
                        Sua próxima chance de ganhar renova em
                      </p>
                      <div className="text-4xl font-mono font-black text-school-blue-800 dark:text-white tracking-wider">
                        {tempoRestante}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={() => navigate('/instrucoes', { state: { deFormulario: true } })}
                    className="w-full py-6 bg-gradient-to-r from-school-blue-500 to-indigo-600 hover:from-school-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mb-6"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>Instruções de Uso - Uniforme Premiado</span>
                  </Button>
                  <form onSubmit={handleSubmit} className="space-y-4">
                  {isLoading && (
                    <div className="w-full transition-all duration-300">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-school-blue-700 dark:text-zinc-300 flex items-center gap-1">
                          <MapPin className="w-4 h-4 animate-pulse" />
                          Buscando localização...
                        </span>
                        <span className="text-sm font-bold text-school-blue-700 dark:text-zinc-300">{locationProgress}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300 bg-school-blue-500"
                          style={{ width: `${locationProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {photoValidationError && (
                    <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-start justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                      <div className="flex gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400 shrink-0" />
                        <div>
                          <h4 className="font-bold text-red-800 dark:text-red-200">Atenção</h4>
                          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{photoValidationError}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoValidationError(null);
                          setSubmissionState('idle');
                          setPhoto(null);
                        }}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:text-red-300 transition-colors p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}



                  <div className="hidden space-y-2">
                    <Label className="text-school-blue-700 dark:text-zinc-200 font-semibold">
                      Nome completo (Leitura)
                    </Label>
                    <Input
                      type="text"
                      value={name}
                      disabled
                      className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 dark:bg-zinc-900/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-xl cursor-not-allowed opacity-80"
                    />
                  </div>

                  <div className="hidden space-y-2">
                    <Label className="text-school-blue-700 dark:text-zinc-200 font-semibold">
                      Código do dia (Automação)
                    </Label>
                    <Input
                      type="text"
                      value={studentCode || 'Buscando código automático...'}
                      disabled
                      className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 dark:bg-zinc-900/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-xl cursor-not-allowed opacity-80 font-mono"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-school-blue-700 dark:text-white font-semibold">
                      Foto com o Uniforme *
                    </Label>
                    {!photo ? (
                      <Button
                        type="button"
                        onClick={() => { setZoom(1); setIsCameraOpen(true); }}
                        className="w-full h-16 md:h-20 bg-school-blue-600 hover:bg-school-blue-700 text-white rounded-xl flex items-center justify-center shadow-md transition-transform hover:scale-[1.02]"
                      >
                        <Camera className="w-8 h-8 mr-3" />
                        <span className="text-lg font-bold">Abrir Câmera</span>
                      </Button>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="overflow-hidden rounded-xl border-4 border-school-blue-500 w-full max-w-sm aspect-[3/4] relative group shadow-lg bg-black flex items-center justify-center">
                          <img src={photo} alt="Selfie capturada" className="w-full h-full object-contain" />
                          <Button
                            type="button"
                            onClick={retakePhoto}
                            className="absolute top-3 right-3 w-10 h-10 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] border-2 border-white dark:border-zinc-800 flex items-center justify-center transition-all hover:scale-110"
                            title="Excluir foto"
                          >
                            <X className="w-6 h-6" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>



                  {(!isWithinRange || locationProgress < 100) ? (
                    <Button
                      type="button"
                      disabled
                      className="w-full h-auto py-5 text-base md:text-lg font-bold rounded-2xl shadow-sm bg-zinc-800 border border-zinc-700 text-zinc-500 disabled:opacity-100 cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                          <span>Aguarde...</span>
                        </div>
                      ) : (
                        <span>Você não está na BIT</span>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submissionState === 'enviando' || submissionState === 'processando' || !photo || photoValidationError !== null || tentativasCodigo === 0}
                      className="w-full h-auto py-5 text-base md:text-lg font-bold rounded-2xl shadow-sm bg-school-blue-600 hover:bg-school-blue-700 text-white animate-pulse-subtle disabled:opacity-70 disabled:animate-none hover:shadow-md transition-all duration-300"
                    >
                      {(submissionState === 'enviando' || submissionState === 'processando') ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          {submissionState === 'processando' ? 'Analisando foto, aguarde...' : 'Processando...'}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          Participar do sorteio
                        </div>
                      )}
                    </Button>
                  )}
                </form>
                </>
              )}

              <div className="text-center pt-4">
                <img
                  src="/img/logo.png"
                  alt="Logo da Escola"
                  className="mx-auto h-16 md:h-20 w-auto object-contain block dark:hidden"
                />
                <img
                  src="/img/logo_branca.png"
                  alt="Logo da Escola"
                  className="mx-auto h-16 md:h-20 w-auto object-contain hidden dark:block"
                />
              </div>
            </div>
          </Card>
        ) : (
          <Mural studentUser={studentUser || { id: '', name: '' }} />
        )}

        {/* Camera Overlay */}
        {isCameraOpen && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center sm:p-6 backdrop-blur-none">
            <Card className="w-full h-full sm:h-auto max-w-md bg-black border-0 sm:border sm:border-gray-800 sm:rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col">

              {/* Viewfinder - Tela Cheia */}
              <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden bg-black">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  mirrored={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.8}
                  videoConstraints={{ facingMode: "user" }}
                  onUserMedia={(stream) => {
                    const track = stream.getVideoTracks()[0];
                    if (track) {
                      videoTrackRef.current = track;
                      if (typeof track.getCapabilities === 'function') {
                        const capabilities = track.getCapabilities();
                        // @ts-expect-error - zoom might not be typed in all environments
                        if (capabilities && capabilities.zoom) {
                          // @ts-expect-error
                          const minZoom = capabilities.zoom.min || 1;
                          // @ts-expect-error
                          const maxZoom = capabilities.zoom.max || 3;
                          
                          zoomLimitsRef.current = { min: minZoom, max: maxZoom };
                          setZoom(minZoom);
                          
                          track.applyConstraints({
                            // @ts-expect-error - zoom might not be typed in all environments
                            advanced: [{ zoom: minZoom }]
                          }).catch(e => console.error("Erro ao configurar zoom inicial:", e));
                        }
                      }
                    }
                  }}
                  className="absolute inset-0 w-full h-full object-cover origin-center"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Texto Instrucional Topo */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-11/12 max-w-[340px] px-6 py-3 bg-black/60 rounded-full backdrop-blur-md z-10 text-center shadow-lg border border-white/10 animate-in fade-in slide-in-from-top-4 duration-500">
                  <p className="text-white font-medium text-sm md:text-base tracking-wide leading-tight">
                    Posicione seu rosto e o uniforme dentro da marcação
                  </p>
                </div>

                {/* Controle de Zoom Vertical (Lateral Direita) */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 bg-black/40 py-4 px-2 rounded-full backdrop-blur-md border border-white/10 z-20 shadow-lg animate-in fade-in slide-in-from-right-4">
                  <span className="text-white font-bold text-lg leading-none select-none">+</span>
                  <div className="h-40 w-6 flex items-center justify-center touch-none">
                    <input
                      type="range"
                      min={zoomLimitsRef.current?.min || 1}
                      max={zoomLimitsRef.current?.max || 3}
                      step="0.1"
                      value={zoom}
                      onChange={(e) => {
                        const newZoom = parseFloat(e.target.value);
                        setZoom(newZoom);
                        if (videoTrackRef.current) {
                          videoTrackRef.current.applyConstraints({
                            // @ts-expect-error
                            advanced: [{ zoom: newZoom }]
                          }).catch(err => console.error("Erro ao aplicar zoom:", err));
                        }
                      }}
                      className="w-40 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white transform -rotate-90 origin-center"
                    />
                  </div>
                  <span className="text-white font-bold text-xl leading-none select-none">-</span>
                  <span className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1 select-none">Zoom</span>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between pb-8 pt-24 px-8 bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none">
                {/* Close Button (Left) */}
                <div className="relative flex-1 flex justify-start pointer-events-auto">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsCameraOpen(false);
                      videoTrackRef.current = null;
                    }}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/60 hover:bg-red-500/90 text-white border-2 border-white/30 flex items-center justify-center p-0 backdrop-blur-md transition-all hover:scale-110 hover:border-red-400 shadow-lg"
                    title="Fechar Câmera"
                  >
                    <X className="w-6 h-6 md:w-7 md:h-7" />
                  </Button>
                </div>

                {/* Capture Button (Center) */}
                <div className="relative flex-none flex items-center justify-center pointer-events-auto">
                  <Button
                    type="button"
                    onClick={() => {
                      capturePhoto();
                      setIsCameraOpen(false);
                      videoTrackRef.current = null;
                    }}
                    className="relative z-10 rounded-full w-20 h-20 flex items-center justify-center bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 shadow-[0_0_30px_rgba(250,204,21,0.5)] border-4 border-white transition-all transform hover:scale-105 active:scale-95"
                  >
                    <Camera className="w-10 h-10" />
                  </Button>
                </div>

                {/* Spacer (Right) */}
                <div className="flex-1"></div>
              </div>

            </Card>
          </div>
        )}

        {/* Push Notification Modal */}
        <PushNotificationModal
          isOpen={showPushModal}
          onClose={dismissPushModal}
          onConfirm={requestPushPermission}
          isLoading={isPushLoading}
          error={pushError}
          success={pushSuccess}
        />

        {/* Terms Modal */}
        <TermosCondicoes
          open={isTermsOpen}
          onOpenChange={(open) => {
            if (studentUser?.termos_aceitos === false) return;
            setIsTermsOpen(open);
          }}
          onInteractOutside={(e) => {
            if (studentUser?.termos_aceitos === false) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (studentUser?.termos_aceitos === false) e.preventDefault();
          }}
          footer={
            <div className="pt-4 border-t mt-auto flex justify-end">
              {studentUser?.termos_aceitos === false ? (
                <Button
                  onClick={handleAcceptTerms}
                  disabled={isAcceptingTerms}
                  className="bg-school-blue-600 hover:bg-school-blue-700 w-full sm:w-auto"
                >
                  {isAcceptingTerms ? 'Processando...' : 'Li e Aceito os Termos'}
                </Button>
              ) : (
                <Button
                  onClick={() => setIsTermsOpen(false)}
                  className="bg-school-blue-600 hover:bg-school-blue-700"
                >
                  Fechar e Voltar
                </Button>
              )}
            </div>
          }
        />
      </div>
    </>
  );
};

export default LotteryForm;
