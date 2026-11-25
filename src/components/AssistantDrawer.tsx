import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  FileAudio,
  ImagePlus,
  Mic,
  Pencil,
  Send,
  Sparkles,
  Square,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { formatCOP, getDefaultIsoDateForMonth, type MonthDataset } from '../data/budgetData';

export interface AssistantExpenseInput {
  amount: number;
  date: string;
  description: string;
  category: string;
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
  month: MonthDataset;
  totalIncome: number;
  effectiveBudget: number;
  totalSpent: number;
  availableBalance: number;
  onRegisterExpense: (expense: AssistantExpenseInput) => {
    categoryLabel: string;
    dateLabel: string;
    amount: number;
    description: string;
  };
}

interface RegisteredCardData {
  amount: number;
  description: string;
  categoryLabel: string;
  dateLabel: string;
}

interface PendingAttachment {
  kind: 'image' | 'audio';
  mimeType: string;
  base64Data: string;
  previewUrl: string;
  fileName: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  historyText?: string;
  imagePreviewUrl?: string;
  audioPreviewUrl?: string;
  audioFileName?: string;
  transcript?: string | null;
  registeredExpense?: RegisteredCardData;
}

interface ServerFunctionCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

interface ServerChatResponse {
  ok?: boolean;
  replyText?: string;
  functionCalls?: ServerFunctionCall[];
  transcript?: string | null;
  error?: string;
  status?: number;
  technicalMessage?: string;
}

const SUGGESTED_PROMPTS = [
  'Gasté 25.000 en almuerzo hoy',
  '¿Me alcanza para comprar unos tenis de $350.000?',
  '¿Cuánto saldo disponible me queda?',
];

function formatRecordingTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(blob);
  });
}

async function prepareImageAttachment(file: File): Promise<PendingAttachment> {
  const objectUrl = URL.createObjectURL(file);

  // Intentamos optimizar imágenes muy pesadas manteniendo legibilidad de tickets/recibos
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Imagen no soportada'));
      el.src = objectUrl;
    });

    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    if (scale < 1 || file.size > 2.5 * 1024 * 1024) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.88)
        );
        if (compressedBlob) {
          URL.revokeObjectURL(objectUrl);
          const previewUrl = URL.createObjectURL(compressedBlob);
          const base64Data = await readBlobAsBase64(compressedBlob);
          return {
            kind: 'image',
            mimeType: 'image/jpeg',
            base64Data,
            previewUrl,
            fileName: file.name || 'recibo.jpg',
          };
        }
      }
    }
  } catch {
    // Si falla el canvas (ej. HEIC en algunos navegadores), enviamos el archivo original
  }

  const base64Data = await readBlobAsBase64(file);
  return {
    kind: 'image',
    mimeType: file.type || 'image/jpeg',
    base64Data,
    previewUrl: objectUrl,
    fileName: file.name || 'imagen.jpg',
  };
}

function getMediaErrorMessage(err: unknown, device: 'microphone' | 'camera'): string {
  const errName = err instanceof DOMException ? err.name : '';
  const deviceLabel = device === 'microphone' ? 'micrófono' : 'cámara';

  if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
    return `Permiso de ${deviceLabel} denegado. Habilita el acceso al ${deviceLabel} en tu navegador o recarga la vista.`;
  }
  if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
    return `No se detectó ningún ${deviceLabel} disponible en este dispositivo. Puedes cargar un archivo manualmente.`;
  }
  if (errName === 'NotReadableError') {
    return `El ${deviceLabel} está siendo utilizado por otra aplicación.`;
  }
  return `No se pudo acceder al ${deviceLabel}. También puedes subir un archivo desde tu dispositivo.`;
}

export function AssistantDrawer({
  isOpen,
  onClose,
  userName,
  onUpdateUserName,
  month,
  totalIncome,
  effectiveBudget,
  totalSpent,
  availableBalance,
  onRegisterExpense,
}: AssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: `¡Hola, ${userName}! Soy tu asistente de presupuesto para ${month.label}. Escríbeme un gasto, sube la foto de un recibo o graba una nota de voz para registrarlo al instante.`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(userName);

  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);

  // Camera capture state
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftName(userName);
  }, [userName]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, pendingAttachment, cameraOpen]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      for (const track of cameraStreamRef.current.getTracks()) {
        track.stop();
      }
      cameraStreamRef.current = null;
    }
    setCameraOpen(false);
  };

  const stopRecordingTracks = () => {
    if (recordingStreamRef.current) {
      for (const track of recordingStreamRef.current.getTracks()) {
        track.stop();
      }
      recordingStreamRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      if (isRecording && mediaRecorderRef.current) {
        discardRecordingRef.current = true;
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
      stopRecordingTracks();
    }
  }, [isOpen, isRecording]);

  useEffect(() => {
    return () => {
      stopCameraStream();
      stopRecordingTracks();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cameraOpen) {
          stopCameraStream();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cameraOpen, onClose]);

  const clearPendingAttachment = (revoke = true) => {
    if (pendingAttachment && revoke) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    setPendingAttachment(null);
  };

  const mapServerErrorToMessage = (
    httpStatus: number,
    payload: ServerChatResponse | null,
    fallbackText?: string
  ): string => {
    const code = payload?.error ?? '';
    const status = payload?.status ?? httpStatus;
    const technical = payload?.technicalMessage || fallbackText || '';
    const upperTech = technical.toUpperCase();

    if (
      status === 503 ||
      code === 'HIGH_DEMAND' ||
      upperTech.includes('503') ||
      upperTech.includes('HIGH DEMAND') ||
      upperTech.includes('UNAVAILABLE') ||
      upperTech.includes('OVERLOADED')
    ) {
      return 'El asistente está muy solicitado en este momento. Por favor, intenta de nuevo en un minuto.';
    }

    if (
      status === 429 ||
      code === 'QUOTA_EXCEEDED' ||
      upperTech.includes('429') ||
      upperTech.includes('RESOURCE_EXHAUSTED') ||
      upperTech.includes('QUOTA')
    ) {
      return 'He alcanzado mi límite de mensajes por ahora. Intenta de nuevo más tarde.';
    }

    return (
      technical ||
      payload?.error ||
      `Error inesperado del servidor (HTTP ${httpStatus || 500}).`
    );
  };

  const handleSaveUserName = () => {
    const cleaned = draftName.trim();
    if (cleaned) {
      onUpdateUserName(cleaned);
    } else {
      setDraftName(userName);
    }
    setEditingName(false);
  };

  const handleImageFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaNotice(null);
    if (!file.type.startsWith('image/')) {
      setMediaNotice('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    try {
      clearPendingAttachment(true);
      const attachment = await prepareImageAttachment(file);
      setPendingAttachment(attachment);
    } catch {
      setMediaNotice('No se pudo procesar la imagen seleccionada.');
    }
  };

  const handleAudioFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaNotice(null);
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|webm|aac)$/i)) {
      setMediaNotice('Por favor selecciona un archivo de audio válido (MP3, WAV, M4A, WebM, OGG).');
      return;
    }

    if (file.size > 14 * 1024 * 1024) {
      setMediaNotice('El archivo de audio es demasiado grande (máximo 14 MB).');
      return;
    }

    try {
      clearPendingAttachment(true);
      const base64Data = await readBlobAsBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setPendingAttachment({
        kind: 'audio',
        mimeType: file.type || 'audio/mpeg',
        base64Data,
        previewUrl,
        fileName: file.name || 'nota_de_voz.mp3',
      });
    } catch {
      setMediaNotice('No se pudo cargar el archivo de audio.');
    }
  };

  const handleOpenCamera = async () => {
    setMediaNotice(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaNotice('Tu navegador no soporta cámara directa. Usa el botón de subir imagen.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
      });
    } catch (err) {
      setMediaNotice(getMediaErrorMessage(err, 'camera'));
    }
  };

  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    );
    stopCameraStream();

    if (!blob) {
      setMediaNotice('No se pudo capturar la fotografía.');
      return;
    }

    clearPendingAttachment(true);
    const previewUrl = URL.createObjectURL(blob);
    const base64Data = await readBlobAsBase64(blob);
    setPendingAttachment({
      kind: 'image',
      mimeType: 'image/jpeg',
      base64Data,
      previewUrl,
      fileName: `recibo_${Date.now()}.jpg`,
    });
  };

  const handleStartRecording = async () => {
    setMediaNotice(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMediaNotice(
        'La grabación de voz directa no está disponible aquí. Puedes subir un archivo de audio.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      const supportedType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      discardRecordingRef.current = false;

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          audioChunksRef.current.push(evt.data);
        }
      };

      recorder.onstop = async () => {
        stopRecordingTracks();
        setIsRecording(false);

        if (discardRecordingRef.current || audioChunksRef.current.length === 0) {
          audioChunksRef.current = [];
          return;
        }

        const rawMime = recorder.mimeType || supportedType || 'audio/webm';
        const cleanMime = rawMime.split(';')[0] || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: cleanMime });
        audioChunksRef.current = [];

        if (blob.size < 200) {
          setMediaNotice('La grabación estuvo muy corta. Intenta hablar un poco más cerca.');
          return;
        }

        const base64Data = await readBlobAsBase64(blob);
        const previewUrl = URL.createObjectURL(blob);
        clearPendingAttachment(true);
        setPendingAttachment({
          kind: 'audio',
          mimeType: cleanMime,
          base64Data,
          previewUrl,
          fileName: 'nota_de_voz.webm',
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
    } catch (err) {
      stopRecordingTracks();
      setMediaNotice(getMediaErrorMessage(err, 'microphone'));
    }
  };

  const handleStopRecording = (discard = false) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      stopRecordingTracks();
      setIsRecording(false);
      return;
    }
    discardRecordingRef.current = discard;
    mediaRecorderRef.current.stop();
  };

  const sendMessage = async (
    rawText: string,
    attachmentOverride?: PendingAttachment | null
  ) => {
    const trimmed = rawText.trim();
    const activeAttachment =
      attachmentOverride !== undefined ? attachmentOverride : pendingAttachment;

    if ((!trimmed && !activeAttachment) || isLoading) return;

    setMediaNotice(null);

    const displayLabel =
      trimmed ||
      (activeAttachment?.kind === 'image'
        ? 'Imagen de gasto adjunta'
        : 'Nota de voz adjunta');

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: displayLabel,
      historyText: trimmed
        ? activeAttachment
          ? `[${activeAttachment.kind === 'image' ? 'Imagen adjunta' : 'Audio adjunto'}] ${trimmed}`
          : trimmed
        : activeAttachment?.kind === 'image'
          ? '[El usuario envió una imagen de recibo o gasto]'
          : '[El usuario envió una nota de voz]',
      imagePreviewUrl:
        activeAttachment?.kind === 'image' ? activeAttachment.previewUrl : undefined,
      audioPreviewUrl:
        activeAttachment?.kind === 'audio' ? activeAttachment.previewUrl : undefined,
      audioFileName:
        activeAttachment?.kind === 'audio' ? activeAttachment.fileName : undefined,
    };

    const historyPayload = messages
      .filter((m) => m.id !== 'welcome-msg' && m.role !== 'error')
      .map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        text:
          m.historyText ||
          (m.transcript ? `${m.text}\n[Transcripción: ${m.transcript}]` : m.text),
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    // Conservamos la URL de vista previa dentro del historial del chat
    setPendingAttachment(null);
    setIsLoading(true);

    try {
      const todayRealIso = new Date().toLocaleDateString('en-CA');
      const currentDateIso =
        month.id === 'nov-2026' && /^\d{4}-\d{2}-\d{2}$/.test(todayRealIso)
          ? todayRealIso
          : getDefaultIsoDateForMonth(month);

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
          attachment: activeAttachment
            ? {
                kind: activeAttachment.kind,
                mimeType: activeAttachment.mimeType,
                data: activeAttachment.base64Data,
                fileName: activeAttachment.fileName,
              }
            : undefined,
          budgetContext: {
            userName,
            monthLabel: month.label,
            monthlyBudget: month.monthlyBudget,
            totalIncome,
            effectiveBudget,
            totalSpent,
            availableBalance,
            currentDateIso,
            expensesCount: month.expenses.length,
          },
        }),
      });

      let data: ServerChatResponse | null = null;
      const contentType = response.headers.get('content-type') || '';
      const rawBodyText = await response.text();

      try {
        data = rawBodyText ? (JSON.parse(rawBodyText) as ServerChatResponse) : null;
      } catch {
        data = null;
      }

      if (!data) {
        if (!response.ok) {
          throw new Error(
            rawBodyText.trim().startsWith('<')
              ? `Error del servidor (HTTP ${response.status} · ${contentType || 'HTML'}).`
              : rawBodyText || `Error del servidor (HTTP ${response.status})`
          );
        }

        const isHtmlResponse =
          contentType.includes('text/html') || rawBodyText.trimStart().startsWith('<');
        throw new Error(
          isHtmlResponse
            ? 'No se encontró el endpoint /api/assistant/chat (el servidor devolvió la página HTML de la app en lugar de JSON). Si estás en el enlace compartido (Shared App URL), vuelve a publicar la aplicación; si estás en desarrollo, recarga la vista.'
            : `El servidor del asistente no devolvió JSON válido (HTTP ${response.status}, tipo: ${contentType || 'desconocido'}).`
        );
      }

      if (!response.ok || data.ok === false || Boolean(data.error)) {
        const errorText = mapServerErrorToMessage(data.status ?? response.status, data);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'error',
            text: errorText,
          },
        ]);
        return;
      }

      if (data?.transcript) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsgId
              ? {
                  ...m,
                  historyText: `[Audio transcrito: "${data?.transcript}"]${
                    trimmed ? ` ${trimmed}` : ''
                  }`,
                }
              : m
          )
        );
      }

      const fnCalls = Array.isArray(data?.functionCalls) ? data.functionCalls : [];
      const registerCall = fnCalls.find((fc) => fc.name === 'registerExpense');

      let registeredCard: RegisteredCardData | undefined;
      if (registerCall) {
        const args = registerCall.args ?? {};
        const rawAmount = args.amount;
        let parsedAmount = 0;
        if (typeof rawAmount === 'number') {
          parsedAmount = Number.isFinite(rawAmount) ? Math.round(rawAmount) : 0;
        } else if (typeof rawAmount === 'string') {
          const cleaned = rawAmount.trim().replace(/[^\d.,]/g, '');
          if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
            parsedAmount = Number(cleaned.replace(/\./g, '')) || 0;
          } else if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
            parsedAmount = Number(cleaned.replace(/,/g, '')) || 0;
          } else {
            parsedAmount = Math.round(Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0);
          }
        }

        if (Number.isFinite(parsedAmount) && parsedAmount > 0) {
          const expenseDate =
            typeof args.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date)
              ? args.date
              : currentDateIso;
          const expenseDesc =
            typeof args.description === 'string' && args.description.trim()
              ? args.description.trim()
              : 'Gasto registrado';
          const expenseCat =
            typeof args.category === 'string' && args.category.trim()
              ? args.category.trim()
              : 'Alimentación';

          const saved = onRegisterExpense({
            amount: parsedAmount,
            date: expenseDate,
            description: expenseDesc,
            category: expenseCat,
          });

          registeredCard = {
            amount: saved.amount,
            description: saved.description,
            categoryLabel: saved.categoryLabel,
            dateLabel: saved.dateLabel,
          };
        }
      }

      const replyText = (data?.replyText ?? '').trim();
      if (!replyText && !registeredCard) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'error',
            text: 'No se recibió una respuesta válida del asistente. Intenta de nuevo.',
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text:
            replyText ||
            `¡Listo, ${userName}! He guardado tu gasto de ${formatCOP(
              registeredCard!.amount
            )}.`,
          transcript: data?.transcript ?? null,
          registeredExpense: registeredCard,
        },
      ]);
    } catch (err) {
      const technical =
        err instanceof Error
          ? err.message
          : 'No se pudo establecer conexión con el servidor.';
      const mapped = mapServerErrorToMessage(500, null, technical);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'error',
          text: mapped,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(inputValue);
  };

  const handleClearChat = () => {
    if (isLoading) return;
    clearPendingAttachment(true);
    setMediaNotice(null);
    setMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        text: `¡Hola, ${userName}! Conversación reiniciada. Tu saldo disponible en ${month.label} es ${formatCOP(
          availableBalance
        )}. Puedes escribirme, subir un recibo o enviar una nota de voz.`,
      },
    ]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Asistente financiero inteligente"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="relative z-10 w-full max-w-md h-full bg-[#F8FAFC] dark:bg-[#080D1A] border-l border-slate-200 dark:border-white/[0.08] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0D1424]/95 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#5B3DF5]/12 dark:bg-[#5B3DF5]/20 border border-[#5B3DF5]/30 dark:border-[#5B3DF5]/40 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-[#5B3DF5] dark:text-[#A28BFF]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                    Asistente de Gastos
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Texto, recibos en imagen y notas de voz
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleClearChat}
                  disabled={isLoading}
                  title="Limpiar conversación"
                  aria-label="Limpiar conversación"
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar asistente"
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Live Budget & User Name Strip */}
            <div className="px-5 py-2.5 bg-slate-100/80 dark:bg-[#0D1424]/70 border-b border-slate-200 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-600 dark:text-slate-400">
                  Disponible ({month.shortMonth}):{' '}
                </span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    availableBalance >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatCOP(availableBalance)}
                </span>
              </div>

              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveUserName();
                      }
                    }}
                    maxLength={28}
                    aria-label="Tu nombre"
                    className="w-28 bg-white dark:bg-[#080D1A] border border-[#5B3DF5] rounded-md px-2 py-0.5 text-xs text-slate-900 dark:text-white outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveUserName}
                    aria-label="Guardar nombre"
                    className="p-1 rounded bg-[#5B3DF5] text-white hover:bg-[#6D52F7] cursor-pointer"
                  >
                    <Check className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  title="Cambiar tu nombre"
                  className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#5B3DF5] dark:text-[#A28BFF]" aria-hidden="true" />
                  <span className="font-medium">{userName}</span>
                  <Pencil className="w-3 h-3 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
              {messages.map((msg) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#5B3DF5] text-white px-4 py-2.5 text-sm leading-relaxed shadow-md shadow-[#5B3DF5]/20 space-y-2">
                        {msg.imagePreviewUrl && (
                          <img
                            src={msg.imagePreviewUrl}
                            alt="Imagen adjunta del gasto"
                            className="max-h-48 w-auto rounded-xl object-cover border border-white/20"
                          />
                        )}
                        {msg.audioPreviewUrl && (
                          <div className="rounded-xl bg-black/25 px-2.5 py-2 space-y-1">
                            <p className="text-[11px] text-white/80 flex items-center gap-1.5">
                              <FileAudio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">{msg.audioFileName || 'Nota de voz'}</span>
                            </p>
                            <audio
                              controls
                              src={msg.audioPreviewUrl}
                              className="w-full h-8"
                            />
                          </div>
                        )}
                        {msg.text && <p className="whitespace-pre-line">{msg.text}</p>}
                      </div>
                    </div>
                  );
                }

                if (msg.role === 'error') {
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div
                        role="alert"
                        className="max-w-[92%] rounded-2xl rounded-bl-sm bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-4 py-3 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2.5"
                      >
                        <AlertCircle
                          className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <p className="leading-relaxed break-words">{msg.text}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex flex-col items-start gap-2">
                    <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 px-4 py-3 text-sm leading-relaxed shadow-xs dark:shadow-none">
                      {msg.transcript && (
                        <div className="mb-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.07] px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-[#5B3DF5] dark:text-[#A28BFF]">
                            Transcripción:{' '}
                          </span>
                          <span className="italic">"{msg.transcript}"</span>
                        </div>
                      )}

                      <p className="whitespace-pre-line">{msg.text}</p>

                      {msg.registeredExpense && (
                        <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/35 px-3.5 py-2.5 flex items-start gap-2.5">
                          <CheckCircle2
                            className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <div className="min-w-0 text-xs space-y-0.5">
                            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                              Gasto registrado en tu presupuesto
                            </p>
                            <p className="text-slate-700 dark:text-slate-200">
                              <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                                {formatCOP(msg.registeredExpense.amount)}
                              </span>{' '}
                              · {msg.registeredExpense.description}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">
                              {msg.registeredExpense.categoryLabel} ·{' '}
                              {msg.registeredExpense.dateLabel}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Animated typing indicator */}
              {isLoading && (
                <div className="flex justify-start" aria-live="polite">
                  <div className="rounded-2xl rounded-bl-sm bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-white/[0.08] px-4 py-3 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 shadow-xs dark:shadow-none">
                    <span>escribiendo</span>
                    <span className="inline-flex items-center gap-1" aria-hidden="true">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] dark:bg-[#8B75FF] animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] dark:bg-[#8B75FF] animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5B3DF5] dark:bg-[#8B75FF] animate-bounce" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips (only when conversation just started) */}
            {messages.length <= 2 && !isLoading && !pendingAttachment && !cameraOpen && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-[#11192C] dark:hover:bg-[#19243D] border border-slate-200 dark:border-white/[0.08] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Inline Camera Viewfinder */}
            {cameraOpen && (
              <div className="mx-4 mb-2 rounded-2xl overflow-hidden bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-white/15 p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-medium">Tomar foto del recibo o apunte</span>
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-52 rounded-xl bg-black object-cover"
                />
                <button
                  type="button"
                  onClick={() => void handleCapturePhoto()}
                  className="w-full py-2 rounded-xl bg-[#5B3DF5] hover:bg-[#6D52F7] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  Capturar foto
                </button>
              </div>
            )}

            {/* Media / Permission Notice */}
            {mediaNotice && (
              <div
                role="alert"
                className="mx-4 mb-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-start justify-between gap-2"
              >
                <span>{mediaNotice}</span>
                <button
                  type="button"
                  onClick={() => setMediaNotice(null)}
                  aria-label="Cerrar aviso"
                  className="text-amber-700 hover:text-amber-950 dark:text-amber-300 dark:hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Pending Attachment Preview */}
            {pendingAttachment && (
              <div className="mx-4 mb-2 rounded-xl bg-white dark:bg-[#0D1424] border border-[#5B3DF5]/35 dark:border-[#5B3DF5]/40 p-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {pendingAttachment.kind === 'image' ? (
                    <img
                      src={pendingAttachment.previewUrl}
                      alt="Vista previa adjunta"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#5B3DF5]/15 dark:bg-[#5B3DF5]/20 border border-[#5B3DF5]/30 dark:border-[#5B3DF5]/40 flex items-center justify-center shrink-0">
                      <FileAudio className="w-5 h-5 text-[#5B3DF5] dark:text-[#A28BFF]" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {pendingAttachment.fileName}
                    </p>
                    {pendingAttachment.kind === 'audio' ? (
                      <audio
                        controls
                        src={pendingAttachment.previewUrl}
                        className="w-full h-7 mt-1"
                      />
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Lista para analizar. Presiona enviar.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => clearPendingAttachment(true)}
                  aria-label="Quitar archivo adjunto"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/[0.06] cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Active Voice Recording Bar */}
            {isRecording && (
              <div className="mx-4 mb-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/35 px-3.5 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-medium text-rose-800 dark:text-rose-200">
                    Grabando nota de voz
                  </span>
                  <span className="text-xs font-mono tabular-nums text-rose-600 dark:text-rose-300">
                    {formatRecordingTimer(recordingSeconds)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStopRecording(true)}
                    className="text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/[0.06] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStopRecording(false)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Square className="w-3 h-3 fill-current" aria-hidden="true" />
                    Detener
                  </button>
                </div>
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void handleImageFileSelected(e)}
              className="hidden"
            />
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => void handleAudioFileSelected(e)}
              className="hidden"
            />

            {/* Input Form & Multimodal Toolbar */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0D1424]/90 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isLoading || isRecording}
                    title="Subir imagen de ticket, recibo o apunte"
                    aria-label="Subir imagen"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#11192C] dark:hover:bg-[#19243D] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-45"
                  >
                    <ImagePlus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                    <span>Imagen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleOpenCamera()}
                    disabled={isLoading || isRecording}
                    title="Tomar foto con cámara"
                    aria-label="Usar cámara"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#11192C] dark:hover:bg-[#19243D] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-45"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                    <span className="hidden sm:inline">Cámara</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      isRecording ? handleStopRecording(false) : void handleStartRecording()
                    }
                    disabled={isLoading}
                    title={isRecording ? 'Detener grabación' : 'Grabar nota de voz'}
                    aria-label={isRecording ? 'Detener grabación' : 'Grabar nota de voz'}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer disabled:opacity-45 ${
                      isRecording
                        ? 'bg-rose-50 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-200'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#11192C] dark:hover:bg-[#19243D] border-slate-200 dark:border-white/[0.08] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>{isRecording ? 'Grabando...' : 'Voz'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isLoading || isRecording}
                    title="Cargar archivo de audio"
                    aria-label="Subir archivo de audio"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#11192C] dark:hover:bg-[#19243D] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-45"
                  >
                    <FileAudio className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    <span className="hidden sm:inline">Audio</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading || isRecording}
                  placeholder={
                    pendingAttachment
                      ? 'Agrega una nota opcional o envía directamente...'
                      : 'Ej: Gasté 15.000 en café hoy...'
                  }
                  aria-label="Escribe tu mensaje para el asistente"
                  className="flex-1 bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-white/10 focus:border-[#5B3DF5] rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isLoading || isRecording || (!inputValue.trim() && !pendingAttachment)}
                  aria-label="Enviar mensaje"
                  className="px-3.5 py-2.5 rounded-xl bg-[#5B3DF5] hover:bg-[#6D52F7] disabled:opacity-45 disabled:hover:bg-[#5B3DF5] text-white transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-md shadow-[#5B3DF5]/25"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
