import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("publishing request only enqueues and independent entrypoint owns scheduling", () => {
  const route = readFileSync(path.resolve("src/app/api/v1/projects/[projectId]/publishing-jobs/route.ts"), "utf8");
  const entrypoint = readFileSync(path.resolve("scripts/run-publishing-worker.ts"), "utf8");
  assert.doesNotMatch(route, /PublishingWorker|runOnce|publishingStorage/);
  assert.match(entrypoint, /runPublishingWorkerLoop/);
  assert.match(entrypoint, /SIGINT/);
  assert.match(entrypoint, /SIGTERM/);
});
