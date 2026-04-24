
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Key, Plus, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Teacher {
  id: string;
  name: string;
}

interface ClassOption {
  value: string;
  label: string;
}

interface StudentCode {
  id: string;
  student_name: string;
  class_name: string;
  code: string;
  is_used: boolean;
  used_at: string | null;
}

interface TeacherCodeManagerProps {
  teacher: Teacher;
  classOptions: ClassOption[];
}

const TeacherCodeManager = ({ teacher, classOptions }: TeacherCodeManagerProps) => {
  const [studentName, setStudentName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [studentCodes, setStudentCodes] = useState<StudentCode[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate unique code for student
  const generateStudentCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${selectedClass}#${result}`;
  };

  // Load today's student codes
  const loadStudentCodes = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('student_codes')
        .select('id, student_name, class_name, code, is_used, used_at')
        .eq('teacher_name', teacher.name)
        .eq('date', today)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading student codes:', error);
        return;
      }

      setStudentCodes(data || []);
    } catch (error) {
      console.error('Error loading student codes:', error);
    }
  };

  useEffect(() => {
    loadStudentCodes();
  }, [teacher.id]);

  const handleGenerateCode = async () => {
    if (!studentName.trim() || !selectedClass) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome do aluno e selecione a turma.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if student already has a code for today
      const { data: existingCode } = await supabase
        .from('student_codes')
        .select('id')
        .eq('student_name', studentName.trim())
        .eq('class_name', selectedClass)
        .eq('date', today)
        .maybeSingle();

      if (existingCode) {
        toast({
          title: "Código já existe",
          description: "Este aluno já possui um código para hoje.",
          variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      const code = generateStudentCode();

      const { error } = await supabase
        .from('student_codes')
        .insert({
          teacher_name: teacher.name,
          student_name: studentName.trim(),
          class_name: selectedClass,
          code: code,
          date: today
        });

      if (error) {
        console.error('Error creating student code:', error);
        toast({
          title: "Erro",
          description: "Erro ao gerar código do aluno.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso!",
        description: `Código ${code} gerado para ${studentName}`,
        variant: "default"
      });

      setStudentName('');
      setSelectedClass('');
      loadStudentCodes();
    } catch (error) {
      console.error('Error generating student code:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao gerar código.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: "Copiado!",
        description: "Código copiado para a área de transferência.",
        variant: "default"
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate code for student */}
      <Card className="p-4 md:p-6 bg-school-blue-50 border-school-blue-200">
        <h3 className="text-lg md:text-xl font-bold text-school-blue-700 mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Gerar Código para Aluno
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentName" className="text-school-blue-700 font-semibold text-sm md:text-base">
              Nome completo do aluno
            </Label>
            <Input
              id="studentName"
              type="text"
              placeholder="Digite o nome completo do aluno"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="h-10 md:h-12 text-sm md:text-base border-2 border-gray-200 focus:border-school-blue-500 rounded-lg"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-school-blue-700 font-semibold text-sm md:text-base">
              Turma
            </Label>
            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isGenerating}>
              <SelectTrigger className="h-10 md:h-12 text-sm md:text-base border-2 border-gray-200 focus:border-school-blue-500 rounded-lg">
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerateCode}
            disabled={isGenerating || !studentName.trim() || !selectedClass}
            className="w-full h-10 md:h-12 text-sm md:text-base font-bold bg-school-yellow-500 hover:bg-school-yellow-600 text-school-blue-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isGenerating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-school-blue-800 mr-2"></div>
                Gerando código...
              </div>
            ) : (
              <div className="flex items-center">
                <Key className="w-4 h-4 mr-2" />
                Gerar código para aluno
              </div>
            )}
          </Button>
        </div>
      </Card>

      {/* List of generated codes */}
      {studentCodes.length > 0 && (
        <Card className="p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-school-blue-700 mb-4">
            Códigos Gerados Hoje ({studentCodes.length})
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {studentCodes.map((studentCode) => (
              <div
                key={studentCode.id}
                className={`p-3 rounded-lg border-2 ${
                  studentCode.is_used 
                    ? 'bg-gray-50 border-gray-200 text-gray-600' 
                    : 'bg-white border-school-yellow-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm md:text-base">
                      {studentCode.student_name}
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">
                      {studentCode.class_name}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-mono ${
                      studentCode.is_used 
                        ? 'bg-gray-200 text-gray-600' 
                        : 'bg-school-yellow-100 text-school-blue-700'
                    }`}>
                      {studentCode.code}
                    </span>
                    
                    {!studentCode.is_used && (
                      <Button
                        onClick={() => copyToClipboard(studentCode.code)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        {copiedCode === studentCode.code ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                {studentCode.is_used && (
                  <p className="text-xs text-gray-500 mt-1">
                    Utilizado em: {new Date(studentCode.used_at!).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeacherCodeManager;
