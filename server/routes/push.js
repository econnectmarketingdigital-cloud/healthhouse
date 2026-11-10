import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { PUBLIC_VAPID_KEY, saveSubscription, removeSubscription, sendPushToUser } from '../services/webpush.js';

const router = express.Router();

/**
 * Retorna a chave pública VAPID para o frontend gerar a inscrição.
 */
router.get('/public-key', (req, res) => {
  res.json({ success: true, publicKey: PUBLIC_VAPID_KEY });
});

/**
 * Salva a inscrição Push do navegador para o usuário logado.
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, error: 'Inscrição Push inválida' });
    }

    const userAgent = req.headers['user-agent'] || '';
    const id = await saveSubscription(req.user.id, subscription, userAgent);

    res.json({ success: true, message: 'Inscrição Push salva com sucesso!', id });
  } catch (error) {
    console.error('Erro ao salvar inscrição push:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Remove a inscrição Push.
 */
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, error: 'Endpoint não fornecido' });
    }

    await removeSubscription(endpoint);
    res.json({ success: true, message: 'Inscrição removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover inscrição push:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Dispara uma notificação de teste para o celular do próprio usuário logado.
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const payload = {
      title: '🎉 Notificações Ativadas!',
      body: `Olá, ${req.user.nome}! Seu celular está pronto para receber novos leads em tempo real.`,
      icon: '/logo_icon.png',
      badge: '/logo_icon.png',
      data: {
        url: '/'
      }
    };

    const result = await sendPushToUser(req.user.id, payload);

    if (result.sent === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhum celular/navegador registrado para receber push. Verifique se autorizou as notificações no navegador.' 
      });
    }

    res.json({ success: true, message: 'Notificação de teste disparada com sucesso!', result });
  } catch (error) {
    console.error('Erro ao enviar push de teste:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
