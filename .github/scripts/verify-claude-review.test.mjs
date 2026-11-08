import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import { test } from "node:test";

const script = fileURLToPath(new URL("./verify-claude-review.mjs", import.meta.url));

const cases = [
  { name: "workflow validation skip with a green action but no execution outputs", outcome: "success", trace: null },
  { name: "a reported success without an execution file", outcome: "success", trace: null },
  { name: "an empty execution trace", outcome: "success", trace: [] },
  { name: "a malformed execution trace", outcome: "success", trace: "not JSON" },
  { name: "an unfinished execution", outcome: "success", trace: [{ type: "assistant" }] },
  {
    name: "an errored final result despite a success subtype",
    outcome: "success",
    trace: [{ type: "result", subtype: "success", is_error: true }],
  },
  {
    name: "a final failure after an earlier success",
    outcome: "success",
    trace: [
      { type: "result", subtype: "success", is_error: false },
      { type: "result", subtype: "error_during_execution", is_error: true },
    ],
  },
  {
    name: "a failed action even when a successful trace exists",
    outcome: "failure",
    trace: [{ type: "result", subtype: "success", is_error: false }],
  },
  {
    name: "a completed successful execution",
    outcome: "success",
    trace: [{ type: "result", subtype: "success", is_error: false }],
    expectedSuccess: true,
  },
];

for (const { name, outcome, trace, expectedSuccess = false } of cases) {
  test(name, () => {
    const dir = mkdtempSync(join(tmpdir(), "claude-review-"));
    try {
      const path = join(dir, "execution.json");
      if (trace !== null) writeFileSync(path, typeof trace === "string" ? trace : JSON.stringify(trace));
      const result = spawnSync(process.execPath, [script], {
        env: { ...process.env, CLAUDE_OUTCOME: outcome, CLAUDE_EXECUTION_FILE: trace === null ? "" : path },
        encoding: "utf8",
      });

      assert.equal(result.status, expectedSuccess ? 0 : 1, result.stderr);
      if (!expectedSuccess) assert.match(result.stderr, /Claude did not complete a review/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
