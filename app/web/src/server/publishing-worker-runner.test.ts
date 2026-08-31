import assert from "node:assert/strict";
import test from "node:test";

import { runPublishingWorkerLoop } from "./publishing-worker-runner";

test("worker loop polls, backs off and stops gracefully", async () => {
  const controller = new AbortController();
  const results = [true, false];
  const delays: number[] = [];
  const events: Array<Record<string, unknown>> = [];
  const exitCode = await runPublishingWorkerLoop(
    { runOnce: async () => results.shift() ?? false },
    {
      pollIntervalMs: 100,
      idleBackoffMs: 500,
      maxConsecutiveErrors: 3,
      signal: controller.signal,
      sleep: async (milliseconds) => { delays.push(milliseconds); if (delays.length === 2) controller.abort(); },
      log: (event) => events.push(event),
    },
  );
  assert.equal(exitCode, 0);
  assert.deepEqual(delays, [100, 500]);
  assert.deepEqual(events.map((event) => event.event), ["publishing_worker_started", "publishing_job_processed", "publishing_worker_stopped"]);
});

test("worker loop bounds repeated errors and redacts database URL", async () => {
  const events: Array<Record<string, unknown>> = [];
  const exitCode = await runPublishingWorkerLoop(
    { runOnce: async () => { throw new Error("failed postgresql://user:password@host/database"); } },
    {
      pollIntervalMs: 100,
      idleBackoffMs: 100,
      maxConsecutiveErrors: 2,
      signal: new AbortController().signal,
      sleep: async () => undefined,
      log: (event) => events.push(event),
    },
  );
  assert.equal(exitCode, 1);
  assert.equal(events.filter((event) => event.event === "publishing_worker_iteration_failed").length, 2);
  assert.doesNotMatch(JSON.stringify(events), /user:password|host\/database/);
});
