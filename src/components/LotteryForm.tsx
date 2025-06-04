
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Sparkles, Phone, User, Calendar } from 'lucide-react';

const LotteryForm = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [luckyNumber, setLuckyNumber] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasParticipatedToday, setHasParticipatedToday] = useState(false);

  // Verificar se o usuário já participou hoje
  useEffect(() => {
    const checkParticipation = () => {
      const today = new Date().toDateString();
      const lastParticipation = localStorage.getItem('lastLotteryParticipation');
      
      if (lastParticipation === today) {
        setHasParticipatedToday(true);
      }
    };

    checkParticipation();
  }, []);

  const generateLuckyNumber = () => {
    if (!name.trim() || !phone.trim()) {
      alert('Por favor, preencha todos os campos!');
      return;
    }

    setIsGenerating(true);
    
    // Simula o tempo de geração do número
    setTimeout(() => {
      const number = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      setLuckyNumber(number);
      setIsGenerating(false);
      
      // Marcar participação no localStorage
      const today = new Date().toDateString();
      localStorage.setItem('lastLotteryParticipation', today);
      setHasParticipatedToday(true);
    }, 1500);
  };

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
            />
          </div>

          <Button
            onClick={generateLuckyNumber}
            disabled={isGenerating}
            className="w-full h-12 md:h-16 text-base md:text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            {isGenerating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-school-blue-800 mr-2"></div>
                Gerando...
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
