import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Sparkles, Phone, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocationVerification } from '@/hooks/useLocationVerification';
import LocationVerification from './LocationVerification';

interface LotteryFormProps {
  isAdminMode?: boolean;
}

const LotteryForm = ({ isAdminMode = false }: LotteryFormProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [luckyNumber, setLuckyNumber] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasParticipatedToday, setHasParticipatedToday] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Hook de verificação de localização - só ativa se não for modo admin
  const {
    isLoading: isLocationLoading,
    isWithinRange,
    error: locationError,
    hasPermission,
    retryLocation
  } = useLocationVerification();

  // Se for modo admin, sempre considerar como dentro do raio permitido
  const shouldCheckLocation = !isAdminMode;
  const effectiveIsWithinRange = isAdminMode ? true : isWithinRange;
  const effectiveIsLocationLoading = isAdminMode ? false : isLocationLoading;

  // Verificar participação no localStorage como backup
  useEffect(() => {
    const checkLocalParticipation = () => {
      const today = new Date().toDateString();
      const lastParticipation = localStorage.getItem('lastLotteryParticipation');
      
      if (lastParticipation === today) {
        setHasParticipatedToday(true);
      }
    };

    checkLocalParticipation();
  }, []);

  // Verificar se já participou hoje no Supabase
  const checkParticipationInDatabase = async (name: string, phone: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const { data, error } = await supabase
        .from('lottery_participations')
        .select('id')
        .eq('name', name.trim())
        .eq('phone', phone.trim())
        .eq('participation_date', today)
        .limit(1);

      if (error) {
        console.error('Erro ao verificar participação:', error);
        toast({
          title: "Erro",
          description: "Erro ao verificar participação. Tente novamente.",
          variant: "destructive"
        });
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Erro ao conectar com o banco:', error);
      toast({
        title: "Erro",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Salvar participação no Supabase
  const saveParticipationToDatabase = async (name: string, phone: string, luckyNumber: string) => {
    try {
      const { error } = await supabase
        .from('lottery_participations')
        .insert({
          name: name.trim(),
          phone: phone.trim(),
          lucky_number: luckyNumber,
          participation_date: new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error('Erro ao salvar participação:', error);
        toast({
          title: "Erro",
          description: "Erro ao salvar participação. Tente novamente.",
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao salvar no banco:', error);
      toast({
        title: "Erro",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  };

  const generateLuckyNumber = async () => {
    if (!name.trim() || !phone.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos!",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setIsGenerating(true);

    try {
      // Verificar se já participou hoje
      const alreadyParticipated = await checkParticipationInDatabase(name, phone);
      
      if (alreadyParticipated) {
        setHasParticipatedToday(true);
        setIsGenerating(false);
        setIsLoading(false);
        toast({
          title: "Participação já registrada",
          description: "Você já participou hoje com esses dados. Volte amanhã para tentar novamente.",
          variant: "default"
        });
        return;
      }

      // Gerar número da sorte
      const number = Math.floor(Math.random() * 9000 + 1000).toString(); // Entre 1000 e 9999
      
      // Salvar no banco de dados
      const saved = await saveParticipationToDatabase(name, phone, number);
      
      if (saved) {
        setLuckyNumber(number);
        
        // Marcar participação no localStorage como backup
        const today = new Date().toDateString();
        localStorage.setItem('lastLotteryParticipation', today);
        setHasParticipatedToday(true);

        toast({
          title: "Sucesso!",
          description: `Seu número da sorte é ${number}. Boa sorte!`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Erro no processo:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  // Se ainda está verificando a localização e não é modo admin, exibir o estado de loading
  if (shouldCheckLocation && (effectiveIsLocationLoading || !effectiveIsWithinRange)) {
    return (
      <LocationVerification
        isLoading={effectiveIsLocationLoading}
        isWithinRange={effectiveIsWithinRange}
        error={locationError}
        hasPermission={hasPermission}
        onRetry={retryLocation}
      />
    );
  }

  if (hasParticipatedToday && !luckyNumber) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <Card className="p-6 md:p-8 shadow-xl border-0 bg-white rounded-2xl">
          <div className="text-center space-y-4">
            <Calendar className="w-12 h-12 text-school-blue-600 mx-auto" />
            <h3 className="text-xl md:text-2xl font-bold text-school-blue-700">
              👉 Você já participou hoje!
            </h3>
            <p className="text-base md:text-lg text-school-blue-600">
              Volte amanhã para tentar novamente.
            </p>
            <div className="mt-6">
              <img 
                src="https://i.imgur.com/RONu0Cc.png" 
                alt="Logo da Escola" 
                className="mx-auto h-16 md:h-20 w-auto object-contain"
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4">
      <Card className="p-6 md:p-8 shadow-xl border-0 bg-white rounded-2xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-school-blue-700 font-semibold flex items-center text-sm md:text-base">
              <User className="w-4 h-4 mr-2" />
              Nome completo
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Digite seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 focus:border-school-blue-500 rounded-xl"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-school-blue-700 font-semibold flex items-center text-sm md:text-base">
              <Phone className="w-4 h-4 mr-2" />
              Telefone
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 focus:border-school-blue-500 rounded-xl"
              disabled={isLoading}
            />
          </div>

          <Button
            onClick={generateLuckyNumber}
            disabled={isGenerating || isLoading}
            className="w-full h-12 md:h-16 text-base md:text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isGenerating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-school-blue-800 mr-2"></div>
                Verificando e gerando...
              </div>
            ) : (
              <div className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar meu número da sorte
              </div>
            )}
          </Button>

          {luckyNumber && (
            <div className="text-center p-4 md:p-6 bg-gradient-to-br from-school-blue-50 to-school-yellow-50 rounded-xl border-2 border-school-yellow-200 animate-bounce-in">
              <Sparkles className="w-8 h-8 text-school-yellow-500 mx-auto mb-2" />
              <p className="text-school-blue-700 font-semibold mb-2 text-sm md:text-base">Parabéns!</p>
              <p className="text-xl md:text-2xl font-bold text-school-blue-800">
                Seu número da sorte é: <span className="text-school-yellow-600">#{luckyNumber}</span>
              </p>
              <p className="text-xs md:text-sm text-school-blue-600 mt-2">
                Guarde bem este número! Boa sorte!
              </p>
            </div>
          )}

          {/* Logo da escola */}
          <div className="text-center pt-4">
            <img 
              src="https://i.imgur.com/RONu0Cc.png" 
              alt="Logo da Escola" 
              className="mx-auto h-16 md:h-20 w-auto object-contain"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LotteryForm;
