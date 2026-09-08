import React, { useState, useEffect, useRef, useMemo } from 'react';
import Cropper from 'react-easy-crop';
import Webcam from 'react-webcam';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Lock, 
  Upload, 
  Trash2, 
  Loader2, 
  Check, 
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl: string;
  onAvatarChange: (url: string) => void;
  studentName: string;
}

// Helper: Convert selected image coordinates into a cropped WebP blob via canvas
const getCroppedImg = (imageSrc: string, pixelCrop: any): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Não foi possível obter o contexto 2D do Canvas.'));
        return;
      }

      // Crop canvas size
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      // Compress and generate WebP blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao exportar blob do canvas.'));
          }
        },
        'image/webp',
        0.85
      );
    };
    image.onerror = (err) => reject(err);
  });
};

// Helper: Convert original full image into a WebP blob via canvas
const getOriginalWebPBlob = (imageSrc: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Não foi possível obter o contexto 2D do Canvas.'));
        return;
      }

      canvas.width = image.width;
      canvas.height = image.height;

      ctx.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao exportar blob original.'));
          }
        },
        'image/webp',
        0.85
      );
    };
    image.onerror = (err) => reject(err);
  });
};

export const StudentProfileModal = ({
  isOpen,
  onClose,
  avatarUrl,
  onAvatarChange,
  studentName
}: StudentProfileModalProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  // Profile data state
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string>('');

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password field focus states
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  // Photo Crop states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  
  // Photo selection/camera dialogs
  const [showPhotoSourceOptions, setShowPhotoSourceOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showCropper, setShowCropper] = useState(false);

  // Pending changes states
  const [pendingPhotoBlob, setPendingPhotoBlob] = useState<Blob | null>(null);
  const [pendingOriginalBlob, setPendingOriginalBlob] = useState<Blob | null>(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null);
  const [photoMarkedForDeletion, setPhotoMarkedForDeletion] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Dialog overlays
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset image error state when url changes
  useEffect(() => {
    setImgError(false);
  }, [avatarUrl, pendingPhotoPreview]);

  // Clean object URL on unmount or refresh
  useEffect(() => {
    return () => {
      if (pendingPhotoPreview) {
        URL.revokeObjectURL(pendingPhotoPreview);
      }
    };
  }, [pendingPhotoPreview]);

  // Load user email on open (uses session cache to avoid auth lock error)
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
      } catch (err) {
        console.warn('Erro silencioso ao buscar dados do usuário:', err);
      }
    };
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  // Reset internal states on modal open/close
  const resetFormStates = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setIsNewPasswordFocused(false);
    setIsConfirmPasswordFocused(false);
    setPendingPhotoBlob(null);
    setPendingOriginalBlob(null);
    if (pendingPhotoPreview) {
      URL.revokeObjectURL(pendingPhotoPreview);
      setPendingPhotoPreview(null);
    }
    setPhotoMarkedForDeletion(false);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowCropper(false);
    setShowCamera(false);
    setShowPhotoSourceOptions(false);
  };

  // Safe Close logic with unsaved changes detection
  const handleAttemptClose = () => {
    const hasUnsavedChanges = 
      pendingPhotoBlob !== null || 
      photoMarkedForDeletion || 
      currentPassword !== '' || 
      newPassword !== '' || 
      confirmNewPassword !== '';

    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      resetFormStates();
      onClose();
    }
  };

  // Helper: Slugify name for clean directories
  const slugifyName = (name: string): string => {
    return name
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // spaces to dashes
      .replace(/[^\w-]+/g, '') // remove special chars
      .replace(/--+/g, '-'); // replace multiple dashes
  };

  // Read selected image file and open cropper
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato inválido',
        description: 'Selecione apenas arquivos de imagem (PNG, JPG, JPEG, WebP).',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setShowCropper(true);
    });
    reader.readAsDataURL(file);
  };

  const handleCameraError = (err: any) => {
    console.error('Erro de câmera:', err);
    toast({
      title: 'Acesso negado à câmera',
      description: 'Por favor, conceda permissão de acesso à câmera nas configurações do seu navegador.',
      variant: 'destructive',
    });
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      if (screenshot) {
        setImageSrc(screenshot);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setShowCamera(false);
        setShowCropper(true);
      } else {
        toast({
          title: 'Erro de captura',
          description: 'Não foi possível obter a imagem da webcam.',
          variant: 'destructive',
        });
      }
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // Perform crop on client canvas and convert both cropped & original to WebP
  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      setSaveProgress('Processando corte...');
      const webpBlobCropped = await getCroppedImg(imageSrc, croppedAreaPixels);
      const webpBlobOriginal = await getOriginalWebPBlob(imageSrc);
      
      // Revoke old object URL
      if (pendingPhotoPreview) {
        URL.revokeObjectURL(pendingPhotoPreview);
      }

      const previewUrl = URL.createObjectURL(webpBlobCropped);
      setPendingPhotoBlob(webpBlobCropped);
      setPendingOriginalBlob(webpBlobOriginal);
      setPendingPhotoPreview(previewUrl);
      setPhotoMarkedForDeletion(false); // Cancel deletion if uploading new photo
      setShowCropper(false);
      setImageSrc(null);

      toast({
        title: 'Foto processada!',
        description: 'Clique em "Salvar Alterações" no rodapé para gravar as imagens.',
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro de processamento',
        description: 'Não foi possível recortar e converter a imagem.',
        variant: 'destructive',
      });
    } finally {
      setSaveProgress('');
    }
  };

  // Password rules validation
  const passwordRules = useMemo(() => {
    return [
      {
        id: 'length',
        label: 'Mínimo de 6 caracteres',
        met: newPassword.length >= 6
      },
      {
        id: 'uppercase',
        label: 'Pelo menos uma letra maiúscula',
        met: /[A-Z]/.test(newPassword)
      },
      {
        id: 'lowercase',
        label: 'Pelo menos uma letra minúscula',
        met: /[a-z]/.test(newPassword)
      },
      {
        id: 'specialOrNum',
        label: 'Pelo menos um número ou caractere especial',
        met: /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)
      },
      {
        id: 'match',
        label: 'Confirmação de nova senha idêntica',
        met: newPassword === confirmNewPassword && newPassword !== ''
      }
    ];
  }, [newPassword, confirmNewPassword]);

  // Derived states
  const passwordIsActive = newPassword !== '' || confirmNewPassword !== '';
  const showPasswordRequirements = isNewPasswordFocused || isConfirmPasswordFocused || passwordIsActive;
  const allPasswordRulesMet = passwordRules.every(rule => rule.met);
  const isDirty = pendingPhotoBlob !== null || photoMarkedForDeletion || passwordIsActive;
  const canSave = isDirty && (!passwordIsActive || (allPasswordRulesMet && currentPassword !== ''));

  // Global Submit Action
  const handleGlobalSave = async () => {
    if (!canSave) return;
    setIsSaving(true);

    try {
      // 1. Process password change if active
      if (passwordIsActive) {
        setSaveProgress('Validando credenciais...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) throw new Error('Usuário não localizado.');

        const { error: authError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword
        });

        if (authError) {
          throw new Error('A senha atual inserida está incorreta.');
        }

        setSaveProgress('Atualizando senha...');
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) {
          throw updateError;
        }
      }

      // 2. Process photo deletion if marked
      if (photoMarkedForDeletion && avatarUrl) {
        setSaveProgress('Excluindo fotos...');

        const slugName = slugifyName(studentName || 'aluno');
        const croppedPath = `${slugName}/foto-perfil.webp`;
        const originalPath = `${slugName}/foto-original.webp`;

        // Remove files from storage
        await supabase.storage.from('perfil').remove([croppedPath, originalPath]);

        const { error: metaError } = await supabase.auth.updateUser({
          data: { avatar_url: null }
        });

        if (metaError) throw metaError;

        onAvatarChange('');
      }

      // 3. Process photo upload if pending
      if (pendingPhotoBlob && pendingOriginalBlob) {
        setSaveProgress('Enviando fotos ao servidor...');

        const slugName = slugifyName(studentName || 'aluno');
        const croppedPath = `${slugName}/foto-perfil.webp`;
        const originalPath = `${slugName}/foto-original.webp`;

        // Remove old photos if exists (to keep storage optimized)
        if (avatarUrl && !photoMarkedForDeletion) {
          await supabase.storage.from('perfil').remove([croppedPath, originalPath]);
        }

        // Upload cropped WebP photo
        const { error: uploadCroppedError } = await supabase.storage
          .from('perfil')
          .upload(croppedPath, pendingPhotoBlob, {
            contentType: 'image/webp',
            upsert: true
          });

        if (uploadCroppedError) throw uploadCroppedError;

        // Upload original WebP photo
        const { error: uploadOriginalError } = await supabase.storage
          .from('perfil')
          .upload(originalPath, pendingOriginalBlob, {
            contentType: 'image/webp',
            upsert: true
          });

        if (uploadOriginalError) throw uploadOriginalError;

        // Get signed URL for cropped photo
        const { data: signedData, error: signedError } = await supabase.storage
          .from('perfil')
          .createSignedUrl(croppedPath, 315360000); // 10 years duration

        if (signedError) throw signedError;

        const avatarUrlToSave = signedData.signedUrl;

        // Update user metadata with signed URL
        const { error: metaError } = await supabase.auth.updateUser({
          data: { avatar_url: avatarUrlToSave }
        });

        if (metaError) throw metaError;

        onAvatarChange(avatarUrlToSave);
      }

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas alterações foram registradas com sucesso no Uniforme Premiado.',
      });

      resetFormStates();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Falha ao salvar alterações',
        description: err.message || 'Erro ao comunicar com o Supabase.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      setSaveProgress('');
    }
  };

  // Initials for avatar fallback
  const getInitials = (name: string): string => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <>
      {/* Main Profile Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <DialogContent className="max-w-md w-[95%] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl text-zinc-900 dark:text-white overflow-y-auto max-h-[90vh]">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
            <DialogTitle className="text-lg font-bold">Meu Perfil</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Gerencie suas fotos de perfil e alterne sua senha de segurança.
            </DialogDescription>
          </DialogHeader>

          {/* Section: Profile Photo Area */}
          <div className="flex flex-col items-center gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800 pb-6 mb-6">
            <div className="relative group">
              {((pendingPhotoPreview || avatarUrl) && !photoMarkedForDeletion && !imgError) ? (
                <img 
                  src={pendingPhotoPreview || avatarUrl} 
                  alt="Avatar" 
                  onError={() => setImgError(true)}
                  className="w-24 h-24 rounded-full object-cover border-4 border-school-blue-500/80 shadow-md transition-all group-hover:brightness-95"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-school-blue-500/10 border-4 border-school-blue-500/30 flex items-center justify-center text-3xl font-black text-school-blue-500 shadow-sm">
                  {getInitials(studentName)}
                </div>
              )}
              {isSaving && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white text-[10px] text-center font-bold px-2">
                  <Loader2 className="w-5 h-5 animate-spin text-school-blue-400 mb-1" />
                  <span className="truncate max-w-full">{saveProgress || 'Salvando...'}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                disabled={isSaving}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPhotoSourceOptions(true)}
                disabled={isSaving}
                className="h-9 px-3 rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Alterar Foto
              </Button>

              {(avatarUrl || pendingPhotoPreview) && !photoMarkedForDeletion && !imgError && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving}
                  className="h-9 px-3 rounded-lg text-red-500 hover:text-red-650 hover:bg-red-500/5 dark:hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </Button>
              )}
            </div>
            {photoMarkedForDeletion && (
              <span className="text-xs font-bold text-red-500 flex items-center gap-1 bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/25">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Foto marcada para exclusão.
              </span>
            )}
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center max-w-[320px]">
              Suporte para captura via câmera frontal ou upload (PNG, JPG, JPEG e WebP). Armazenamento original + recortada aplicado.
            </p>
          </div>

          {/* Section: Profile Info (Read-Only) */}
          <div className="space-y-4 border-b border-zinc-100 dark:border-zinc-800 pb-6 mb-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  value={studentName} 
                  disabled 
                  className="pl-9 h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 cursor-not-allowed opacity-80"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">E-mail Cadastrado</Label>
              <Input 
                value={email || 'Carregando...'} 
                disabled 
                className="h-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 cursor-not-allowed opacity-80"
              />
            </div>
          </div>

          {/* Section: Security and Password */}
          <div className="space-y-4 pb-4">
            <h4 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-850 pb-2">
              <Lock className="w-4 h-4 text-school-blue-500" />
              Segurança e Senha
            </h4>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Senha Atual</Label>
              <div className="relative">
                <Input 
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Sua senha atual"
                  disabled={isSaving}
                  className="h-10 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650"
                  aria-label="Alternar visualização da senha atual"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Nova Senha</Label>
              <div className="relative">
                <Input 
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={isSaving}
                  onFocus={() => setIsNewPasswordFocused(true)}
                  onBlur={() => setIsNewPasswordFocused(false)}
                  className="h-10 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-655"
                  aria-label="Alternar visualização da nova senha"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                  disabled={isSaving}
                  onFocus={() => setIsConfirmPasswordFocused(true)}
                  onBlur={() => setIsConfirmPasswordFocused(false)}
                  className="h-10 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-655"
                  aria-label="Alternar visualização da confirmação de senha"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Dynamic Checklist validation */}
            {showPasswordRequirements && (
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 p-3.5 rounded-xl space-y-2 mt-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Validação da Nova Senha</span>
                <div className="space-y-1.5 mt-1.5">
                  {passwordRules.map((rule) => (
                    <div key={rule.id} className="flex items-center gap-2 text-xs font-medium">
                      {rule.met ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-450 dark:text-zinc-600 shrink-0" />
                      )}
                      <span className={rule.met ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Save Button (Unified save button) */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-6">
            <Button
              type="button"
              disabled={!canSave || isSaving}
              onClick={handleGlobalSave}
              className="w-full h-11 rounded-xl bg-school-blue-600 hover:bg-school-blue-700 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {saveProgress || 'Salvando Alterações...'}
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Choice Modal: Upload or Camera */}
      <Dialog open={showPhotoSourceOptions} onOpenChange={setShowPhotoSourceOptions}>
        <DialogContent className="max-w-xs w-[90%] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-xl text-zinc-900 dark:text-white">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-bold text-center">Alterar Foto de Perfil</DialogTitle>
            <DialogDescription className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              Escolha como deseja enviar sua foto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 mt-3">
            <Button
              type="button"
              onClick={() => {
                setShowPhotoSourceOptions(false);
                fileInputRef.current?.click();
              }}
              className="h-10 rounded-xl bg-school-blue-600 hover:bg-school-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Fazer Upload
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowPhotoSourceOptions(false);
                setShowCamera(true);
              }}
              className="h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-805 dark:hover:bg-zinc-705 text-zinc-850 dark:text-white font-semibold text-sm flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700"
            >
              <Camera className="w-4 h-4 text-school-blue-500" />
              Tirar Foto (Câmera)
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowPhotoSourceOptions(false)}
              className="h-10 rounded-xl text-zinc-500 text-xs font-semibold"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Capture Dialog */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && setShowCamera(false)}>
        <DialogContent className="max-w-md w-[95%] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl text-zinc-900 dark:text-white">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-bold">Tirar Foto com a Câmera</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
              Centralize seu rosto no enquadramento da câmera.
            </DialogDescription>
          </DialogHeader>

          <div className="relative max-w-xs mx-auto aspect-[3/4] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center mt-2">
            {showCamera && (
              <>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/webp"
                  videoConstraints={{ facingMode: 'user', aspectRatio: 0.75 }}
                  onUserMediaError={handleCameraError}
                  className="w-full h-full object-cover"
                />
                {/* Visual guide frame outline */}
                <div className="absolute inset-4 border-2 border-dashed border-school-blue-500/40 rounded-lg pointer-events-none z-10" />
                {/* Guide text overlay */}
                <div className="absolute inset-x-0 bottom-4 text-center z-10">
                  <span className="inline-block bg-black/60 text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/25 backdrop-blur-sm animate-pulse">
                    Posicione o rosto e o uniforme no enquadramento
                  </span>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCamera(false)}
              className="h-9 rounded-lg px-4 border-zinc-200 dark:border-zinc-700 text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={capturePhoto}
              className="h-9 rounded-lg px-4 bg-school-blue-600 hover:bg-school-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              Tirar Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog Overlay */}
      <Dialog open={showCropper} onOpenChange={(open) => !open && setShowCropper(false)}>
        <DialogContent className="max-w-md w-[95%] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl text-zinc-900 dark:text-white">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-bold">Ajustar e Cortar Imagem</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
              Reposicione e altere o zoom da foto dentro do círculo.
            </DialogDescription>
          </DialogHeader>

          {/* Cropper Container */}
          {imageSrc && (
            <div className="space-y-4">
              <div className="relative w-full h-64 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 shadow-inner">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* Zoom range slider */}
              <div className="flex items-center gap-2.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Zoom:</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-label="Ajustar zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-school-blue-500"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCropper(false);
                setImageSrc(null);
              }}
              className="h-9 rounded-lg px-4 border-zinc-200 dark:border-zinc-700 text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCropSave}
              className="h-9 rounded-lg px-4 bg-school-blue-600 hover:bg-school-blue-700 text-white text-xs font-semibold"
            >
              Recortar Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal: Unsaved Changes Warn */}
      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className="max-w-sm w-[90%] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl text-zinc-900 dark:text-white">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Descartar alterações?
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
              Você possui alterações pendentes que não foram salvas. Deseja realmente descartá-las e fechar o perfil?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCloseConfirm(false)}
              className="h-9 rounded-lg px-4 border-zinc-200 dark:border-zinc-700 text-xs font-semibold"
            >
              Voltar e Salvar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setShowCloseConfirm(false);
                resetFormStates();
                onClose();
              }}
              className="h-9 rounded-lg px-4 bg-red-650 hover:bg-red-750 text-white text-xs font-semibold"
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal: Delete Photo Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm w-[90%] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl text-zinc-900 dark:text-white">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-red-550">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Marcar foto para exclusão?
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
              Deseja marcar sua foto atual para ser removida permanentemente? A remoção será efetuada ao salvar as alterações.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              className="h-9 rounded-lg px-4 border-zinc-200 dark:border-zinc-700 text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setPhotoMarkedForDeletion(true);
                setPendingPhotoBlob(null);
                setPendingOriginalBlob(null);
                if (pendingPhotoPreview) {
                  URL.revokeObjectURL(pendingPhotoPreview);
                  setPendingPhotoPreview(null);
                }
                setShowDeleteConfirm(false);
                toast({
                  title: 'Foto marcada!',
                  description: 'Clique em "Salvar Alterações" no rodapé para efetivar a remoção.',
                });
              }}
              className="h-9 rounded-lg px-4 bg-red-600 hover:bg-red-750 text-white text-xs font-semibold"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
