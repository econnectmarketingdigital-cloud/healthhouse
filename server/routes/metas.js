import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    let q = "SELECT * FROM metas WHERE mes = ? AND ano = ?";
    const params = [month, year];

    if (req.user.role === 'corretor') {
      q += " AND (corretor_id = ? OR corretor_id IS NULL)";
      params.push(req.user.id);
    }

    const metas = await db.query(q, params);
    res.json({ success: true, data: metas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const db = getDb();
  const { corretor_id, tipo, valor_meta, mes, ano } = req.body;
  if (req.user.role === 'corretor' && corretor_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Acesso negado' });
  }
  if (!corretor_id && req.user.role !== 'gestor') {
    return res.status(403).json({ success: false, error: 'Apenas gestor cria meta equipe' });
  }

  const id = uuidv4();
  try {
    await db.execute(`
      INSERT INTO metas (id, corretor_id, tipo, valor_meta, mes, ano)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, corretor_id || null, tipo, valor_meta, mes, ano]);

    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const meta = await db.queryOne("SELECT * FROM metas WHERE id = ?", [req.params.id]);
    if (!meta) return res.status(404).json({ success: false, error: 'Não encontrada' });

    if (req.user.role === 'corretor' && meta.corretor_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    await db.execute("UPDATE metas SET valor_meta = ? WHERE id = ?", [req.body.valor_meta, req.params.id]);
    res.json({ success: true, data: 'Atualizado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
