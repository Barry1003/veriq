/** Serial polling: one request, bounded backoff, and no delivery after navigation. */
export function startIntelligencePolling<T>(options: {
  read: (signal: AbortSignal) => Promise<T>;
  receive: (value: T) => void;
  fail: (error: unknown) => void;
  active: (value: T) => boolean;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}) {
  const schedule = options.schedule ?? setTimeout,
    cancel = options.cancel ?? clearTimeout;
  let disposed = false,
    running = false,
    failures = 0,
    timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  async function refresh() {
    if (disposed || running) return;
    if (timer) cancel(timer);
    running = true;
    controller = new AbortController();
    let delay = 10_000;
    try {
      const value = await options.read(controller.signal);
      if (!disposed) {
        failures = 0;
        options.receive(value);
        delay = options.active(value) ? 3_000 : 10_000;
      }
    } catch (error) {
      if (!disposed) {
        failures++;
        options.fail(error);
        delay = Math.min(30_000, 3_000 * 2 ** Math.min(failures, 4));
      }
    } finally {
      running = false;
      if (!disposed)
        timer = schedule(() => {
          void refresh();
        }, delay);
    }
  }
  void refresh();
  return {
    refresh,
    stop() {
      disposed = true;
      controller?.abort();
      if (timer) cancel(timer);
    },
  };
}
