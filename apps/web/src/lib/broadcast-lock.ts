/**
 * BroadcastChannel-based single-tab lock. The first tab to register claims the
 * lease and replies to "who owns?" pings. Any tab without the lease renders
 * the MultiTabLock overlay.
 *
 * Falls open (treats self as primary) on browsers without BroadcastChannel,
 * which is acceptable — the cost of a double session is low for this event.
 */

const CHANNEL_NAME = 'signal-lost:tab-lock';

type Message =
  | { type: 'claim'; id: string; at: number }
  | { type: 'ping'; from: string }
  | { type: 'pong'; from: string };

export type TabLockState = 'primary' | 'secondary' | 'unsupported';

export interface TabLock {
  state: () => TabLockState;
  subscribe: (fn: (state: TabLockState) => void) => () => void;
  dispose: () => void;
}

export function createTabLock(tabId: string = crypto.randomUUID()): TabLock {
  const listeners = new Set<(s: TabLockState) => void>();
  let current: TabLockState = typeof BroadcastChannel === 'undefined' ? 'unsupported' : 'primary';

  const notify = (next: TabLockState) => {
    if (next === current) return;
    current = next;
    listeners.forEach((fn) => fn(current));
  };

  if (current === 'unsupported') {
    return {
      state: () => current,
      subscribe: (fn) => {
        listeners.add(fn);
        fn(current);
        return () => listeners.delete(fn);
      },
      dispose: () => listeners.clear(),
    };
  }

  const channel = new BroadcastChannel(CHANNEL_NAME);
  let sawPong = false;

  // Ping existing tabs; if anyone answers, we become secondary.
  channel.postMessage({ type: 'ping', from: tabId } satisfies Message);
  const pingTimeout = window.setTimeout(() => {
    if (!sawPong) {
      // No one answered — we're primary. Announce ourselves.
      channel.postMessage({ type: 'claim', id: tabId, at: Date.now() } satisfies Message);
      notify('primary');
    }
  }, 150);

  channel.onmessage = (evt: MessageEvent<Message>) => {
    const msg = evt.data;
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case 'ping':
        if (current === 'primary') {
          channel.postMessage({ type: 'pong', from: tabId } satisfies Message);
        }
        break;
      case 'pong':
        sawPong = true;
        window.clearTimeout(pingTimeout);
        notify('secondary');
        break;
      case 'claim':
        if (msg.id !== tabId) {
          notify('secondary');
        }
        break;
    }
  };

  const onUnload = () => {
    channel.postMessage({ type: 'claim', id: 'released', at: Date.now() } satisfies Message);
    channel.close();
  };
  window.addEventListener('beforeunload', onUnload);

  return {
    state: () => current,
    subscribe: (fn) => {
      listeners.add(fn);
      fn(current);
      return () => listeners.delete(fn);
    },
    dispose: () => {
      window.clearTimeout(pingTimeout);
      window.removeEventListener('beforeunload', onUnload);
      channel.close();
      listeners.clear();
    },
  };
}
