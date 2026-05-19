import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dice1, MapPin, MapPinOff, AlertCircle, Crown, Camera, RefreshCw, X, AlertTriangle, QrCode, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocationVerification } from '@/hooks/useLocationVerification';
import Celebration from './Celebration';
import Mural from './Mural';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';


const LotteryForm = () => {
  const [activeTab, setActiveTab] = useState<'sorteio' | 'mural'>('sorteio');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentCode, setStudentCode] = useState('');
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
  const [terminoFixo, setTerminoFixo] = useState<number | null>(null);
  const [isGracePeriod, setIsGracePeriod] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();

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

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPhoto(imageSrc);
    }
  }, [webcamRef]);

  const retakePhoto = () => {
    setPhoto(null);
  };

  // Use location verification only for non-admin mode
  const { isLoading, isWithinRange, locationProgress, showContingency, latitude, longitude, distance, retryLocation } = useLocationVerification(false);

  const generateLuckyNumber = (): number => {
    return Math.floor(Math.random() * 9000) + 1000;
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

    if (!name.trim() || !phone.trim() || !studentCode.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
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
          telefone: phone.replace(/\D/g, ''),
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
        nome={name || 'Aluno'}
        onClose={() => {
          setGeneratedTicket(null);
          setSubmissionState('idle');
          setName('');
          setPhone('');
          setStudentCode('');
          setPhoto(null);
        }}
      />
    );
  }

  const isLocationInvalid = !isWithinRange;
  const showRedButton = isLocationInvalid && !isGracePeriod;

  // Standard user interface
  return (
    <>
      {activeTab === 'sorteio' && !isLoading && isWithinRange === false && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] backdrop-blur-md bg-zinc-950/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900/90 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-xl w-full max-w-sm animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
              <MapPinOff className="w-8 h-8 text-red-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white">Acesso Bloqueado por Proximidade</h3>
            <p className="text-zinc-300 text-sm">
              {distance !== null
                ? `Você está a aproximadamente ${(distance).toFixed(0)} metros de distância. `
                : 'Não conseguimos obter sua localização exata. '}
              É obrigatório estar na BIT para participar.
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
            className={`flex-1 py-3 px-4 rounded-full text-sm md:text-base font-bold transition-all duration-300 ${
              activeTab === 'sorteio'
                ? 'bg-school-blue-600 text-white shadow-md'
                : 'text-gray-500 dark:text-zinc-400 hover:text-school-blue-600 dark:hover:text-white'
            }`}
          >
            Participar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mural')}
            className={`flex-1 py-3 px-4 rounded-full text-sm md:text-base font-bold transition-all duration-300 ${
              activeTab === 'mural'
                ? 'bg-school-blue-600 text-white shadow-md'
                : 'text-gray-500 dark:text-zinc-400 hover:text-school-blue-600 dark:hover:text-white'
            }`}
          >
            Feedback do sorteio
          </button>
        </div>

        {activeTab === 'sorteio' ? (
          <Card className="p-6 md:p-8 shadow-xl border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-black text-school-blue-700 dark:text-white">
                Participe do Sorteio!
              </h2>
              <p className="text-school-blue-600 dark:text-zinc-400">
                Preencha os dados e insira o código fornecido pelo seu professor
              </p>
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

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-school-blue-700 dark:text-zinc-200 font-semibold">
                    Nome completo *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Digite seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white focus:border-school-blue-500 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-school-blue-700 dark:text-zinc-200 font-semibold">
                    Telefone *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white focus:border-school-blue-500 rounded-xl"
                    maxLength={15}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentCode" className="text-school-blue-700 dark:text-zinc-200 font-semibold">
                    Digite o código do dia *
                  </Label>
                  <Input
                    id="studentCode"
                    type="text"
                    placeholder="Digite o código"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                    className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white focus:border-school-blue-500 rounded-xl font-mono"
                    required
                    disabled={tentativasCodigo === 0}
                  />
                  {errorType === 'erroCode' && analysisError && (
                    <div className="mt-3 bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-start justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                      <div className="flex gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-red-800 dark:text-red-200 text-sm md:text-base">
                            {tentativasCodigo > 0 ? 'Código Incorreto' : 'Tentativas Esgotadas'}
                          </h4>
                          <p className="text-red-600 dark:text-red-400 text-xs md:text-sm mt-1">{analysisError}</p>
                          {tentativasCodigo > 0 ? (
                            <p className="text-red-700 dark:text-red-300 text-xs md:text-sm font-medium mt-2">
                              Você tem mais {tentativasCodigo} tentativa{tentativasCodigo !== 1 ? 's' : ''} de 3. Tente novamente ou solicite o código oficial na secretaria da BIT.
                            </p>
                          ) : (
                            <p className="text-red-700 dark:text-red-300 text-sm font-bold mt-2 uppercase tracking-wide">
                              Procure o atendimento na secretaria.
                            </p>
                          )}
                        </div>
                      </div>
                      {tentativasCodigo > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAnalysisError(null);
                            setErrorType(null);
                            setSubmissionState('idle');
                            setStudentCode(''); // Opcional: limpa o campo
                          }}
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:text-red-300 transition-colors p-1"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
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
                          className="absolute top-3 right-3 w-10 h-10 p-0 rounded-full bg-red-50 dark:bg-red-950/300 hover:bg-red-600 text-white shadow-[0_0_10px_rgba(0,0,0,0.5)] border-2 border-white flex items-center justify-center opacity-90 hover:opacity-100 transition-all hover:scale-110"
                          title="Excluir foto"
                        >
                          <X className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-start space-x-3 pt-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-school-blue-700 dark:text-white"
                    >
                      Aceito os termos e a captação da minha foto *
                    </label>
                    <p className="text-sm text-school-blue-600 dark:text-zinc-400/80">
                      Você deve ler e concordar com os{' '}
                      <button
                        type="button"
                        onClick={() => setIsTermsOpen(true)}
                        className="text-school-yellow-600 dark:text-school-yellow-400 font-bold hover:underline"
                      >
                        Termos de Uso
                      </button>
                      {' '}antes de participar.
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submissionState === 'enviando' || submissionState === 'processando' || !photo || photoValidationError !== null || isLocationInvalid || tentativasCodigo === 0 || !termsAccepted}
                  className={`w-full h-auto py-5 text-base md:text-lg font-bold rounded-2xl shadow-sm transition-all duration-500 disabled:cursor-not-allowed ${showRedButton
                    ? "bg-school-blue-600 text-white disabled:opacity-100"
                    : "bg-school-blue-600 hover:bg-school-blue-700 text-white animate-pulse-subtle disabled:opacity-70 disabled:animate-none hover:shadow-md"
                    }`}
                >
                  {(submissionState === 'enviando' || submissionState === 'processando') ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {submissionState === 'processando' ? 'Analisando foto, aguarde...' : 'Processando...'}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      {showRedButton ? 'Você não está na BIT' : 'Participar do sorteio'}
                    </div>
                  )}
                </Button>
              </form>
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
          <Mural />
        )}

        {/* Camera Overlay */}
        {isCameraOpen && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center sm:p-6 backdrop-blur-md">
            <Card className="w-full h-full sm:h-auto max-w-md bg-black border-0 sm:border sm:border-gray-800 sm:rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col">

              {/* Header */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-2 px-4 py-2 bg-black/50 rounded-full border border-white/10 backdrop-blur-md">
                  <Camera className="w-4 h-4 text-school-yellow-500 dark:text-school-yellow-400" />
                  <span className="text-white font-medium text-sm">Validar Uniforme</span>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsCameraOpen(false)}
                  className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center p-0 backdrop-blur-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Viewfinder */}
              <div
                className="relative w-full bg-[#050505] flex items-center justify-center mt-auto mb-auto"
                style={{ aspectRatio: '9 / 16', maxHeight: '100vh' }}
              >
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  mirrored={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.5}
                  videoConstraints={{ facingMode: "user" }}
                  onUserMedia={(stream) => {
                    const track = stream.getVideoTracks()[0];
                    if (track && typeof track.getCapabilities === 'function') {
                      const capabilities = track.getCapabilities();
                      // @ts-expect-error - zoom might not be typed in all environments
                      if (capabilities && capabilities.zoom) {
                        track.applyConstraints({
                          // @ts-expect-error - zoom might not be typed in all environments
                          advanced: [{ zoom: capabilities.zoom.min || 1 }]
                        }).catch(e => console.error("Erro ao configurar zoom:", e));
                      }
                    }
                  }}
                  className="w-full h-full object-contain origin-center transition-transform duration-200"
                  style={{ transform: `scale(${zoom}) scaleX(1)` }}
                />

                {/* Linhas de Grade de Composição (Grid) */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.15]">
                  <div className="w-full h-full border border-white/50 flex flex-col justify-between">
                    <div className="w-full h-[33.33%] border-b border-white/50"></div>
                    <div className="w-full h-[33.33%] border-b border-white/50"></div>
                  </div>
                  <div className="absolute inset-0 w-full h-full border border-transparent flex justify-between">
                    <div className="h-full w-[33.33%] border-r border-white/50"></div>
                    <div className="h-full w-[33.33%] border-r border-white/50"></div>
                  </div>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8 pt-20 px-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20">

                {/* Zoom Control */}
                <div className="flex items-center gap-4 w-full max-w-[280px] mb-8 bg-black/60 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
                  <span className="text-white font-bold text-xl select-none">-</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-school-yellow-500"
                  />
                  <span className="text-white font-bold text-xl select-none">+</span>
                </div>

                {/* Capture Button */}
                <Button
                  type="button"
                  onClick={() => {
                    capturePhoto();
                    setIsCameraOpen(false);
                  }}
                  className="rounded-full w-20 h-20 flex items-center justify-center bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 dark:text-white shadow-[0_0_20px_rgba(250,204,21,0.4)] border-4 border-white transition-all transform hover:scale-105 active:scale-95"
                >
                  <Camera className="w-10 h-10" />
                </Button>
              </div>

            </Card>
          </div>
        )}

        {/* Terms Modal */}
        <Dialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-school-blue-800 dark:text-white text-xl">Termos de Uso e Ciência de Tratamento de Imagem</DialogTitle>
              <DialogDescription>
                Última atualização: 13 de maio de 2026
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 text-sm text-school-blue-700 dark:text-zinc-400/80 leading-relaxed">
                <p>
                  Ao prosseguir com a participação no SorteBIT, o(a) aluno(a) declara, para todos os fins, que leu, compreendeu e concordou integralmente com as disposições deste Termo.
                </p>

                <div>
                  <h3 className="font-bold text-school-blue-800 dark:text-white">1. Objeto</h3>
                  <p>1.1. O presente Termo regula as condições de participação no sorteio denominado SorteBIT.</p>
                  <p>1.2. A participação está condicionada ao cumprimento cumulativo dos requisitos operacionais e das regras de elegibilidade aqui previstas.</p>
                </div>

                <div>
                  <h3 className="font-bold text-school-blue-800 dark:text-white">2. Requisitos para Participação</h3>
                  <p>2.1. Para validação da participação, o(a) aluno(a) deverá:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>preencher corretamente os dados solicitados no formulário;</li>
                    <li>inserir código válido disponibilizado pela instituição;</li>
                    <li>realizar captura de imagem (selfie) no ato da inscrição.</li>
                  </ul>
                  <p className="mt-2">2.2. O não atendimento de qualquer requisito poderá implicar indeferimento da participação, sem geração de ticket.</p>
                </div>

                <div>
                  <h3 className="font-bold text-school-blue-800 dark:text-white">3. Coleta e Finalidade da Imagem</h3>
                  <p>3.1. A imagem capturada será utilizada exclusivamente para:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>verificação da autenticidade da participação;</li>
                    <li>prevenção de fraude, duplicidade ou uso indevido do sistema;</li>
                    <li>conferência do cumprimento da regra de uniforme para elegibilidade no sorteio.</li>
                  </ul>
                  <p className="mt-2">3.2. A captura da imagem constitui condição técnica essencial para participação no SorteBIT.</p>
                  <p>3.3. O envio de imagem incompatível com os critérios de validação poderá ensejar reprovação automática da participação.</p>
                </div>

                <div>
                  <h3 className="font-bold text-school-blue-800 dark:text-white">4. Regra de Elegibilidade por Uniforme</h3>
                  <p>4.1. O SorteBIT é destinado exclusivamente a alunos(as) que estejam trajando uniforme institucional no momento da participação.</p>
                  <p>4.2. A ausência de uniforme, total ou parcial, conforme critérios de validação aplicáveis, acarreta inelegibilidade e consequente recusa da participação.</p>
                </div>

                <div>
                  <h3 className="font-bold text-school-blue-800 dark:text-white">5. Validação, Registro e Limitações</h3>
                  <p>5.1. Uma vez cumpridos os requisitos e aprovada a validação, a participação será registrada e o sistema emitirá confirmação (ticket).</p>
                  <p>5.2. Participações com inconsistências de dados, irregularidades técnicas, indícios de fraude ou descumprimento deste Termo poderão ser bloqueadas, recusadas ou anuladas, a critério da administração responsável pelo sorteio.</p>
                  <p>5.3. Poderão existir limites de tentativas e janelas de participação, conforme regras operacionais vigentes no sistema.</p>
                </div>

                <div>
                  <h3 className="font-bold text-school-blue-800 dark:text-white">6. Declarações do(a) Participante</h3>
                  <p>Ao aceitar este Termo, o(a) participante declara que:</p>
                  <ul className="list-none space-y-1">
                    <li>a) prestou informações verídicas;</li>
                    <li>b) está ciente da obrigatoriedade de captura da imagem para validação;</li>
                    <li>c) está ciente da exigência de uniforme como requisito de elegibilidade;</li>
                    <li>d) concorda com o processamento necessário dos dados inseridos e da imagem, estritamente para execução e segurança do SorteBIT.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-school-blue-800 dark:text-white">7. Disposições Finais</h3>
                  <p>7.1. Este Termo poderá ser atualizado a qualquer tempo para adequação operacional, técnica ou normativa, passando a vigorar a versão publicada no sistema.</p>
                  <p>7.2. Em caso de divergência interpretativa, prevalecerá a versão mais recente disponibilizada no ambiente oficial do SorteBIT.</p>
                </div>
              </div>
            </ScrollArea>
            <div className="pt-4 border-t mt-auto flex justify-end">
              <Button onClick={() => setIsTermsOpen(false)} className="bg-school-blue-600 hover:bg-school-blue-700">
                Fechar e Voltar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default LotteryForm;
