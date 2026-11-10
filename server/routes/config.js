import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const defaultKeys = [
  'rodizio_ativo', 
  'rodizio_timeout_horas', 
  'reserva_prazo_horas', 
  'sla_redistribuicao_minutos', 
  'meta_vgv_equipe', 
  'meta_vgv_mes', 
  'meta_vgv_ano'
];

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const configs = await db.query("SELECT * FROM configuracoes");
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/', authenticateToken, requireRole('gestor'), async (req, res) => {
  const db = getDb();
  const entries = Object.entries(req.body);
  try {
    for (const [chave, valor] of entries) {
      await db.execute("UPDATE configuracoes SET valor = ? WHERE chave = ?", [valor.toString(), chave]);
    }
    res.json({ success: true, data: 'Atualizado' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
