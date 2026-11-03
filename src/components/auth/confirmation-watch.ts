// The clock behind the Check inbox page moving on by itself when the
// confirmation link is opened in another tab. Pure, so it can be driven
// with fake timers: the component in confirmation-watcher.tsx wires it to
// the document. It polls while the tab is visible, checks once more as
// soon as the tab regains focus, and gives up for good after the limit or
// once the account is confirmed.

export const CONFIRMATION_POLL_MS = 5_000;
export const CONFIRMATION_WATCH_LIMIT_MS = 30 * 60_000;
// A focus right after a visibility change must not start a second check.
const FOCUS_CHECK_GAP_MS = 1_000;

export type ConfirmationWatcher = {
  setVisible(visible: boolean): void;
  focus(): void;
  stop(): void;
};

export function createConfirmationWatcher({
  check,
  onConfirmed,
  now = Date.now,
  pollMs = CONFIRMATION_POLL_MS,
  limitMs = CONFIRMATION_WATCH_LIMIT_MS,
}: {
  check: () => Promise<boolean>;
  onConfirmed: () => void;
  now?: () => number;
  pollMs?: number;
  limitMs?: number;
}): ConfirmationWatcher {
  const startedAt = now();
  let timer: ReturnType<typeof setInterval> | null = null;
  let inFlight = false;
  let done = false;
  let lastCheckAt = Number.NEGATIVE_INFINITY;

  const expired = () => now() - startedAt >= limitMs;

  function pause() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function stop() {
    pause();
    done = true;
  }

  async function run() {
    if (done || inFlight) return;
    if (expired()) {
      stop();
      return;
    }
    inFlight = true;
    lastCheckAt = now();
    try {
      if ((await check()) && !done) {
        stop();
        onConfirmed();
      }
    } catch {
      // A failed read (network, server) is tried again on the next tick.
    } finally {
      inFlight = false;
    }
  }

  return {
    setVisible(visible) {
      if (!visible) {
        pause();
        return;
      }
      if (done || timer !== null) return;
      if (expired()) {
        stop();
        return;
      }
      timer = setInterval(() => void run(), pollMs);
    },
    focus() {
      if (done) return;
      if (expired()) {
        stop();
        return;
      }
      if (now() - lastCheckAt >= FOCUS_CHECK_GAP_MS) void run();
    },
    stop,
  };
}
