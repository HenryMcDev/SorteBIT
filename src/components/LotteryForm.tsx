import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dice1, MapPin, AlertCircle, Crown, Camera, RefreshCw, X, AlertTriangle } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [generatedTicket, setGeneratedTicket] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [tempoRestante, setTempoRestante] = useState<string>('');
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Verifica se a resposta do n8n contém o erro específico da trava diária
    if (analysisError?.includes('já registrou a participação do sorteio hoje')) {
      
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
        }
      };

      calcularTempoAteMeiaNoite(); // Renderiza o tempo imediatamente
      const timer = setInterval(calcularTempoAteMeiaNoite, 1000); // Atualiza a cada segundo

      // Limpa o intervalo quando o componente for desmontado
      return () => clearInterval(timer);
    } else {
      setTempoRestante('');
    }
  }, [analysisError]);

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
  const { isLoading: locationLoading, isWithinRange, error: locationError, retryLocation } =
    useLocationVerification(isAdminMode);

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

    if (!name.trim() || !phone.trim() || (!isAdminMode && (!studentCode.trim() || !photo))) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let isSuccess = false;
      let ticketFromServer = '';

      if (!isAdminMode) {
        setIsAnalyzingPhoto(true);
        try {
          const webhookResponse = await fetch('https://bitn8n.infinityflowapp.com/webhook/sortebit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nome: name.trim(),
              telefone: phone.replace(/\D/g, ''),
              codigo: studentCode.trim(),
              fotoBase64: photo,
            }),
          });

          const responseData = await webhookResponse.json();

          if (responseData.sucesso === true) {
            isSuccess = true;
            ticketFromServer = responseData.ticket || 'SORTEBIT#VALIDADO';
          } else {
            setAnalysisError(responseData.erro || responseData.mensagem || "A análise detectou um problema na sua foto.");
            return;
          }
        } catch (error: any) {
          console.error("Webhook error:", error);
          setAnalysisError("Não foi possível conectar ao servidor. Verifique sua internet ou tente novamente mais tarde.");
          return;
        } finally {
          setIsAnalyzingPhoto(false);
        }
      } else {
        isSuccess = true;
        ticketFromServer = 'SORTEBIT#ADMIN';
      }

      if (isSuccess) {
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
      toast({
        title: "Erro",
        description: "Erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show location loading for non-admin users
  if (!isAdminMode && locationLoading) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 bg-white rounded-2xl">
          <div className="text-center space-y-4">
            <MapPin className="w-12 h-12 text-school-blue-600 mx-auto animate-pulse" />
            <h2 className="text-xl font-bold text-school-blue-700">Verificando localização...</h2>
            <p className="text-school-blue-600">
              Por favor, permita o acesso à sua localização para participar do sorteio.
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-school-blue-600 mx-auto"></div>
          </div>
        </Card>
      </div>
    );
  }

  // Show location error for non-admin users
  if (!isAdminMode && (locationError || isWithinRange === false)) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 bg-white rounded-2xl">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-700">Acesso Negado</h2>
            <p className="text-red-600">
              {locationError || "Você precisa estar dentro da escola para participar do sorteio."}
            </p>
            <Button
              onClick={retryLocation}
              className="bg-school-blue-600 hover:bg-school-blue-700 text-white"
            >
              Tentar Novamente
            </Button>
          </div>
        </Card>
      </div>
    );
  }

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
                  disabled={isSubmitting}
                  className="w-full h-12 md:h-16 text-base md:text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
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
  if (analysisError) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 bg-white rounded-2xl">
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-school-blue-50 rounded-full flex items-center justify-center">
              {tempoRestante ? (
                <AlertCircle className="w-12 h-12 text-school-blue-600" />
              ) : (
                <Camera className="w-12 h-12 text-school-blue-600" />
              )}
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-6 h-6 text-school-yellow-500 fill-current" />
              <h2 className="text-xl md:text-2xl font-bold text-school-blue-700">
                {tempoRestante ? "Limite Diário Atingido" : "Sua foto precisa de um ajuste"}
              </h2>
            </div>
            
            <p className="text-gray-600">
              {tempoRestante 
                ? "Você já participou do sorteio hoje." 
                : "A análise detectou um problema. Vamos resolver isso para você!"}
            </p>
            
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 max-w-sm mx-auto">
              <p className="text-sm font-medium text-red-600">{analysisError}</p>
            </div>
            
            {/* Renderiza o timer apenas se o erro for o de participação duplicada */}
            {tempoRestante && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                <p className="text-red-800 text-sm mb-2 uppercase tracking-wide font-medium">
                  Nova tentativa liberada em:
                </p>
                <p className="text-4xl font-mono font-bold text-red-600 tracking-widest">
                  {tempoRestante}
                </p>
              </div>
            )}
            
            {!tempoRestante && (
              <ul className="text-left text-sm md:text-base text-gray-500 space-y-2 max-w-sm mx-auto list-disc pl-5">
                <li>Certifique-se de que o logo da BIT na sua roupa está visível</li>
                <li>Mostre seu rosto claramente</li>
                <li>Evite fundos com reflexos de telas</li>
              </ul>
            )}
            
            <div className="border-2 border-yellow-200 rounded-2xl p-4 md:p-6 my-6 max-w-sm mx-auto">
              <Button
                onClick={() => {
                  setAnalysisError(null);
                  if (!tempoRestante) {
                    setPhoto(null);
                    setZoom(1);
                    setIsCameraOpen(true);
                  }
                }}
                className="w-full h-14 md:h-16 text-base md:text-lg font-bold bg-[#FFF9D6] hover:bg-[#FFF4B3] text-school-blue-800 rounded-xl shadow-sm transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                {tempoRestante ? (
                  <>
                    <X className="w-5 h-5 md:w-6 md:h-6" />
                    Fechar
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 md:w-6 md:h-6" />
                    Tentar Novamente
                  </>
                )}
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
              onClick={() => setGeneratedTicket(null)}
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
            <Dice1 className="w-12 h-12 text-school-blue-600 mx-auto" />
            <h2 className="text-xl md:text-2xl font-bold text-school-blue-700">
              Participe do Sorteio!
            </h2>
            <p className="text-school-blue-600">
              Preencha os dados e insira o código fornecido pelo seu professor
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
              disabled={isSubmitting || isAnalyzingPhoto || !photo}
              className="w-full h-12 md:h-16 text-base md:text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting || isAnalyzingPhoto ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-school-blue-800 mr-2"></div>
                  {isAnalyzingPhoto ? 'Analisando foto, aguarde...' : 'Processando...'}
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
