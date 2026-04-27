import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dice1, MapPin, AlertCircle, Crown, Camera, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();

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

  const validateStudentCode = async (name: string, code: string) => {
    try {
      // Normalize name for comparison (remove extra spaces, convert to lowercase)
      const normalizedInputName = name.trim().toLowerCase();
      
      // Check if code exists and is not used
      const { data: codeData, error } = await supabase
        .from('student_codes')
        .select('*')
        .eq('code', code.trim())
        .eq('date', new Date().toISOString().split('T')[0])
        .eq('is_used', false)
        .maybeSingle();

      if (error) {
        console.error('Error checking code:', error);
        return { valid: false, message: 'Erro ao validar código.' };
      }

      if (!codeData) {
        return { valid: false, message: 'Código inválido ou já utilizado.' };
      }

      // Normalize stored name for comparison
      const normalizedStoredName = codeData.student_name.trim().toLowerCase();
      
      // Check if names match (case insensitive)
      if (normalizedInputName !== normalizedStoredName) {
        return { valid: false, message: 'Nome não confere com o código fornecido.' };
      }

      return { valid: true, message: 'Código válido!', codeData };
    } catch (error) {
      console.error('Error validating code:', error);
      return { valid: false, message: 'Erro inesperado ao validar código.' };
    }
  };

  const checkDailyParticipation = async (name: string, phone: string) => {
    try {
      const normalizedName = name.trim().toLowerCase();
      const cleanPhone = phone.replace(/\D/g, '');
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('lottery_participations')
        .select('id')
        .eq('participation_date', today)
        .or(`lower(name).eq.${normalizedName},phone.eq.${cleanPhone}`)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking participation:', error);
        return { canParticipate: false, message: 'Erro ao verificar participação.' };
      }

      if (data) {
        return { canParticipate: false, message: 'Você já participou do sorteio hoje.' };
      }

      return { canParticipate: true, message: 'Pode participar!' };
    } catch (error) {
      console.error('Error checking daily participation:', error);
      return { canParticipate: false, message: 'Erro inesperado ao verificar participação.' };
    }
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
      // Check daily participation limit
      const participationCheck = await checkDailyParticipation(name, phone);
      if (!participationCheck.canParticipate) {
        toast({
          title: "Erro",
          description: participationCheck.message,
          variant: "destructive"
        });
        return;
      }

      let teacherCode = null;

      if (!isAdminMode) {
        const codeValidation = await validateStudentCode(name, studentCode);
        if (!codeValidation.valid) {
          toast({
            title: "Erro",
            description: codeValidation.message,
            variant: "destructive"
          });
          return;
        }
        teacherCode = codeValidation.codeData?.teacher_name || null;

        setIsValidatingPhoto(true);
        try {
          const webhookResponse = await fetch('https://automacao-n8n.dczbc9.easypanel.host/webhook/sortebit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: name.trim(),
              phone: phone.replace(/\D/g, ''),
              photoBase64: photo,
            }),
          });

          if (!webhookResponse.ok) {
            toast({
              title: "Erro",
              description: "O uniforme não foi validado.",
              variant: "destructive"
            });
            setIsValidatingPhoto(false);
            setIsSubmitting(false);
            return;
          }
        } catch (webhookError) {
          console.error("Webhook error:", webhookError);
          toast({
            title: "Erro",
            description: "Falha ao validar a foto. Tente novamente.",
            variant: "destructive"
          });
          setIsValidatingPhoto(false);
          setIsSubmitting(false);
          return;
        }
        setIsValidatingPhoto(false);
      }

      const luckyNumber = Number(generateLuckyNumber());
      const cleanPhone = phone.replace(/\D/g, '');

      // Insert participation
      const { error: insertError } = await supabase
        .from('lottery_participations')
        .insert({
          name: name.trim(),
          phone: cleanPhone,
          lucky_number: luckyNumber,
          teacher_code: teacherCode ?? ''
        } as any);

      if (insertError) {
        console.error('Error inserting participation:', insertError);
        toast({
          title: "Erro",
          description: "Erro ao registrar participação. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      // Mark student code as used (only for non-admin mode) via secure RPC
      if (!isAdminMode) {
        const { error: rpcError } = await supabase.rpc('mark_student_code_used', {
          _code: studentCode.trim(),
          _date: new Date().toISOString().split('T')[0],
        });

        if (rpcError) {
          console.error('Error updating code status:', rpcError);
        }
      }

      // Clear form
      setName('');
      setPhone('');
      setStudentCode('');
      setPhoto(null);

      toast({
        title: "🎉 Participação registrada!",
        description: `Seu número da sorte é: ${luckyNumber}`,
        variant: "default"
      });

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
              className={`flex-1 min-w-32 ${
                activeTab === 'lottery' 
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
              className={`flex-1 min-w-32 ${
                activeTab === 'codes' 
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
                  onClick={() => setIsCameraOpen(true)}
                  className="w-full h-16 md:h-20 bg-school-blue-600 hover:bg-school-blue-700 text-white rounded-xl flex items-center justify-center"
                >
                  <Camera className="w-8 h-8" />
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="overflow-hidden rounded-xl border-2 border-school-blue-500 w-full max-w-sm aspect-[3/4] relative">
                    <img src={photo} alt="Selfie capturada" className="w-full h-full object-cover" />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={retakePhoto}
                    className="w-full border-school-blue-600 text-school-blue-600 bg-white hover:bg-school-blue-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tirar Novamente
                  </Button>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isValidatingPhoto || !photo}
              className="w-full h-12 md:h-16 text-base md:text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting || isValidatingPhoto ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-school-blue-800 mr-2"></div>
                  {isValidatingPhoto ? 'Validando uniforme...' : 'Processando...'}
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
          <div className="relative w-full h-full max-w-md mx-auto flex flex-col bg-black">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "user", aspectRatio: 9/16 }}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay controls */}
            <div className="absolute top-4 right-4">
              <Button
                type="button"
                onClick={() => setIsCameraOpen(false)}
                className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white border-2 border-white flex items-center justify-center p-0"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            
            <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
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
