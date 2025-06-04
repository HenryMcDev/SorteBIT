
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Sparkles, Phone, User } from 'lucide-react';

const LotteryForm = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [luckyNumber, setLuckyNumber] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <Card className="p-8 shadow-xl border-0 bg-white rounded-2xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-school-blue-700 font-semibold flex items-center">
              <User className="w-4 h-4 mr-2" />
              Nome completo
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Digite seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-lg border-2 border-gray-200 focus:border-school-blue-500 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-school-blue-700 font-semibold flex items-center">
              <Phone className="w-4 h-4 mr-2" />
              Telefone
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 text-lg border-2 border-gray-200 focus:border-school-blue-500 rounded-xl"
            />
          </div>

          <Button
            onClick={generateLuckyNumber}
            disabled={isGenerating}
            className="w-full h-14 text-lg font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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
            <div className="text-center p-6 bg-gradient-to-br from-school-blue-50 to-school-yellow-50 rounded-xl border-2 border-school-yellow-200 animate-bounce-in">
              <Sparkles className="w-8 h-8 text-school-yellow-500 mx-auto mb-2" />
              <p className="text-school-blue-700 font-semibold mb-2">Parabéns!</p>
              <p className="text-2xl font-bold text-school-blue-800">
                Seu número da sorte é: <span className="text-school-yellow-600">#{luckyNumber}</span>
              </p>
              <p className="text-sm text-school-blue-600 mt-2">
                Guarde bem este número! Boa sorte!
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LotteryForm;
