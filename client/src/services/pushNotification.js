import api from './api';

export const DEFAULT_VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BE1bkCKRxl1_kDY5GekFR4R577yW2vIgqLbaQb4QgO_hmXkR5U7BUhiLl75xRBiFG1SA8m93KZECY-wTAfoCi60';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window
  );
}

export function getPushPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  try {
    if ('PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager?.getSubscription();
    }
    return null;
  } catch (err) {
    console.error('Erro ao verificar inscrição push existente:', err);
    return null;
  }
}

export async function subscribeUserToPush() {
  if (!isPushSupported()) {
    throw new Error('Notificações não são suportadas neste navegador/dispositivo.');
  }

  // 1. Solicita permissão do navegador
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Permissão para notificações foi bloqueada nas configurações do seu navegador.'
        : 'Permissão para notificações não foi autorizada.'
    );
  }

  // 2. Chave VAPID pública com fallback seguro
  let publicKey = DEFAULT_VAPID_PUBLIC_KEY;
  try {
    const res = await api.push.getPublicKey();
    if (res && res.publicKey) {
      publicKey = res.publicKey;
    }
  } catch (err) {
    console.warn('Usando chave VAPID padrão:', err.message);
  }

  let subscription = null;

  // 3. Inscreve no PushManager se disponível (PWA / Android / iOS Standalone)
  if ('PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);

      subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }
    } catch (pushErr) {
      console.warn('Aviso PushManager:', pushErr.message);
    }
  }

  // 4. Envia inscrição para o backend se disponível
  if (subscription) {
    try {
      await api.push.subscribe(subscription);
    } catch (backendErr) {
      console.warn('Backend push sync aviso:', backendErr.message);
    }
  }

  // 5. Salva no localStorage para persistir status ativo no dispositivo
  localStorage.setItem('@CRM_Notifications_Enabled', 'true');

  // 6. Dispara notificação nativa de boas-vindas imediatamente no aparelho
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification('🎉 Notificações Ativadas!', {
        body: 'Health & House CRM: Seu celular receberá alertas sonoros de novos leads.',
        icon: '/logo_icon.png',
        badge: '/logo_icon.png',
        vibrate: [200, 100, 200]
      });
    }
  } catch (e) {
    console.log('Notificação local teste:', e);
  }

  return subscription || true;
}

export async function unsubscribeUserFromPush() {
  localStorage.removeItem('@CRM_Notifications_Enabled');

  if (!isPushSupported()) return;

  try {
    if ('PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager?.getSubscription();
      if (subscription) {
        await api.push.unsubscribe(subscription.endpoint).catch(() => {});
        await subscription.unsubscribe();
      }
    }
  } catch (err) {
    console.error('Erro ao desinscrever do push:', err);
  }
}
