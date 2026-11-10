import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { findExistingLead } from '../services/deduplicacao.js';
import { getNextCorretor } from '../services/rodizio.js';
import { notifyCorretorNewLead } from '../services/notification.js';
import { sendPushToUser } from '../services/webpush.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const { etapa, origem, corretor_id, limit = 1000, offset = 0 } = req.query;
    let query = `
      SELECT l.*, e.nome as empreendimento_nome, u.nome as corretor_nome
      FROM leads l
      LEFT JOIN empreendimentos e ON l.empreendimento_interesse_id = e.id
      LEFT JOIN usuarios u ON l.corretor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'corretor') {
      query += ' AND l.corretor_id = ?';
      params.push(req.user.id);
    } else if (corretor_id) {
      query += ' AND l.corretor_id = ?';
      params.push(corretor_id);
    }

    if (etapa) { query += ' AND l.etapa = ?'; params.push(etapa); }
    if (origem) { query += ' AND l.origem = ?'; params.push(origem); }

    query += ' ORDER BY COALESCE(l.reengajado_em, l.created_at) DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10) || 1000, parseInt(offset, 10) || 0);

    const leads = await db.query(query, params);
    res.json({ success: true, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const { nome, telefone, email, origem = 'manual', campanha, anuncio, empreendimento_interesse_id, observacoes, tipo_plano, qtd_vidas, idades } = req.body;
    
    if (!nome || !telefone) {
      return res.status(400).json({ success: false, error: 'Nome e telefone são obrigatórios' });
    }

    const cleanEmail = email && email.trim() ? email.trim() : null;
    const cleanTelefone = telefone ? telefone.trim() : '';

    const existing = await findExistingLead(cleanTelefone, cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Lead já existe', data: existing });
    }

    const id = uuidv4();
    let corretorId = null;

    if (origem === 'manual') {
      corretorId = req.user.id;
    } else {
      corretorId = await getNextCorretor(origem, campanha);
    }

    const cleanEmpId = empreendimento_interesse_id && empreendimento_interesse_id.trim() !== '' ? empreendimento_interesse_id : null;

    await db.execute(`
      INSERT INTO leads (id, nome, telefone, email, origem, campanha, anuncio, corretor_id, empreendimento_interesse_id, observacoes, tipo_plano, qtd_vidas, idades)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, 
      nome.trim(), 
      cleanTelefone, 
      cleanEmail, 
      origem || 'manual', 
      campanha || null, 
      anuncio || null, 
      corretorId, 
      cleanEmpId, 
      observacoes || null,
      tipo_plano || null,
      parseInt(qtd_vidas, 10) || null,
      idades || null
    ]);

    await db.execute(
      `INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, descricao) VALUES (?, ?, ?, 'criacao', 'Lead cadastrado com sucesso')`,
      [uuidv4(), id, corretorId]
    );

    // Send email notification to broker
    notifyCorretorNewLead(id).catch(err => console.error('Notification error:', err));

    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const lead = await db.queryOne(`
      SELECT l.*, e.nome as empreendimento_nome, u.nome as corretor_nome 
      FROM leads l 
      LEFT JOIN empreendimentos e ON l.empreendimento_interesse_id = e.id 
      LEFT JOIN usuarios u ON l.corretor_id = u.id 
      WHERE l.id = ?
    `, [req.params.id]);
    
    if (!lead) return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    
    if (req.user.role === 'corretor' && lead.corretor_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/bulk-transfer', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const { lead_ids, corretor_id } = req.body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Selecione ao menos um lead para transferir.' });
    }

    let nomeNovoCorretor = 'Nenhum Corretor';
    if (corretor_id) {
      const novoCorretor = await db.queryOne('SELECT nome FROM usuarios WHERE id = ?', [corretor_id]);
      if (novoCorretor) nomeNovoCorretor = novoCorretor.nome;
    }

    let transferredCount = 0;
    for (const leadId of lead_ids) {
      const lead = await db.queryOne('SELECT id, nome, corretor_id FROM leads WHERE id = ?', [leadId]);
      if (!lead) continue;
      if (req.user.role === 'corretor' && lead.corretor_id !== req.user.id) continue;

      await db.execute(
        'UPDATE leads SET corretor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [corretor_id || null, leadId]
      );

      await db.execute(
        `INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, descricao) VALUES (?, ?, ?, 'sistema', ?)`,
        [uuidv4(), leadId, req.user.id, `Lead transferido em massa para ${nomeNovoCorretor} por ${req.user.nome}.`]
      );
      transferredCount++;
    }

    if (corretor_id && corretor_id !== req.user.id && transferredCount > 0) {
      sendPushToUser(corretor_id, {
        title: `📋 ${transferredCount} Lead(s) Transferido(s) para Você!`,
        body: `${req.user.nome} transferiu ${transferredCount} lead(s) para a sua carteira.`,
        icon: '/logo_icon.png',
        badge: '/logo_icon.png',
        data: { url: '/leads' }
      }).catch(err => console.error('[Push Transferência em Massa]:', err));
    }

    res.json({ success: true, data: { transferredCount, nomeNovoCorretor } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/corretor', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const { corretor_id } = req.body;
    
    const lead = await db.queryOne('SELECT corretor_id FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    if (req.user.role === 'corretor' && lead.corretor_id !== req.user.id) return res.status(403).json({ success: false, error: 'Acesso negado' });

    let nomeNovoCorretor = 'Nenhum Corretor';
    if (corretor_id) {
      const novoCorretor = await db.queryOne('SELECT nome FROM usuarios WHERE id = ?', [corretor_id]);
      if (novoCorretor) nomeNovoCorretor = novoCorretor.nome;
    }

    await db.execute('UPDATE leads SET corretor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [corretor_id || null, req.params.id]);
    
    await db.execute(`
      INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, descricao) 
      VALUES (?, ?, ?, 'sistema', ?)
    `, [uuidv4(), req.params.id, req.user.id, `Lead transferido manualmente para ${nomeNovoCorretor} por ${req.user.nome}.`]);

    if (corretor_id && corretor_id !== req.user.id) {
      sendPushToUser(corretor_id, {
        title: '📋 Lead Transferido para Você!',
        body: `${req.user.nome} transferiu o lead ${lead.nome || 'de cliente'} para você.`,
        icon: '/logo_icon.png',
        badge: '/logo_icon.png',
        data: { url: `/leads/${req.params.id}` }
      }).catch(err => console.error('[Push Transferência]:', err));
    }

    res.json({ success: true, data: 'Corretor atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const lead = await db.queryOne('SELECT corretor_id FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    if (req.user.role === 'corretor' && lead.corretor_id !== req.user.id) return res.status(403).json({ success: false, error: 'Acesso negado' });

    const { nome, telefone, email, observacoes } = req.body;
    await db.execute('UPDATE leads SET nome = ?, telefone = ?, email = ?, observacoes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [nome, telefone, email, observacoes, req.params.id]);
    res.json({ success: true, data: 'Atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/etapa', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const lead = await db.queryOne('SELECT etapa, corretor_id FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    if (req.user.role === 'corretor' && lead.corretor_id !== req.user.id) return res.status(403).json({ success: false, error: 'Acesso negado' });

    const { etapa, perdido_motivo } = req.body;
    if (etapa === 'perdido' && !perdido_motivo) return res.status(400).json({ success: false, error: 'Motivo de perda é obrigatório' });

    await db.execute('UPDATE leads SET etapa = ?, perdido_motivo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [etapa, perdido_motivo || null, req.params.id]);
    
    await db.execute(`INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, etapa_anterior, etapa_nova, descricao) VALUES (?, ?, ?, 'mudanca_etapa', ?, ?, 'Etapa alterada')`, [uuidv4(), req.params.id, req.user.id, lead.etapa, etapa]);
    
    res.json({ success: true, data: 'Etapa atualizada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/historico', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const hist = await db.query('SELECT h.*, u.nome as corretor_nome FROM lead_historico h LEFT JOIN usuarios u ON h.corretor_id = u.id WHERE h.lead_id = ? ORDER BY h.created_at DESC', [req.params.id]);
    res.json({ success: true, data: hist });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const addNotaHandler = async (req, res) => {
  const db = getDb();
  const { descricao } = req.body;
  try {
    await db.execute(`INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, descricao) VALUES (?, ?, ?, 'nota', ?)`, [uuidv4(), req.params.id, req.user.id, descricao]);
    res.json({ success: true, data: 'Nota adicionada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.post('/:id/notas', authenticateToken, addNotaHandler);
router.post('/:id/nota', authenticateToken, addNotaHandler);

const fecharVendaHandler = async (req, res) => {
  const db = getDb();
  try {
    const { empreendimento_id, valor_venda, qtd_vidas, plano_nome } = req.body;
    const lead = await db.queryOne('SELECT corretor_id, etapa FROM leads WHERE id = ?', [req.params.id]);
    
    if (!lead) return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    if (req.user.role === 'corretor' && lead.corretor_id && lead.corretor_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    const cleanEmpId = empreendimento_id && String(empreendimento_id).trim() !== '' ? empreendimento_id : null;
    const cleanValor = parseFloat(valor_venda) || 0;
    const corretorId = lead.corretor_id || req.user.id;

    const unidadeId = uuidv4();
    await db.execute(`INSERT INTO unidades (id, empreendimento_id, numero, tipologia, valor, status) VALUES (?, ?, 'Contrato Fechado', ?, ?, 'vendido')`, [unidadeId, cleanEmpId, plano_nome || null, cleanValor]);

    const propostaId = uuidv4();
    await db.execute(`INSERT INTO propostas (id, lead_id, unidade_id, corretor_id, valor_venda, status, data_fechamento, qtd_vidas, plano_nome) VALUES (?, ?, ?, ?, ?, 'aprovada', CURRENT_TIMESTAMP, ?, ?)`, [propostaId, req.params.id, unidadeId, corretorId, cleanValor, parseInt(qtd_vidas, 10) || null, plano_nome || null]);

    await db.execute(`UPDATE leads SET etapa = 'fechado', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);

    const vgvFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cleanValor);
    const detalhes = [plano_nome, qtd_vidas ? `${qtd_vidas} vida(s)` : null].filter(Boolean).join(' • ');
    await db.execute(`INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, etapa_anterior, etapa_nova, descricao) VALUES (?, ?, ?, 'mudanca_etapa', ?, 'fechado', ?)`, [uuidv4(), req.params.id, req.user.id, lead.etapa, `Contrato fechado! Mensalidade: ${vgvFormatado}${detalhes ? ` (${detalhes})` : ''}`]);

    res.json({ success: true, data: 'Venda registrada com sucesso!' });
  } catch (error) {
    console.error('Erro na Venda:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

router.post('/:id/venda', authenticateToken, fecharVendaHandler);
router.post('/:id/fechar_venda', authenticateToken, fecharVendaHandler);

router.delete('/:id', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    const lead = await db.queryOne('SELECT corretor_id FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    if (req.user.role === 'corretor' && lead.corretor_id && lead.corretor_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    // Delete associated propostas, historico, reservas
    await db.execute('DELETE FROM propostas WHERE lead_id = ?', [req.params.id]);
    await db.execute('DELETE FROM lead_historico WHERE lead_id = ?', [req.params.id]);
    await db.execute('DELETE FROM reservas WHERE lead_id = ?', [req.params.id]);
    await db.execute('DELETE FROM leads WHERE id = ?', [req.params.id]);

    res.json({ success: true, data: 'Lead excluído com sucesso' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/clear-all', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    await db.execute('DELETE FROM propostas');
    await db.execute('DELETE FROM lead_historico');
    await db.execute('DELETE FROM reservas');
    await db.execute('DELETE FROM leads');
    res.json({ success: true, data: 'Todos os leads e vendas foram zerados com sucesso!' });
  } catch (error) {
    console.error('Clear all error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
