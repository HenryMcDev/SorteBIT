import React, { useState } from 'react';
import { useTeacherAuth } from '@/hooks/useTeacherAuth';
import ClassCodeManager from './ClassCodeManager';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { LogOut, User, Lock, Loader2 } from 'lucide-react';

export default function TeacherPortal() {
  const { teacher, isLoading, login, logout } = useTeacherAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) return;
    setIsSubmitting(true);
    await login(name, password);
    setIsSubmitting(false);
  };

  if (teacher) {
    return (
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Olá, Prof. {teacher.name}!</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bem-vindo ao Portal do Professor.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={logout} 
            className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20"
          >
            <LogOut className="w-4 h-4" />
            Sair do Portal
          </Button>
        </div>

        <ClassCodeManager />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Card className="p-8 border border-slate-100 dark:border-slate-800 shadow-lg rounded-2xl">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-950/30 rounded-2xl text-blue-600 dark:text-blue-400">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Acesso do Professor</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Entre com suas credenciais para gerenciar códigos diários</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacher-name">Nome do Professor</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="teacher-name"
                type="text"
                placeholder="Ex: Prof. Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 rounded-xl"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher-password">Senha de Acesso</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="teacher-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 rounded-xl"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl shadow-md transition-all duration-200 mt-2"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Autenticando...
              </span>
            ) : (
              'Entrar no Portal'
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
