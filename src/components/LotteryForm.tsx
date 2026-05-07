import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dice1, MapPin, AlertCircle, Crown, Camera, RefreshCw, X, AlertTriangle, QrCode, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocationVerification } from '@/hooks/useLocationVerification';
import ClassCodeManager from './ClassCodeManager';


interface LotteryFormProps {
  isAdminMode?: boolean;
}

const LotteryForm = ({ isAdminMode = false }: LotteryFormProps) => {
  const [activeTab, setActiveTab] = useState<'lottery' | 'codes'>('lottery');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [submissionState, setSubmissionState] = useState<'idle' | 'enviando' | 'processando' | 'erro' | 'sucesso'>('idle');
  const [photo, setPhoto] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [photoValidationError, setPhotoValidationError] = useState<string | null>(null);
  const [generatedTicket, setGeneratedTicket] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [tempoRestante, setTempoRestante] = useState<string>('');
  const [alreadyParticipated, setAlreadyParticipated] = useState(false);
  const [useQRContingency, setUseQRContingency] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Carrega o estado de persistência do localStorage
    const today = new Date().toDateString();
    if (localStorage.getItem('bit_participacao_concluida') === today) {
      setAlreadyParticipated(true);
    }
  }, []);

  useEffect(() => {
    const checkErrorForLock = (error: string | null) => {
      if (!error) return false;
      const lowerError = error.toLowerCase();
      return lowerError.includes('participação') || lowerError.includes('registrada');
    };

    const isLockedError = checkErrorForLock(analysisError);

    // Ativa o timer se o localStorage flaggar a presença ou se o webhook devolver o erro
    if (alreadyParticipated || isLockedError) {
      if (!alreadyParticipated) {
        setAlreadyParticipated(true);
        localStorage.setItem('bit_participacao_concluida', new Date().toDateString());
        // Remove do analysisError para não renderizar o modal de erro de foto
        if (isLockedError) {
          setAnalysisError(null);
          setSubmissionState('idle');
        }
      }
      
      const calcularTempoAteMeiaNoite = () => {
        const agora = new Date();
        const meiaNoite = new Date();
        // Define o alvo para 23:59:59 do dia atual
        meiaNoite.setHours(23, 59, 59, 999);

        const diferenca = meiaNoite.getTime() - agora.getTime();

        if (diferenca > 0) {
          const horas = Math.floor((diferenca / (1000 * 60 * 60)) % 24);
          const minutos = Math.floor((diferenca / 1000 / 60) % 60);
          const segundos = Math.floor((diferenca / 1000) % 60);

          // Formata com zeros à esquerda (ex: 09:05:02)
          setTempoRestante(
            `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`
          );
        } else {
          setTempoRestante('00:00:00');
          localStorage.removeItem('bit_participacao_concluida');
          setAlreadyParticipated(false);
        }
      };

      calcularTempoAteMeiaNoite(); // Renderiza o tempo imediatamente
      const timer = setInterval(calcularTempoAteMeiaNoite, 1000); // Atualiza a cada segundo

      // Limpa o intervalo quando o componente for desmontado
      return () => clearInterval(timer);
    } else {
      setTempoRestante('');
    }
  }, [analysisError, alreadyParticipated]);

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
  const { isWithinRange, locationProgress, showContingency, latitude, longitude, distance } = useLocationVerification(isAdminMode);

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

    if (!name.trim() || !phone.trim() || (!isAdminMode && !studentCode.trim())) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    // Verificação de segurança da memória para dispositivos móveis
    if (!isAdminMode) {
      if (!photo || typeof photo !== 'string' || photo.length < 50) {
        setPhotoValidationError("Sua foto não foi carregada corretamente. O navegador pode ter descartado o arquivo por falta de memória. Por favor, capture a foto novamente.");
        setPhoto(null);
        return;
      }
    }

    setSubmissionState('enviando');
    setPhotoValidationError(null); // Limpa alertas anteriores

    try {
      let isSuccess = false;
      let ticketFromServer = '';

      if (!isAdminMode) {
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
            
            const lowerError = erroMensagem.toLowerCase();
            const isLockError = lowerError.includes('participação') || lowerError.includes('registrada');
            
            // Mantém a compatibilidade com a trava diária do sistema
            if (isLockError) {
              setAnalysisError(erroMensagem);
              localStorage.setItem('bit_participacao_concluida', new Date().toDateString());
            } else {
              setPhotoValidationError(erroMensagem);
            }
            setSubmissionState('erro');
            return;
          } else {
            const erroGenerico = typeof responseData.erro === 'string' 
              ? responseData.erro 
              : (responseData.mensagem || "A análise detectou um problema na sua foto.");
            
            const lowerErrorGen = String(erroGenerico).toLowerCase();
            const isLockErrorGen = lowerErrorGen.includes('participação') || lowerErrorGen.includes('registrada');
            
            if (isLockErrorGen) {
              setAnalysisError(String(erroGenerico));
              localStorage.setItem('bit_participacao_concluida', new Date().toDateString());
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
      } else {
        isSuccess = true;
        ticketFromServer = 'SORTEBIT#ADMIN';
      }

      if (isSuccess) {
        setSubmissionState('sucesso');
        const formattedTicket = ticketFromServer;
        setGeneratedTicket(formattedTicket);
        
        toast({
          title: "🎉 Participação registrada!",
          description: `Seu ticket é: ${formattedTicket}`,
          variant: "default"
        });

        // Clear form
        setName('');
        setPhone('');
        setStudentCode('');
        setPhoto(null);
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


  // Admin mode interface
  if (isAdminMode) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 bg-white rounded-lg p-2 shadow-lg">
            <Button
              onClick={() => setActiveTab('lottery')}
              variant={activeTab === 'lottery' ? 'default' : 'outline'}
              className={`flex-1 min-w-32 ${activeTab === 'lottery'
                ? 'bg-school-blue-600 text-white'
                : 'border-school-blue-600 text-school-blue-600 hover:bg-school-blue-50'
                }`}
            >
              <Dice1 className="w-4 h-4 mr-2" />
              Sorteio
            </Button>
            <Button
              onClick={() => setActiveTab('codes')}
              variant={activeTab === 'codes' ? 'default' : 'outline'}
              className={`flex-1 min-w-32 ${activeTab === 'codes'
                ? 'bg-school-blue-600 text-white'
                : 'border-school-blue-600 text-school-blue-600 hover:bg-school-blue-50'
                }`}
            >
              <Crown className="w-4 h-4 mr-2" />
              Códigos
            </Button>
          </div>
        </div>

        {activeTab === 'codes' && <ClassCodeManager />}
        {activeTab === 'lottery' && (
          <Card className="p-6 md:p-8 shadow-xl border-0 bg-white rounded-2xl">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Crown className="w-8 h-8 text-school-yellow-500" />
                  <Dice1 className="w-12 h-12 text-school-blue-600" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-school-blue-700">
                  Sorteio - Modo Administrativo
                </h2>
                <p className="text-school-blue-600">
                  Registre participações sem validação de localização
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-school-blue-700 font-semibold">
                    Nome completo *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Digite seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 focus:border-school-blue-500 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-school-blue-700 font-semibold">
                    Telefone *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 focus:border-school-blue-500 rounded-xl"
                    maxLength={15}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submissionState === 'enviando' || submissionState === 'processando'}
                  className="w-full h-12 md:h-16 text-base md:text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {(submissionState === 'enviando' || submissionState === 'processando') ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-school-blue-800 mr-2"></div>
                      Processando...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Dice1 className="w-5 h-5 mr-2" />
                      Participar do Sorteio
                    </div>
                  )}
                </Button>
              </form>

              <div className="text-center pt-4">
                <img
                  src="https://i.imgur.com/RONu0Cc.png"
                  alt="Logo da Escola"
                  className="mx-auto h-16 md:h-20 w-auto object-contain"
                />
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Show error UI if photo validation fails
  if (analysisError && !(analysisError.toLowerCase().includes('participação') || analysisError.toLowerCase().includes('registrada'))) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 bg-white rounded-2xl">
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-school-blue-50 rounded-full flex items-center justify-center">
              <Camera className="w-12 h-12 text-school-blue-600" />
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-6 h-6 text-school-yellow-500 fill-current" />
              <h2 className="text-xl md:text-2xl font-bold text-school-blue-700">
                Sua foto precisa de um ajuste
              </h2>
            </div>
            
            <p className="text-gray-600">
              A análise detectou um problema. Vamos resolver isso para você!
            </p>
            
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 max-w-sm mx-auto">
              <p className="text-sm font-medium text-red-600">{analysisError}</p>
            </div>
            
            <ul className="text-left text-sm md:text-base text-gray-500 space-y-2 max-w-sm mx-auto list-disc pl-5">
              <li>Certifique-se de que o logo da BIT na sua roupa está visível</li>
              <li>Mostre seu rosto claramente</li>
              <li>Evite fundos com reflexos de telas</li>
            </ul>
            
            <div className="border-2 border-yellow-200 rounded-2xl p-4 md:p-6 my-6 max-w-sm mx-auto">
              <Button
                onClick={() => {
                  setAnalysisError(null);
                  setSubmissionState('idle');
                  setPhoto(null);
                  setZoom(1);
                  setIsCameraOpen(true);
                }}
                className="w-full h-14 md:h-16 text-base md:text-lg font-bold bg-[#FFF9D6] hover:bg-[#FFF4B3] text-school-blue-800 rounded-xl shadow-sm transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
                Tentar Novamente
              </Button>
            </div>
            
            <div className="text-center pt-4 border-t border-gray-100 mt-6">
              <img
                src="https://i.imgur.com/RONu0Cc.png"
                alt="Logo da Escola"
                className="mx-auto h-12 md:h-16 w-auto object-contain"
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
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 bg-white rounded-2xl">
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <Crown className="w-10 h-10 text-green-600" />
            </div>
            
            <div>
              <div className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-bold uppercase mb-4 inline-block">
                Participação Confirmada!
              </div>
              <p className="text-gray-600 text-sm mb-2">Seu número da sorte é:</p>
              
              <div className="p-6 bg-white border-2 border-dashed border-green-500 rounded-2xl shadow-lg my-4">
                <h2 className="text-4xl md:text-5xl font-mono font-black text-green-600 tracking-tighter break-words">
                  {generatedTicket}
                </h2>
              </div>
              
              <p className="mt-4 text-xs md:text-sm text-gray-500 italic">
                Boa sorte! O sorteio ocorre conforme o regulamento oficial da BIT.
                <br />
                Tire um print desta tela para guardar o seu código.
              </p>
            </div>
            
            <Button
              onClick={() => {
                setGeneratedTicket(null);
                setSubmissionState('idle');
              }}
              className="w-full h-12 md:h-16 text-base md:text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 mt-4"
            >
              Fazer novo sorteio
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Standard user interface
  return (
    <div className="max-w-lg mx-auto px-4">
      <Card className="p-6 md:p-8 shadow-xl border-0 bg-white rounded-2xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-school-blue-700">
              Participe do Sorteio!
            </h2>
            <p className="text-school-blue-600">
              Preencha os dados e insira o código fornecido pelo seu professor
            </p>
          </div>

          {alreadyParticipated ? (
            <div className="bg-school-blue-50 border border-school-blue-100 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 mt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm text-school-blue-600 mb-2">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-school-blue-800">Participação Concluída</h3>
                <p className="text-school-blue-600 font-medium">
                  Você já registrou sua participação no sorteio de hoje.
                </p>
                <div className="pt-6 border-t border-school-blue-200/50 w-full mt-2">
                  <p className="text-xs font-bold text-school-blue-700 uppercase tracking-widest mb-3">
                    Sua próxima chance de ganhar renova em
                  </p>
                  <div className="text-4xl font-mono font-black text-school-blue-800 tracking-wider">
                    {tempoRestante}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {photoValidationError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-800">Atenção</h4>
                    <p className="text-red-600 text-sm mt-1">{photoValidationError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoValidationError(null);
                    setSubmissionState('idle');
                    setPhoto(null);
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {!isAdminMode && (
              <div className="mb-6">
                {!isWithinRange && !useQRContingency && (
                  <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-school-blue-400 transition-all duration-1000 ease-in-out"
                      style={{ width: `${locationProgress}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-school-blue-600/70 mb-2 font-mono bg-school-blue-50/50 py-1.5 px-3 rounded-md w-fit mx-auto">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="font-semibold">Localização:</span>
                  {latitude !== null && longitude !== null ? (
                    <span>{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                  ) : (
                    <span>Buscando...</span>
                  )}
                  {distance !== null && (
                    <span className="ml-1 border-l border-school-blue-200/50 pl-2">
                      {distance.toFixed(1)}m
                    </span>
                  )}
                </div>

                {isWithinRange && (
                  <div className="text-center animate-in fade-in zoom-in duration-300 mb-2">
                    <span className="text-sm font-bold text-green-600 uppercase tracking-widest flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Você está na BIT
                    </span>
                  </div>
                )}

                {!isWithinRange && showContingency && !useQRContingency && (
                  <div className="text-center mt-4 animate-in fade-in slide-in-from-bottom-2">
                    <Button 
                      type="button" 
                      onClick={() => setUseQRContingency(true)} 
                      variant="outline" 
                      className="w-full text-school-blue-700 border-school-blue-300 hover:bg-school-blue-50"
                    >
                      <QrCode className="w-5 h-5 mr-2" />
                      Utilizar Contingência por QR Code
                    </Button>
                  </div>
                )}

                {useQRContingency && (
                  <div className="flex flex-col items-center justify-center p-3 bg-school-blue-50 border border-school-blue-200 rounded-lg mt-2">
                    <QrCode className="w-6 h-6 text-school-blue-600 mb-1" />
                    <span className="text-sm font-bold text-school-blue-700">
                      Modo Contingência Ativo
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-school-blue-700 font-semibold">
                Nome completo *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Digite seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 focus:border-school-blue-500 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-school-blue-700 font-semibold">
                Telefone *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={handlePhoneChange}
                className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 focus:border-school-blue-500 rounded-xl"
                maxLength={15}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentCode" className="text-school-blue-700 font-semibold">
                Digite o código do dia *
              </Label>
              <Input
                id="studentCode"
                type="text"
                placeholder="Digite o código"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 focus:border-school-blue-500 rounded-xl font-mono"
                required
              />
            </div>

            <div className="space-y-3">
              <Label className="text-school-blue-700 font-semibold">
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
                      className="absolute top-3 right-3 w-10 h-10 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-[0_0_10px_rgba(0,0,0,0.5)] border-2 border-white flex items-center justify-center opacity-90 hover:opacity-100 transition-all hover:scale-110"
                      title="Excluir foto"
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={submissionState === 'enviando' || submissionState === 'processando' || !photo || photoValidationError !== null || (!isAdminMode && !isWithinRange && !useQRContingency)}
              className="w-full h-auto py-5 text-base md:text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(submissionState === 'enviando' || submissionState === 'processando') ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-school-blue-800 mr-2"></div>
                  {submissionState === 'processando' ? 'Analisando foto, aguarde...' : 'Processando...'}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  {(!isAdminMode && !isWithinRange && !useQRContingency) ? 'Aguardando confirmação de presença...' : 'Participar do Sorteio'}
                </div>
              )}
            </Button>
          </form>
          )}

          <div className="text-center pt-4">
            <img
              src="https://i.imgur.com/RONu0Cc.png"
              alt="Logo da Escola"
              className="mx-auto h-16 md:h-20 w-auto object-contain"
            />
          </div>
        </div>
      </Card>

      {/* Camera Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <div className="relative w-full h-full max-w-md mx-auto flex flex-col bg-black overflow-hidden justify-center items-center">
            <Webcam
              audio={false}
              ref={webcamRef}
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
              style={{ transform: `scale(${zoom})` }}
            />

            {/* Overlay controls */}
            <div className="absolute top-4 right-4 z-10">
              <Button
                type="button"
                onClick={() => setIsCameraOpen(false)}
                className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white border-2 border-white flex items-center justify-center p-0"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Zoom Control */}
            <div className="absolute bottom-32 left-8 right-8 flex items-center gap-4 bg-black/50 p-4 rounded-2xl backdrop-blur-sm z-10">
              <span className="text-white font-bold text-xl">-</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-school-yellow-500"
              />
              <span className="text-white font-bold text-xl">+</span>
            </div>

            <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4 z-10">
              <Button
                type="button"
                onClick={() => {
                  capturePhoto();
                  setIsCameraOpen(false);
                }}
                className="rounded-full w-20 h-20 flex items-center justify-center bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 shadow-[0_0_15px_rgba(0,0,0,0.5)] border-4 border-white transition-transform hover:scale-105"
              >
                <Camera className="w-10 h-10" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryForm;
