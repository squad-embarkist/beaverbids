import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIRMATION_POLL_MS, CONFIRMATION_WATCH_LIMIT_MS, createConfirmationWatcher } from "./confirmation-watch";

describe("createConfirmationWatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setUp(results: boolean[] = []) {
    const check = vi.fn(async () => results.shift() ?? false);
    const onConfirmed = vi.fn();
    const watcher = createConfirmationWatcher({ check, onConfirmed });
    return { check, onConfirmed, watcher };
  }

  it("checks every 5 seconds while visible and not before", async () => {
    const { check, watcher } = setUp();
    watcher.setVisible(true);
    expect(check).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS);
    expect(check).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS * 3);
    expect(check).toHaveBeenCalledTimes(4);
  });

  it("stops while hidden and resumes when visible again", async () => {
    const { check, watcher } = setUp();
    watcher.setVisible(true);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS);
    watcher.setVisible(false);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS * 5);
    expect(check).toHaveBeenCalledTimes(1);
    watcher.setVisible(true);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("checks at once on focus, but not twice within a second", async () => {
    const { check, watcher } = setUp();
    watcher.setVisible(true);
    watcher.focus();
    expect(check).toHaveBeenCalledTimes(1);
    watcher.focus();
    expect(check).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    watcher.focus();
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("calls onConfirmed once and never checks again", async () => {
    const { check, onConfirmed, watcher } = setUp([false, true]);
    watcher.setVisible(true);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS * 2);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS * 3);
    watcher.focus();
    watcher.setVisible(true);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS);
    expect(check).toHaveBeenCalledTimes(2);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it("keeps polling after a failed check", async () => {
    const check = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(false);
    const watcher = createConfirmationWatcher({ check, onConfirmed: vi.fn() });
    watcher.setVisible(true);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS * 2);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("never overlaps a slow check", async () => {
    let resolve: (value: boolean) => void = () => {};
    const check = vi.fn(() => new Promise<boolean>((r) => (resolve = r)));
    const watcher = createConfirmationWatcher({ check, onConfirmed: vi.fn() });
    watcher.setVisible(true);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS * 3);
    expect(check).toHaveBeenCalledTimes(1);
    resolve(false);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("gives up after 30 minutes, even on focus", async () => {
    const { check, watcher } = setUp();
    watcher.setVisible(true);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_WATCH_LIMIT_MS);
    const calls = check.mock.calls.length;
    expect(calls).toBe(CONFIRMATION_WATCH_LIMIT_MS / CONFIRMATION_POLL_MS - 1);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS * 3);
    watcher.focus();
    watcher.setVisible(false);
    watcher.setVisible(true);
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS * 3);
    expect(check).toHaveBeenCalledTimes(calls);
  });

  it("stop ends everything", async () => {
    const { check, watcher } = setUp();
    watcher.setVisible(true);
    watcher.stop();
    watcher.setVisible(true);
    watcher.focus();
    await vi.advanceTimersByTimeAsync(CONFIRMATION_POLL_MS * 2);
    expect(check).not.toHaveBeenCalled();
  });
});
