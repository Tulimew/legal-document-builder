export type PublishingWorkerLoop = { runOnce(): Promise<boolean> };

export type WorkerLoopOptions = {
  pollIntervalMs: number;
  idleBackoffMs: number;
  maxConsecutiveErrors: number;
  signal: AbortSignal;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  log?: (event: Record<string, unknown>) => void;
};

export function interruptibleSleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(done, milliseconds);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Publishing worker error";
  return message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]").replace(/[\r\n]+/g, " ").slice(0, 300);
}

export async function runPublishingWorkerLoop(worker: PublishingWorkerLoop, options: WorkerLoopOptions): Promise<number> {
  const sleep = options.sleep ?? interruptibleSleep;
  const log = options.log ?? (() => undefined);
  let consecutiveErrors = 0;
  log({ event: "publishing_worker_started" });
  while (!options.signal.aborted) {
    try {
      const processed = await worker.runOnce();
      consecutiveErrors = 0;
      if (processed) log({ event: "publishing_job_processed" });
      await sleep(processed ? options.pollIntervalMs : options.idleBackoffMs, options.signal);
    } catch (error) {
      consecutiveErrors += 1;
      log({ event: "publishing_worker_iteration_failed", consecutiveErrors, message: safeMessage(error) });
      if (consecutiveErrors >= options.maxConsecutiveErrors) {
        log({ event: "publishing_worker_stopped", reason: "consecutive_error_limit" });
        return 1;
      }
      await sleep(options.idleBackoffMs, options.signal);
    }
  }
  log({ event: "publishing_worker_stopped", reason: "shutdown_signal" });
  return 0;
}
