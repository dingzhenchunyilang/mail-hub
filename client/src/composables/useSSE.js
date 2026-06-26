/**
 * SSE (Server-Sent Events) composable
 * 监听后端推送的验证码检测事件
 */
import { ref, onUnmounted } from 'vue';

export function useSSE() {
  const connected = ref(false);
  const lastEvent = ref(null);
  let eventSource = null;
  const listeners = new Map();

  function connect() {
    if (eventSource) return;

    eventSource = new EventSource('/api/codes/stream');

    eventSource.addEventListener('connected', () => {
      connected.value = true;
      console.log('[SSE] Connected');
    });

    eventSource.addEventListener('code_detected', (e) => {
      try {
        const data = JSON.parse(e.data);
        lastEvent.value = data;
        // 触发注册的监听器
        const cbs = listeners.get('code_detected') || [];
        cbs.forEach(cb => cb(data));
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    });

    eventSource.addEventListener('boost_status', (e) => {
      try {
        const data = JSON.parse(e.data);
        const cbs = listeners.get('boost_status') || [];
        cbs.forEach(cb => cb(data));
      } catch {}
    });

    eventSource.onerror = () => {
      connected.value = false;
      console.log('[SSE] Disconnected, will auto-reconnect');
      // EventSource 自动重连
    };
  }

  function on(eventName, callback) {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, []);
    }
    listeners.get(eventName).push(callback);
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
      connected.value = false;
    }
  }

  onUnmounted(() => {
    disconnect();
  });

  return { connected, lastEvent, connect, on, disconnect };
}
