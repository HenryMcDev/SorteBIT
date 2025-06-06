
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Sparkles, Phone, User, Calendar, GraduationCap, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocationVerification } from '@/hooks/useLocationVerification';
import LocationVerification from './LocationVerification';
import ClassCodeManager from './ClassCodeManager';

interface LotteryFormProps {
  isAdminMode?: boolean;
}

const CLASS_OPTIONS = [
  { value: 'TM11', label: 'TM11 - Técnico em Meio Ambiente' },
  { value: 'TM12', label: 'TM12 - Técnico em Meio Ambiente' },
  { value: 'TM13', label: 'TM13 - Técnico em Meio Ambiente' },
  { value: 'TI25', label: 'TI25 - Técnico em Informática' },
  { value: 'TI26', label: 'TI26 - Técnico em Informática' },
  { value: 'TI27', label: 'TI27 - Técnico em Informática' },
  { value: 'TI28', label: 'TI28 - Técnico em Informática' },
  { value: 'TL16', label: 'TL16 - Técnico em Logística' },
  { value: 'TL17', label: 'TL17 - Técnico em Logística' },
  { value: 'TL18', label: 'TL18 - Técnico em Logística' },
  { value: 'TL19', label: 'TL19 - Técnico em Logística' },
  { value: 'TL20', label: 'TL20 - Técnico em Logística' },
  { value: 'TL21', label: 'TL21 - Técnico em Logística' },
  { value: 'TS', label: 'TS - Técnico em Segurança' }
];

const LotteryForm = ({ isAdminMode = false }: LotteryFormProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [studentCode, setStudentCode] = useState('');
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
  } = useLocationVerification(isAdminMode);

  // Se for modo admin, sempre considerar como dentro do raio permitido
  const shouldCheckLocation = !isAdminMode;
  const effectiveIsWithinRange = isAdminMode ? true : isWithinRange;
  const effectiveIsLocationLoading = isAdminMode ? false : isLocationLoading;

  // Verificar participação no localStorage como backup - apenas se não for modo admin
  useEffect(() => {
    if (isAdminMode) {
      setHasParticipatedToday(false);
      return;
    }

    const checkLocalParticipation = () => {
      const today = new Date().toDateString();
      const lastParticipation = localStorage.getItem('lastLotteryParticipation');
      
      if (lastParticipation === today) {
        setHasParticipatedToday(true);
      }
    };

    checkLocalParticipation();
  }, [isAdminMode]);

  // Verificar se já participou hoje no Supabase - pular se for modo admin
  const checkParticipationInDatabase = async (name: string, phone: string) => {
    // Se for modo admin, sempre permitir participação
    if (isAdminMode) {
      return false;
    }

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Verificar participação por nome (case-insensitive) OU telefone
      const { data, error } = await supabase
        .from('lottery_participations')
        .select('id, name')
        .eq('participation_date', today)
        .or(`phone.eq.${phone.trim()},name.ilike.${name.trim()}`);

      if (error) {
        console.error('Erro ao verificar participação:', error);
        toast({
          title: "Erro",
          description: "Erro ao verificar participação. Tente novamente.",
          variant: "destructive"
        });
        return false;
      }

      // Verificar se existe participação com mesmo nome (case-insensitive) ou mesmo telefone
      if (data && data.length > 0) {
        const hasNameMatch = data.some(record => 
          record.name.toLowerCase() === name.trim().toLowerCase()
        );
        const hasPhoneMatch = data.some(record => record.name !== name.trim());
        
        if (hasNameMatch) {
          toast({
            title: "Participação já registrada",
            description: "Você já participou hoje com esse nome.",
            variant: "default"
          });
        } else if (hasPhoneMatch) {
          toast({
            title: "Participação já registrada", 
            description: "Você já participou hoje com esses dados. Volte amanhã para tentar novamente.",
            variant: "default"
          });
        }
        return true;
      }

      return false;
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

  // Verificar e validar código do aluno
  const validateStudentCode = async (name: string, className: string, code: string) => {
    if (isAdminMode) {
      return true; // No modo admin, não validar código
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('student_codes')
        .select('id, student_name, is_used')
        .eq('code', code.trim())
        .eq('class_name', className)
        .eq('date', today)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar código:', error);
        toast({
          title: "Erro",
          description: "Erro ao verificar código do aluno. Tente novamente.",
          variant: "destructive"
        });
        return false;
      }

      if (!data) {
        toast({
          title: "Código inválido",
          description: "O código informado não é válido para esta turma hoje.",
          variant: "destructive"
        });
        return false;
      }

      // Verificar se o nome do aluno confere (case-insensitive)
      if (data.student_name.toLowerCase() !== name.trim().toLowerCase()) {
        toast({
          title: "Nome não confere",
          description: "O código não foi gerado para este aluno.",
          variant: "destructive"
        });
        return false;
      }

      if (data.is_used) {
        toast({
          title: "Código já utilizado",
          description: "Este código já foi usado hoje.",
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao validar código:', error);
      toast({
        title: "Erro",
        description: "Erro ao validar código. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Marcar código como usado
  const markCodeAsUsed = async (code: string) => {
    if (isAdminMode) return true; // No modo admin, não marcar como usado

    try {
      const { error } = await supabase
        .from('student_codes')
        .update({ 
          is_used: true, 
          used_at: new Date().toISOString() 
        })
        .eq('code', code.trim());

      if (error) {
        console.error('Erro ao marcar código como usado:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar código como usado:', error);
      return false;
    }
  };

  // Salvar participação no Supabase
  const saveParticipationToDatabase = async (name: string, phone: string, className: string, studentCode: string, luckyNumber: string) => {
    try {
      const { error } = await supabase
        .from('lottery_participations')
        .insert({
          name: name.trim(),
          phone: phone.trim(),
          class_name: className,
          teacher_code: studentCode.trim(), // Using the same field for now
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
    if (!name.trim() || !phone.trim() || !selectedClass || !studentCode.trim()) {
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
      // Verificar se já participou hoje - pular se for modo admin
      const alreadyParticipated = await checkParticipationInDatabase(name, phone);
      
      if (alreadyParticipated && !isAdminMode) {
        setHasParticipatedToday(true);
        setIsGenerating(false);
        setIsLoading(false);
        return;
      }

      // Validar código do aluno - pular se for modo admin
      const isCodeValid = await validateStudentCode(name, selectedClass, studentCode);
      
      if (!isCodeValid && !isAdminMode) {
        setIsGenerating(false);
        setIsLoading(false);
        return;
      }

      // Gerar número da sorte
      const number = Math.floor(Math.random() * 9000 + 1000).toString(); // Entre 1000 e 9999
      
      // Salvar no banco de dados - sempre salvar, mesmo no modo admin
      const saved = await saveParticipationToDatabase(name, phone, selectedClass, studentCode, number);
      
      if (saved) {
        // Marcar código como usado - apenas se não for modo admin
        if (!isAdminMode) {
          await markCodeAsUsed(studentCode);
        }

        setLuckyNumber(number);
        
        // Marcar participação no localStorage como backup - apenas se não for modo admin
        if (!isAdminMode) {
          const today = new Date().toDateString();
          localStorage.setItem('lastLotteryParticipation', today);
          setHasParticipatedToday(true);
        }

        const successMessage = isAdminMode 
          ? `Teste administrativo: Número gerado ${number}`
          : `Seu número da sorte é ${number}. Boa sorte!`;

        toast({
          title: "Sucesso!",
          description: successMessage,
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

  // No modo admin, nunca mostrar a tela de "já participou hoje"
  if (hasParticipatedToday && !luckyNumber && !isAdminMode) {
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
      {/* Painel de gerenciamento de códigos (apenas no modo admin) */}
      {isAdminMode && <ClassCodeManager />}

      <Card className="p-6 md:p-8 shadow-xl border-0 bg-white rounded-2xl">
        <div className="space-y-6">
          {/* Indicador de modo administrativo */}
          {isAdminMode && (
            <div className="bg-school-yellow-100 border-2 border-school-yellow-300 rounded-xl p-3 text-center">
              <p className="text-school-blue-700 font-semibold text-sm">
                🔧 Modo Administrativo - Testes ilimitados
              </p>
            </div>
          )}

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

          <div className="space-y-2">
            <Label className="text-school-blue-700 font-semibold flex items-center text-sm md:text-base">
              <GraduationCap className="w-4 h-4 mr-2" />
              Turma
            </Label>
            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoading}>
              <SelectTrigger className="h-12 md:h-14 text-base md:text-lg border-2 border-gray-200 focus:border-school-blue-500 rounded-xl">
                <SelectValue placeholder="Selecione sua turma" />
              </SelectTrigger>
              <SelectContent>
                {CLASS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="studentCode" className="text-school-blue-700 font-semibold flex items-center text-sm md:text-base">
              <Key className="w-4 h-4 mr-2" />
              Código do aluno
            </Label>
            <Input
              id="studentCode"
              type="text"
              placeholder="Digite o código fornecido pelo professor"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
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
                {isAdminMode ? "Gerando teste..." : "Verificando e gerando..."}
              </div>
            ) : (
              <div className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                {isAdminMode ? "Gerar número (teste)" : "Gerar meu número da sorte"}
              </div>
            )}
          </Button>

          {luckyNumber && (
            <div className="text-center p-4 md:p-6 bg-gradient-to-br from-school-blue-50 to-school-yellow-50 rounded-xl border-2 border-school-yellow-200 animate-bounce-in">
              <Sparkles className="w-8 h-8 text-school-yellow-500 mx-auto mb-2" />
              <p className="text-school-blue-700 font-semibold mb-2 text-sm md:text-base">
                {isAdminMode ? "Teste gerado!" : "Parabéns!"}
              </p>
              <p className="text-xl md:text-2xl font-bold text-school-blue-800">
                {isAdminMode ? "Número de teste: " : "Seu número da sorte é: "}
                <span className="text-school-yellow-600">#{luckyNumber}</span>
              </p>
              <p className="text-xs md:text-sm text-school-blue-600 mt-2">
                {isAdminMode ? "Teste administrativo realizado com sucesso!" : "Guarde bem este número! Boa sorte!"}
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
