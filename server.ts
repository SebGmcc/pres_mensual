/// <reference types="node" />
import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  GoogleGenAI,
  Type,
  type Content,
  type FunctionDeclaration,
  type Part,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Lista priorizada exclusiva de modelos Flash gratuitos y activos
const MODEL_CASCADE = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
] as const;

const TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';

function parseCopAmount(raw: unknown): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? Math.round(raw) : 0;
  }
  if (typeof raw === 'string') {
    const cleaned = raw.trim().replace(/[^\d.,]/g, '');
    if (!cleaned) return 0;
    // Si tiene formato colombiano tipo "25.000" o "1.200.000", quitar separadores de miles
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      return Number(cleaned.replace(/\./g, '')) || 0;
    }
    if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
      return Number(cleaned.replace(/,/g, '')) || 0;
    }
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num) ? Math.round(num) : 0;
  }
  return 0;
}

const registerExpenseDeclaration: FunctionDeclaration = {
  name: 'registerExpense',
  description:
    'Registra un nuevo gasto financiero del usuario en su presupuesto mensual. Usar únicamente cuando todos los datos obligatorios (monto, fecha, descripción y categoría) estén confirmados o claros.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: {
        type: Type.NUMBER,
        description:
          'Monto numérico positivo del gasto en pesos colombianos (COP), sin puntos ni símbolos. Ej: 500 o 25000.',
      },
      date: {
        type: Type.STRING,
        description:
          'Fecha del gasto en formato estricto YYYY-MM-DD. Si el usuario dice "hoy", usa la fecha actual del contexto.',
      },
      description: {
        type: Type.STRING,
        description:
          'Descripción breve y clara del gasto (ej: "Almuerzo", "Comida", "Taxi al trabajo", "Recarga celular").',
      },
      category: {
        type: Type.STRING,
        description:
          'Categoría del gasto. Debe ser exactamente una de: "Alimentación", "Transporte", "Servicios públicos", "Ropa y compras personales", "Entretenimiento y ocio".',
      },
    },
    required: ['amount', 'date', 'description', 'category'],
  },
};

interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

interface AttachmentPayload {
  kind: 'image' | 'audio';
  mimeType: string;
  data: string;
  fileName?: string;
}

interface BudgetContextPayload {
  userName?: string;
  monthLabel?: string;
  monthlyBudget?: number;
  totalIncome?: number;
  effectiveBudget?: number;
  totalSpent?: number;
  availableBalance?: number;
  currentDateIso?: string;
  expensesCount?: number;
}

interface ExtractedFunctionCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

interface ClassifiedError {
  status: number;
  code: string;
  technicalMessage: string;
  shouldFallback: boolean;
}

function classifyGeminiError(err: unknown): ClassifiedError {
  const errObj = err as {
    status?: number;
    statusCode?: number;
    code?: number | string;
    message?: string;
    error?: { code?: number; status?: string; message?: string };
    response?: { status?: number };
  };

  const rawMessage =
    errObj?.error?.message ||
    errObj?.message ||
    (typeof err === 'string' ? err : 'Error desconocido al consultar Gemini.');

  const numericStatus =
    errObj?.status ||
    errObj?.statusCode ||
    errObj?.response?.status ||
    (typeof errObj?.error?.code === 'number' ? errObj.error.code : undefined) ||
    (typeof errObj?.code === 'number' ? errObj.code : undefined);

  const upperMsg = rawMessage.toUpperCase();
  const statusStr = String(errObj?.error?.status || '').toUpperCase();

  if (
    numericStatus === 429 ||
    upperMsg.includes('429') ||
    upperMsg.includes('RESOURCE_EXHAUSTED') ||
    upperMsg.includes('QUOTA') ||
    statusStr === 'RESOURCE_EXHAUSTED'
  ) {
    return {
      status: 429,
      code: 'QUOTA_EXCEEDED',
      technicalMessage: rawMessage,
      shouldFallback: true,
    };
  }

  if (
    numericStatus === 503 ||
    upperMsg.includes('503') ||
    upperMsg.includes('UNAVAILABLE') ||
    upperMsg.includes('OVERLOADED') ||
    upperMsg.includes('HIGH DEMAND') ||
    statusStr === 'UNAVAILABLE'
  ) {
    return {
      status: 503,
      code: 'HIGH_DEMAND',
      technicalMessage: rawMessage,
      shouldFallback: true,
    };
  }

  if (
    numericStatus === 404 ||
    upperMsg.includes('404') ||
    upperMsg.includes('NOT_FOUND') ||
    statusStr === 'NOT_FOUND'
  ) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      technicalMessage: rawMessage,
      shouldFallback: true,
    };
  }

  return {
    status: numericStatus && numericStatus >= 400 ? numericStatus : 500,
    code: 'GEMINI_ERROR',
    technicalMessage: rawMessage,
    shouldFallback: false,
  };
}

function sendAssistantError(
  res: Response,
  payload: {
    error: string;
    status: number;
    technicalMessage: string;
    attempts?: Array<{ model: string; status: number; code: string; message: string }>;
  }
) {
  // El proxy nginx del entorno intercepta 403, 502, 503 y 504 reemplazando el JSON con HTML (/warmup.html o /forbidden.html).
  // Enviamos HTTP 200 con ok: false y el status real en el JSON para preservar el error exacto en el cliente.
  const interceptedByProxy = [403, 502, 503, 504].includes(payload.status);
  const httpStatus = interceptedByProxy ? 200 : payload.status;
  return res.status(httpStatus).json({
    ok: false,
    ...payload,
  });
}

function formatServerCOP(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted} COP`;
}

function buildSystemInstruction(context: BudgetContextPayload): string {
  const userName = (context.userName || 'Usuario').trim() || 'Usuario';
  const todayIso = context.currentDateIso || '2026-11-24';
  const monthLabel = context.monthLabel || 'Noviembre 2026';
  const monthlyBudget = formatServerCOP(Number(context.monthlyBudget ?? 3200000));
  const totalIncome = formatServerCOP(Number(context.totalIncome ?? 0));
  const effectiveBudget = formatServerCOP(Number(context.effectiveBudget ?? 3200000));
  const totalSpent = formatServerCOP(Number(context.totalSpent ?? 0));
  const availableBalance = formatServerCOP(Number(context.availableBalance ?? 3200000));
  const expensesCount = Number(context.expensesCount ?? 0);

  return [
    'Eres un asistente experto en finanzas personales integrado en "Mi Presupuesto Mensual".',
    'Responde siempre en español, de forma breve, amable, clara y práctica.',
    '',
    'Contexto financiero actual del usuario (moneda: pesos colombianos COP):',
    `- Nombre del usuario: ${userName}`,
    `- Mes activo: ${monthLabel}`,
    `- Fecha actual de referencia ("hoy"): ${todayIso}`,
    `- Presupuesto base asignado: ${monthlyBudget}`,
    `- Ingresos adicionales del mes: ${totalIncome}`,
    `- Presupuesto total disponible: ${effectiveBudget}`,
    `- Total gastado hasta ahora: ${totalSpent} (${expensesCount} gastos registrados)`,
    `- Saldo disponible para gastar: ${availableBalance}`,
    '',
    'Reglas importantes:',
    '1. Cuando el usuario exprese que gastó, pagó o compró algo con monto, descripción y fecha claros (o deducibles del contexto como "hoy"), DEBES invocar la herramienta registerExpense en ese mismo turno con los 4 parámetros exactos (amount, date, description, category). NUNCA digas que guardaste o registraste un gasto sin haber invocado la herramienta registerExpense.',
    '2. Si el usuario no menciona la fecha o dice "hoy", usa exactamente la fecha de referencia actual (' +
      todayIso +
      ').',
    '3. Mapea la categoría exclusivamente a una de estas 5 opciones exactas: "Alimentación", "Transporte", "Servicios públicos", "Ropa y compras personales", "Entretenimiento y ocio".',
    '4. Confirma siempre de manera concisa los datos del gasto (monto en COP, descripción, categoría y fecha) al usar la función, o pide únicamente el dato faltante si el monto o la descripción no están claros.',
    '5. Si el usuario pregunta por su presupuesto, saldo o gastos, responde usando exactamente los valores reales del contexto.',
    '',
    'Capacidades multimodales (Imagen y Audio) y Reglas adicionales:',
    '- Imagen: al recibir un ticket, recibo, captura de compra o apunte de gasto, extrae monto, fecha y descripción (además de su categoría). Si la imagen es borrosa, algún dato no se ve o está dudoso, pregunta al usuario antes de guardar; NO inventes información ni asumas datos faltantes.',
    '- Audio: al recibir una nota de voz o archivo de audio, transcríbelo y extrae monto, fecha y descripción (además de su categoría). Si falta algún dato o no es claro, solicita aclaración antes de guardar; NO inventes datos.',
    '- Validación de contenido: si la imagen o el audio no tiene que ver con gastos o finanzas de "Mi Presupuesto Mensual", responde amablemente que no puedes procesarlo ni registrarlo.',
    '- Reglas de registro y contexto dinámico:',
    '  * Usa siempre la herramienta registerExpense únicamente para guardar datos confirmados y completos.',
    `  * Al finalizar un registro, dirígete al usuario por su nombre (${userName}), por ejemplo: "¡Listo, ${userName}! He guardado tu gasto...".`,
    `  * Para consultas de compras (por ejemplo "¿me alcanza para...?" o "¿puedo comprar...?"), compara el valor solicitado con el saldo disponible actual (${availableBalance}) e indica cuánto le quedaría o cuánto le faltaría.`,
    `  * Utiliza siempre la fecha actual (${todayIso}), el nombre del usuario (${userName}) y el saldo disponible (${availableBalance}) proporcionados en cada mensaje.`,
  ].join('\n');
}

async function transcribeAudioBuffer(
  ai: GoogleGenAI,
  mimeType: string,
  base64Data: string
): Promise<{ transcript: string | null; fatalError: ClassifiedError | null }> {
  try {
    const response = await ai.models.generateContent({
      model: TRANSCRIBE_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: 'Transcribe exactamente este audio en español. Si no hay voz audible o es solo ruido, responde únicamente "[AUDIO_SIN_VOZ]".',
          },
        ],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .map((p) => (typeof p.text === 'string' ? p.text.trim() : ''))
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      transcript: text || null,
      fatalError: null,
    };
  } catch (err) {
    const classified = classifyGeminiError(err);
    console.warn(
      `[Assistant] Transcripción con ${TRANSCRIBE_MODEL} falló (${classified.status} ${classified.code}). Se intentará procesar audio directamente en la cascada.`
    );
    return {
      transcript: null,
      fatalError: null,
    };
  }
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return sendAssistantError(res, {
          error: 'MISSING_API_KEY',
          status: 500,
          technicalMessage:
            'No se encontró la clave GEMINI_API_KEY configurada en el servidor.',
        });
      }

      const body = (req.body ?? {}) as {
        message?: unknown;
        history?: unknown;
        attachment?: unknown;
        budgetContext?: BudgetContextPayload;
      };

      const message = typeof body.message === 'string' ? body.message.trim() : '';

      let attachment: AttachmentPayload | null = null;
      if (body.attachment && typeof body.attachment === 'object') {
        const rawAtt = body.attachment as Record<string, unknown>;
        const kind = rawAtt.kind;
        const mimeType = typeof rawAtt.mimeType === 'string' ? rawAtt.mimeType.trim() : '';
        const data = typeof rawAtt.data === 'string' ? rawAtt.data.trim() : '';
        const fileName =
          typeof rawAtt.fileName === 'string' ? rawAtt.fileName.trim() : undefined;

        if ((kind === 'image' || kind === 'audio') && mimeType && data) {
          attachment = { kind, mimeType, data, fileName };
        }
      }

      if (!message && !attachment) {
        return sendAssistantError(res, {
          error: 'INVALID_REQUEST',
          status: 400,
          technicalMessage: 'Debes enviar un mensaje, una imagen o un audio.',
        });
      }

      const rawHistory = Array.isArray(body.history) ? body.history : [];
      const historyContents: Content[] = rawHistory
        .filter(
          (item): item is ChatHistoryItem =>
            Boolean(item) &&
            typeof item === 'object' &&
            (item.role === 'user' || item.role === 'model') &&
            typeof item.text === 'string' &&
            item.text.trim().length > 0
        )
        .slice(-12)
        .map((item) => ({
          role: item.role,
          parts: [{ text: item.text }],
        }));

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let audioTranscript: string | null = null;
      const userParts: Part[] = [];

      if (attachment?.kind === 'image') {
        userParts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data,
          },
        });
        userParts.push({
          text:
            message ||
            'Analiza esta imagen. Si corresponde a un ticket, recibo, captura de compra o apunte de gasto, extrae monto, fecha y descripción. Si falta algún dato o está borroso, pregúntame antes de registrar. Si no tiene que ver con gastos o finanzas, indícalo.',
        });
      } else if (attachment?.kind === 'audio') {
        const transcription = await transcribeAudioBuffer(
          ai,
          attachment.mimeType,
          attachment.data
        );

        if (transcription.fatalError) {
          return sendAssistantError(res, {
            error: transcription.fatalError.code,
            status: transcription.fatalError.status,
            technicalMessage: transcription.fatalError.technicalMessage,
          });
        }

        if (
          transcription.transcript &&
          transcription.transcript !== '[AUDIO_SIN_VOZ]'
        ) {
          audioTranscript = transcription.transcript;
          userParts.push({
            text: [
              `Transcripción de la nota de voz del usuario: "${audioTranscript}"`,
              message ? `Nota adicional del usuario: "${message}"` : '',
              'Extrae monto, fecha y descripción si es un gasto de Mi Presupuesto. Si falta algún dato, pregunta antes de guardar. Si no tiene relación con gastos o finanzas, indica que no puedes registrarlo.',
            ]
              .filter(Boolean)
              .join('\n'),
          });
        } else {
          // Respaldo multimodal directo enviando el audio al modelo en cascada
          userParts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.data,
            },
          });
          userParts.push({
            text:
              message ||
              'Escucha y transcribe esta nota de voz. Si describe un gasto, extrae monto, fecha y descripción. Si falta algún dato o no se entiende, pregunta antes de guardar. Si no tiene relación con gastos o finanzas, indica que no puedes registrarlo.',
          });
        }
      } else {
        userParts.push({ text: message });
      }

      const contents: Content[] = [
        ...historyContents,
        {
          role: 'user',
          parts: userParts,
        },
      ];

      const budgetContext = body.budgetContext ?? {};
      const userName = (budgetContext.userName || 'Usuario').trim() || 'Usuario';
      const systemInstruction = buildSystemInstruction(budgetContext);
      let lastError: ClassifiedError | null = null;
      const attempts: Array<{ model: string; status: number; code: string; message: string }> = [];

      const modelsToTry = [...MODEL_CASCADE];
      const maxPasses = 1;

      for (let pass = 0; pass < maxPasses; pass += 1) {
        if (pass > 0) {
          await new Promise((resolve) => setTimeout(resolve, 750));
        }

        let sawTransient503 = false;

        for (const model of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction,
                tools: [{ functionDeclarations: [registerExpenseDeclaration] }],
              },
            });

            // Extracción robusta manual desde response.candidates[0].content.parts
            const parts = response.candidates?.[0]?.content?.parts ?? [];
            const textSegments: string[] = [];
            const functionCalls: ExtractedFunctionCall[] = [];

            for (const part of parts) {
              if (typeof part.text === 'string' && part.text.trim().length > 0) {
                textSegments.push(part.text.trim());
              }
              if (part.functionCall && typeof part.functionCall.name === 'string') {
                const rawArgs = (part.functionCall.args ?? {}) as Record<string, unknown>;
                const normalizedArgs: Record<string, unknown> = { ...rawArgs };
                if (part.functionCall.name === 'registerExpense') {
                  normalizedArgs.amount = parseCopAmount(rawArgs.amount);
                }
                functionCalls.push({
                  id: part.functionCall.id,
                  name: part.functionCall.name,
                  args: normalizedArgs,
                });
              }
            }

            // Respaldo con getter response.functionCalls si no vino en parts
            if (functionCalls.length === 0 && Array.isArray(response.functionCalls)) {
              for (const fc of response.functionCalls) {
                if (fc && typeof fc.name === 'string') {
                  const rawArgs = (fc.args ?? {}) as Record<string, unknown>;
                  const normalizedArgs: Record<string, unknown> = { ...rawArgs };
                  if (fc.name === 'registerExpense') {
                    normalizedArgs.amount = parseCopAmount(rawArgs.amount);
                  }
                  functionCalls.push({
                    id: fc.id,
                    name: fc.name,
                    args: normalizedArgs,
                  });
                }
              }
            }

            let replyText = textSegments.join('\n\n').trim();
            if (!replyText && functionCalls.length > 0) {
              const firstCall = functionCalls[0];
              if (firstCall.name === 'registerExpense') {
                const amountNum = parseCopAmount(firstCall.args.amount);
                const desc = String(firstCall.args.description ?? 'Gasto');
                const cat = String(firstCall.args.category ?? 'Alimentación');
                const dateStr = String(firstCall.args.date ?? '');
                replyText = `¡Listo, ${userName}! He guardado tu gasto de ${formatServerCOP(
                  amountNum
                )} en "${desc}" (${cat}${dateStr ? ` · ${dateStr}` : ''}).`;
              }
            }

            if (!replyText && functionCalls.length === 0) {
              replyText =
                'No pude generar una respuesta en este momento. ¿Puedes intentarlo de nuevo?';
            }

            console.log(
              `[Assistant] Respuesta exitosa con ${model} | textLen=${replyText.length} | functionCalls=${functionCalls.length}`
            );

            return res.json({
              ok: true,
              replyText,
              functionCalls,
              transcript: audioTranscript,
              modelUsed: model,
            });
          } catch (err) {
            const classified = classifyGeminiError(err);
            lastError = classified;
            if (classified.status === 503) {
              sawTransient503 = true;
            }
            attempts.push({
              model,
              status: classified.status,
              code: classified.code,
              message: classified.technicalMessage,
            });

            if (classified.shouldFallback) {
              console.warn(
                `[Assistant] Modelo ${model} falló (${classified.status} ${classified.code}). Intentando siguiente modelo en cascada...`
              );
              continue;
            }

            return sendAssistantError(res, {
              error: classified.code,
              status: classified.status,
              technicalMessage: classified.technicalMessage,
              attempts,
            });
          }
        }

        if (!sawTransient503) {
          break;
        }
      }

      const finalStatus = lastError?.status ?? 503;
      const finalCode = lastError?.code ?? 'ALL_MODELS_FAILED';
      const finalTechnical =
        lastError?.technicalMessage ??
        'Todos los modelos de la cascada fallaron al procesar la solicitud.';

      return sendAssistantError(res, {
        error: finalCode,
        status: finalStatus,
        technicalMessage: finalTechnical,
        attempts,
      });
    } catch (unexpectedErr) {
      const msg =
        unexpectedErr instanceof Error
          ? unexpectedErr.message
          : 'Error interno inesperado en el servidor.';
      return sendAssistantError(res, {
        error: 'INTERNAL_SERVER_ERROR',
        status: 500,
        technicalMessage: msg,
      });
    }
  });

  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'API_ROUTE_NOT_FOUND',
      status: 404,
      technicalMessage: `Ruta API no encontrada: ${req.method} ${req.originalUrl}`,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
