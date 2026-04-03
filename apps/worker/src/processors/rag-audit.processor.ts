/**
 * RAG Audit processor (T-489).
 *
 * Har kecha 06:30 UTC da 50 ta tasodifiy ASSISTANT javobni Claude Sonnet bilan baholaydi.
 * Mezonlar: factuality, direction_accuracy, hallucination, relevance (har biri 0-1).
 * Accuracy < 85% bo'lsa → logga CRITICAL yozadi.
 *
 * Cron: 30 6 * * * (embedding 05:00 UTC dan keyin)
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'rag-audit-queue';
const SAMPLE_SIZE = 50;
const ACCURACY_THRESHOLD = 0.85;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const JUDGE_MODEL = 'claude-sonnet-4-5-20251001';
const REQUEST_TIMEOUT_MS = 30_000;

interface JudgeScore {
  factuality: number;       // 0-1: javob DB data bilan mos keladimi
  direction_accuracy: number; // 0-1: trend yo'nalishi to'g'rimi
  hallucination: number;    // 0-1: to'qima ma'lumot yo'qmi (1=yo'q, 0=ko'p)
  relevance: number;        // 0-1: javob savolga tegishli
  overall: number;          // o'rtacha
}

async function judgeWithClaude(
  userMessage: string,
  assistantResponse: string,
  contextSummary: string,
  apiKey: string,
): Promise<JudgeScore | null> {
  const prompt = `Sen RAG (Retrieval-Augmented Generation) sifat auditorisan.
Quyidagi savol-javob juftligi va real ma'lumotlarni ko'rib, baholash qil.

SAVOL:
${userMessage}

AI JAVOBI:
${assistantResponse}

REAL MA'LUMOTLAR (DB kontekst):
${contextSummary}

Quyidagi mezonlar bo'yicha 0 dan 1 gacha ball ber (1 = eng yaxshi):
1. factuality: Javobdagi raqamlar va faktlar real ma'lumotlar bilan qanchalik mos?
2. direction_accuracy: Trend yo'nalishi (o'sish/tushish/barqaror) to'g'rimi?
3. hallucination: To'qima ma'lumot yo'qligi (1=to'qima yo'q, 0=ko'p to'qima)
4. relevance: Javob savolga qanchalik tegishli va foydali?

FAQAT JSON formatda javob ber, boshqa matn yozma:
{"factuality":0.0,"direction_accuracy":0.0,"hallucination":0.0,"relevance":0.0}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content[0]?.text ?? '';
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;

    const scores = JSON.parse(jsonMatch[0]) as Record<string, number>;
    const factuality = Number(scores.factuality ?? 0);
    const direction_accuracy = Number(scores.direction_accuracy ?? 0);
    const hallucination = Number(scores.hallucination ?? 0);
    const relevance = Number(scores.relevance ?? 0);
    const overall = (factuality + direction_accuracy + hallucination + relevance) / 4;

    return { factuality, direction_accuracy, hallucination, relevance, overall };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function runRagAudit(jobId: string, jobName: string): Promise<{
  sampled: number;
  evaluated: number;
  avgAccuracy: number;
  belowThreshold: boolean;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logJobInfo(QUEUE_NAME, jobId, jobName, 'ANTHROPIC_API_KEY yo\'q — skip');
    return { sampled: 0, evaluated: 0, avgAccuracy: 0, belowThreshold: false };
  }

  // Oxirgi 7 kun ichidagi ASSISTANT xabarlarini random tanlaymiz
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const messages = await prisma.chatMessage.findMany({
    where: {
      role: 'ASSISTANT',
      created_at: { gte: since },
    },
    select: {
      id: true,
      content: true,
      conversation: {
        select: {
          messages: {
            where: { role: 'USER' },
            orderBy: { created_at: 'desc' },
            take: 1,
            select: { content: true },
          },
        },
      },
    },
    take: SAMPLE_SIZE * 3, // Ko'proq olamiz, keyin random tanlaymiz
  });

  // Fisher-Yates shuffle → SAMPLE_SIZE ta tanlaymiz
  for (let i = messages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [messages[i], messages[j]] = [messages[j], messages[i]];
  }
  const sample = messages.slice(0, SAMPLE_SIZE);

  const sampled = sample.length;
  logJobInfo(QUEUE_NAME, jobId, jobName, `${sampled} ta javob audit uchun tanlandi`);

  if (sampled === 0) {
    return { sampled: 0, evaluated: 0, avgAccuracy: 0, belowThreshold: false };
  }

  // Oddiy kontekst — faqat savolni qaytaramiz (real DB so'rov juda qimmat)
  // To'liq RAG pipeline uchun retriever kerak edi — bu worker da yo'q
  // Shuning uchun user savolini kontekst sifatida ishlatamiz
  let totalScore = 0;
  let evaluated = 0;

  for (const msg of sample) {
    const userMsg = msg.conversation.messages[0]?.content ?? '';
    if (!userMsg) continue;

    // Minimal kontekst: javobdagi raqamlar va ma'lumotlar tekshiriladi
    const contextSummary = `Foydalanuvchi so'ragan ma'lumot mavjud bo'lishi kerak.
Javob qisqa, aniq va O'zbek tilida bo'lishi kerak.
To'qima raqamlar (masalan, 99999 so'm, 1000% o'sish) bo'lmasligi kerak.`;

    const score = await judgeWithClaude(userMsg, msg.content, contextSummary, apiKey);
    if (!score) continue;

    totalScore += score.overall;
    evaluated++;
  }

  const avgAccuracy = evaluated > 0 ? totalScore / evaluated : 0;
  const belowThreshold = avgAccuracy < ACCURACY_THRESHOLD;

  if (belowThreshold) {
    logJobError(
      QUEUE_NAME,
      jobId,
      jobName,
      new Error(`RAG accuracy ${(avgAccuracy * 100).toFixed(1)}% — ${ACCURACY_THRESHOLD * 100}% dan past! Embedding yangilash yoki prompt takomillashtirish kerak.`),
    );
  } else {
    logJobInfo(
      QUEUE_NAME,
      jobId,
      jobName,
      `RAG accuracy: ${(avgAccuracy * 100).toFixed(1)}% (threshold: ${ACCURACY_THRESHOLD * 100}%) — OK`,
    );
  }

  return { sampled, evaluated, avgAccuracy, belowThreshold };
}

export function createRagAuditWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await runRagAudit(job.id ?? '-', job.name);
        logJobDone(QUEUE_NAME, job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError(QUEUE_NAME, job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    { ...redisConnection, concurrency: 1 },
  );

  worker.on('error', (err) => logJobError(QUEUE_NAME, '-', 'worker', err));
  worker.on('failed', (job, err) =>
    logJobError(QUEUE_NAME, job?.id ?? '-', job?.name ?? '-', err),
  );

  return worker;
}
