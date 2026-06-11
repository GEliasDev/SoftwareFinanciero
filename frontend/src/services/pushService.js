import api from './api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
};

export const PushService = {
  isSupported: () => 'serviceWorker' in navigator && 'PushManager' in window,

  getPermission: () => Notification.permission,

  subscribe: async () => {
    const { data } = await api.get('/push/vapid-key');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
    const json = sub.toJSON();
    await api.post('/push/subscribe', {
      endpoint: json.endpoint,
      keys: json.keys,
    });
    return sub;
  },

  unsubscribe: async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.post('/push/unsubscribe', { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
  },

  getSubscription: async () => {
    if (!PushService.isSupported()) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  },
};
