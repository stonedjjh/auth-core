/**
 * Cola de Correos en Segundo Plano No Bloqueante con Reintento Exponencial
 * Garantiza que la respuesta HTTP al usuario sea instantánea (< 50ms)
 * mientras el envío SMTP se procesa de forma asíncrona sin bloquear el hilo principal.
 */

import { EmailMessage, EmailProvider } from '../adapters/email.adapter.js';

export interface EmailJob {
  id: string;
  message: EmailMessage;
  attempts: number;
  maxAttempts: number;
  baseDelayMs: number;
}

export class BackgroundEmailQueue {
  private queue: EmailJob[] = [];
  private isProcessing: boolean = false;
  private emailProvider: EmailProvider;

  // Parámetros de reintento configurables
  public defaultMaxAttempts: number = 3;
  public defaultBaseDelayMs: number = 1000; // 1s, 2s, 4s

  constructor(emailProvider: EmailProvider) {
    this.emailProvider = emailProvider;
  }

  /**
   * Encola un mensaje para despacho asíncrono inmediato
   */
  enqueue(message: EmailMessage, maxAttempts = this.defaultMaxAttempts, baseDelayMs = this.defaultBaseDelayMs): string {
    const jobId = Math.random().toString(36).substring(2, 10);
    const job: EmailJob = {
      id: jobId,
      message,
      attempts: 0,
      maxAttempts,
      baseDelayMs,
    };

    this.queue.push(job);
    this.processQueue();
    return jobId;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      await this.executeJobWithRetry(job);
    }

    this.isProcessing = false;
  }

  private async executeJobWithRetry(job: EmailJob): Promise<void> {
    while (job.attempts < job.maxAttempts) {
      job.attempts++;
      try {
        await this.emailProvider.send(job.message);
        return; // Éxito
      } catch (err: any) {
        console.error(`[EmailQueue] Intento ${job.attempts}/${job.maxAttempts} fallido para ${job.message.to}:`, err.message || err);

        if (job.attempts < job.maxAttempts) {
          // Retroceso exponencial: baseDelay * 2^(intento - 1) -> 1s, 2s, 4s...
          const delay = job.baseDelayMs * Math.pow(2, job.attempts - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(`[EmailQueue] Fallo definitivo tras ${job.maxAttempts} intentos para ${job.message.to}.`);
        }
      }
    }
  }

  /**
   * Retorna el número de correos en espera de procesamiento
   */
  get pendingCount(): number {
    return this.queue.length;
  }
}
