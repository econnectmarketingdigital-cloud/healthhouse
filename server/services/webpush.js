import webpush from 'web-push';
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

export const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY || 'BE1bkCKRxl1_kDY5GekFR4R577yW2vIgqLbaQb4QgO_hmXkR5U7BUhiLl75xRBiFG1SA8m93KZECY-wTAfoCi60';
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY || '8W5bcquNoeMRfx9sLtDif3uZcw0gQcm7MxjQQx1TTGc';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:econnectmarketingdigital@gmail.com';

webpush.setVapidDetails(SUBJECT, PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY);

/**
 * Salva ou atualiza a inscrição Push de um corretor/usuário.
 */
export async function saveSubscription(usuarioId, subscription, userAgent = '') {
  const db = getDb();
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Dados da inscrição push incompletos');
  }

  // Verifica se o endpoint já existe
  const existing = await db.queryOne('SELECT id FROM push_subscriptions WHERE endpoint = ?', [endpoint]);

  if (existing) {
    await db.execute(`
      UPDATE push_subscriptions 
      SET usuario_id = ?, p256dh = ?, auth = ?, user_agent = ?, created_at = CURRENT_TIMESTAMP 
      WHERE endpoint = ?
    `, [usuarioId, p256dh, auth, userAgent, endpoint]);
    return existing.id;
  } else {
    const id = uuidv4();
    await db.execute(`
      INSERT INTO push_subscriptions (id, usuario_id, endpoint, p256dh, auth, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, usuarioId, endpoint, p256dh, auth, userAgent]);
    return id;
  }
}

/**
 * Remove uma inscrição pelo endpoint.
 */
export async function removeSubscription(endpoint) {
  const db = getDb();
  return await db.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
}

/**
 * Envia notificação Push para todos os aparelhos de um usuário específico.
 */
export async function sendPushToUser(usuarioId, payload) {
  const db = getDb();
  try {
    const subscriptions = await db.query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE usuario_id = ?',
      [usuarioId]
    );

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[WebPush] Usuário ${usuarioId} não possui aparelhos registrados para Push.`);
      return { sent: 0, failed: 0 };
    }

    const payloadString = JSON.stringify(payload);
    let sentCount = 0;
    let failedCount = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, payloadString);
          sentCount++;
          console.log(`[WebPush] ✅ Notificação enviada com sucesso para endpoint ${sub.endpoint.slice(0, 30)}...`);
        } catch (err) {
          failedCount++;
          console.error(`[WebPush] ❌ Falha ao enviar para endpoint ${sub.endpoint.slice(0, 30)}:`, err.statusCode || err.message);
          
          // Se o endpoint expirou ou foi revogado (404 ou 410 Gone), remove do banco
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.log(`[WebPush] Removendo endpoint inativo (${err.statusCode})...`);
            await db.execute('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]).catch(() => {});
          }
        }
      })
    );

    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    console.error('[WebPush] Erro geral ao enviar push:', error);
    return { sent: 0, failed: 1, error: error.message };
  }
}

/**
 * Envia notificação Push para múltiplos usuários (ex: gestores ou equipe).
 */
export async function sendPushToMultipleUsers(usuarioIds, payload) {
  if (!Array.isArray(usuarioIds) || usuarioIds.length === 0) return;
  return Promise.all(usuarioIds.map(uid => sendPushToUser(uid, payload)));
}
