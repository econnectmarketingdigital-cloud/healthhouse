import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/corretor', authenticateToken, async (req, res) => {
  const db = getDb();
  const corretor_id = req.user.id;
  
  try {
    const vgvRow = await db.queryOne(`
      SELECT SUM(valor_venda) as vgv FROM propostas 
      WHERE corretor_id = ? AND status = 'aprovada' 
      AND EXTRACT(MONTH FROM data_fechamento) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM data_fechamento) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [corretor_id]);
    const vgv = vgvRow?.vgv || 0;

    const leads = await db.query('SELECT etapa, COUNT(*) as count FROM leads WHERE corretor_id = ? GROUP BY etapa', [corretor_id]);
    
    const recentLeads = await db.query('SELECT id, nome, etapa, created_at, reengajado, reengajado_em FROM leads WHERE corretor_id = ? ORDER BY COALESCE(reengajado_em, created_at) DESC LIMIT 5', [corretor_id]);

    const allVgv = await db.query(`
      SELECT u.nome, u.avatar_url, p.corretor_id, SUM(p.valor_venda) as vgv FROM propostas p
      JOIN usuarios u ON p.corretor_id = u.id
      WHERE p.status = 'aprovada'
      AND EXTRACT(MONTH FROM p.data_fechamento) = EXTRACT(MONTH FROM CURRENT_DATE)
      GROUP BY p.corretor_id, u.nome, u.avatar_url ORDER BY vgv DESC
    `);
    
    let rank = allVgv.findIndex(r => r.corretor_id === corretor_id) + 1;
    if (rank === 0) rank = allVgv.length + 1;

    res.json({ success: true, data: { vgv, leads, recentLeads, rank, top: allVgv.slice(0, 5) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/gestor', authenticateToken, requireRole('gestor'), async (req, res) => {
  const db = getDb();
  try {
    const allVgv = await db.query(`
      SELECT u.nome, u.avatar_url, p.corretor_id, SUM(p.valor_venda) as vgv FROM propostas p
      JOIN usuarios u ON p.corretor_id = u.id
      WHERE p.status = 'aprovada'
      AND EXTRACT(MONTH FROM p.data_fechamento) = EXTRACT(MONTH FROM CURRENT_DATE)
      GROUP BY p.corretor_id, u.nome, u.avatar_url ORDER BY vgv DESC
    `);

    const funnelOrigem = await db.query(`
      SELECT origem, etapa, COUNT(*) as count FROM leads GROUP BY origem, etapa
    `);

    const leadsVolume = await db.query(`
      SELECT u.nome, u.avatar_url, COUNT(l.id) as total FROM usuarios u
      LEFT JOIN leads l ON l.corretor_id = u.id
      WHERE u.role = 'corretor'
      GROUP BY u.id, u.nome, u.avatar_url
    `);

    const chartDataQuery = await db.query("SELECT EXTRACT(DAY FROM data_fechamento) as dia, SUM(valor_venda) as vgv FROM propostas WHERE status = 'aprovada' AND EXTRACT(MONTH FROM data_fechamento) = EXTRACT(MONTH FROM CURRENT_DATE) GROUP BY dia ORDER BY dia ASC");
    res.json({ success: true, data: { rankings: allVgv, funnel: funnelOrigem, volume: leadsVolume, chart: chartDataQuery } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/corretor/:id/performance', authenticateToken, requireRole('gestor'), async (req, res) => {
  const db = getDb();
  const corretorId = req.params.id;

  try {
    const corretor = await db.queryOne('SELECT id, nome, email, telefone, role, ativo, avatar_url, avatar_cor, disponivel_rodizio FROM usuarios WHERE id = ?', [corretorId]);
    if (!corretor) return res.status(404).json({ success: false, error: 'Corretor nÃ£o encontrado' });

    const vgvTotal = await db.queryOne(`
      SELECT COALESCE(SUM(valor_venda), 0) as total FROM propostas 
      WHERE corretor_id = ? AND status = 'aprovada'
    `, [corretorId]);

    const vgvMes = await db.queryOne(`
      SELECT COALESCE(SUM(valor_venda), 0) as total FROM propostas 
      WHERE corretor_id = ? AND status = 'aprovada'
      AND EXTRACT(MONTH FROM data_fechamento) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM data_fechamento) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [corretorId]);

    const meta = await db.queryOne(`
      SELECT valor_meta FROM metas 
      WHERE corretor_id = ? AND tipo = 'vgv'
      ORDER BY ano DESC, mes DESC LIMIT 1
    `, [corretorId]);

    const totalLeads = await db.queryOne('SELECT COUNT(*) as total FROM leads WHERE corretor_id = ?', [corretorId]);

    const leadsPorEtapa = await db.query('SELECT etapa, COUNT(*) as count FROM leads WHERE corretor_id = ? GROUP BY etapa', [corretorId]);

    const vendasPorEmpreendimento = await db.query(`
      SELECT e.nome as empreendimento, COUNT(p.id) as vendas, SUM(p.valor_venda) as vgv
      FROM propostas p
      LEFT JOIN unidades u ON p.unidade_id = u.id
      LEFT JOIN empreendimentos e ON u.empreendimento_id = e.id
      WHERE p.corretor_id = ? AND p.status = 'aprovada'
      GROUP BY e.id, e.nome
    `, [corretorId]);

    const propostas = await db.query(`
      SELECT status, COUNT(*) as count FROM propostas
      WHERE corretor_id = ?
      GROUP BY status
    `, [corretorId]);

    const leadsRecentes = await db.query(`
      SELECT l.id, l.nome, l.etapa, l.created_at, l.reengajado, l.reengajado_em, e.nome as empreendimento_nome
      FROM leads l
      LEFT JOIN empreendimentos e ON l.empreendimento_interesse_id = e.id
      WHERE l.corretor_id = ?
      ORDER BY COALESCE(l.reengajado_em, l.created_at) DESC LIMIT 10
    `, [corretorId]);

    const fechados = await db.queryOne("SELECT COUNT(*) as total FROM leads WHERE corretor_id = ? AND etapa = 'fechado'", [corretorId]);
    const taxaConversao = totalLeads.total > 0 ? ((fechados.total / totalLeads.total) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        corretor,
        vgvTotal: vgvTotal.total,
        vgvMes: vgvMes.total,
        metaIndividual: meta?.valor_meta || 0,
        totalLeads: totalLeads.total,
        leadsPorEtapa,
        vendasPorEmpreendimento,
        propostas,
        leadsRecentes,
        taxaConversao: parseFloat(taxaConversao),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;



