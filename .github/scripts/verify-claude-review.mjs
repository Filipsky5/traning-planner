import { readFileSync } from "node:fs";
import { error, log } from "node:console";
import process from "node:process";

let completed = false;

if (process.env.CLAUDE_OUTCOME === "success" && process.env.CLAUDE_EXECUTION_FILE) {
  try {
    const messages = JSON.parse(readFileSync(process.env.CLAUDE_EXECUTION_FILE, "utf8"));
    const result = Array.isArray(messages) ? messages.findLast((message) => message?.type === "result") : null;
    completed = result?.subtype === "success" && !result.is_error;
  } catch {
    // An absent or unreadable trace cannot establish that Claude completed the review.
  }
}

if (!completed) {
  error(
    "::error::Claude did not complete a review. The action may have skipped execution (for example, because this workflow differs from the default branch)."
  );
  process.exitCode = 1;
} else {
  log("Verified Claude's successful execution result.");
}
