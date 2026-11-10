import express from 'express';
import { getDb } from '../database.js';
import { findExistingLead } from '../services/deduplicacao.js';
import { getNextCorretor } from '../services/rodizio.js';
import { notifyCorretorNewLead, notifyCorretorReengajamento } from '../services/notification.js';
import { sendPushToUser } from '../services/webpush.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Meta Verification Token (configurado via .env)
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'crm_meta_verify_2026';

// Rota temporária para inscrever o app na Página do Meta para receber eventos de leadgen
router.get('/subscribe-page', async (req, res) => {
  const systemUserToken = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  if (!systemUserToken || !pageId) return res.status(500).json({ error: 'META_PAGE_ACCESS_TOKEN ou META_PAGE_ID não configurado no .env' });
  try {
    // Passo 1: Busca o Page Access Token usando o System User Token
    const pageTokenRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}?fields=access_token&access_token=${systemUserToken}`);
    const pageTokenData = await pageTokenRes.json();
    console.log('[Subscribe Page] Page token fetch:', pageTokenData);

    if (pageTokenData.error) {
      return res.status(400).json({ step: 'get_page_token', error: pageTokenData.error });
    }

    const pageToken = pageTokenData.access_token;
    if (!pageToken) {
      return res.status(400).json({ error: 'Não foi possível obter o Page Access Token. Verifique se o System User tem acesso à página.' });
    }

    // Passo 2: Inscreve o app na página usando o Page Access Token
    const subscribeRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscribed_fields: 'leadgen', access_token: pageToken })
    });
    const subscribeData = await subscribeRes.json();
    console.log('[Subscribe Page] Inscrição:', subscribeData);

    res.json({
      success: subscribeData.success || false,
      subscription_result: subscribeData,
      page_access_token: pageToken,
      message: subscribeData.success
        ? '✅ App inscrito! Salve o page_access_token no Render como META_PAGE_ACCESS_TOKEN.'
        : '❌ Falha na inscrição.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Meta Verification (GET)
router.get('/meta', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Meta Webhook] GET Verification Successful!');
    res.status(200).send(challenge);
  } else {
    console.error('[Meta Webhook] GET Verification Failed. Token:', token);
    res.sendStatus(403);
  }
});

const DEFAULT_PAGE_ID = process.env.META_PAGE_ID || '';
const FALLBACK_PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
let cachedPageToken = null;

async function getValidPageToken() {
  if (cachedPageToken) return cachedPageToken;
  const envToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (envToken) {
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${DEFAULT_PAGE_ID}?fields=access_token&access_token=${envToken}`);
      const data = await res.json();
      if (data && data.access_token) {
        cachedPageToken = data.access_token;
        return cachedPageToken;
      }
    } catch (err) {
      // ignora erro e usa fallback
    }
  }
  return FALLBACK_PAGE_TOKEN;
}

// Consulta rápida na Graph API da Meta quando o Make não envia campaign_name / ad_name
async function resolveMetaLeadDetails(telefone, nome) {
  try {
    const token = await getValidPageToken();
    if (!token) return null;

    const digits = (telefone || '').replace(/\D/g, '');
    const last8 = digits.length >= 8 ? digits.slice(-8) : '';
    const cleanName = (nome || '').trim().toLowerCase();

    const url = `https://graph.facebook.com/v20.0/${DEFAULT_PAGE_ID}/leadgen_forms?fields=id,name,leads.limit(15){id,created_time,ad_name,campaign_name,field_data}&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || !Array.isArray(data.data)) return null;

    let bestMatch = null;
    for (const form of data.data) {
      const leads = form.leads?.data || [];
      for (const ml of leads) {
        let mPhone = '';
        let mName = '';
        for (const f of ml.field_data || []) {
          const fn = (f.name || '').toLowerCase();
          if (fn.includes('phone') || fn.includes('whatsapp') || fn.includes('telefone')) {
            mPhone = f.values?.[0] || '';
          } else if (fn.includes('name') || fn.includes('nome')) {
            mName = f.values?.[0] || '';
          }
        }
        const mDigits = mPhone.replace(/\D/g, '');
        const mLast8 = mDigits.length >= 8 ? mDigits.slice(-8) : '';

        const phoneMatches = last8 && mLast8 && last8 === mLast8;
        const nameMatches = cleanName && mName && cleanName === mName.trim().toLowerCase();

        if (phoneMatches || nameMatches) {
          if (!bestMatch || new Date(ml.created_time) > new Date(bestMatch.created_time)) {
            bestMatch = {
              form_name: form.name || '',
              campaign_name: ml.campaign_name || '',
              ad_name: ml.ad_name || '',
              created_time: ml.created_time
            };
          }
        }
      }
    }
    return bestMatch;
  } catch (err) {
    console.error('[Webhook] Erro ao consultar detalhes do lead na Meta API:', err.message);
    return null;
  }
}

const handleIncomingLead = async (leadData) => {
  const db = getDb();
  const { nome, telefone, email, origem, campanha, empreendimento, faixa_renda, renda, observacoes } = leadData;
  const rendaFinal = faixa_renda || renda || null;

  try {
    // Captura com máxima flexibilidade os campos de campanha, anúncio e formulário
    let rawCampanha = leadData.campanha || leadData.campaign_name || leadData.campaign || leadData.form_name || leadData.formulario || '';
    let rawAnuncio = leadData.anuncio || leadData.ad_name || null;
    let rawFormName = leadData.form_name || leadData.formulario || '';

    // Se o Make enviou campanha em branco ou genérica ("Meta Ads"), busca automaticamente na Graph API da Meta
    if (!rawCampanha || rawCampanha.toLowerCase() === 'meta ads' || !rawAnuncio) {
      const metaDetails = await resolveMetaLeadDetails(telefone, nome);
      if (metaDetails) {
        if (!rawCampanha || rawCampanha.toLowerCase() === 'meta ads') {
          rawCampanha = metaDetails.campaign_name || metaDetails.form_name || rawCampanha;
        }
        if (!rawAnuncio && metaDetails.ad_name) {
          rawAnuncio = metaDetails.ad_name;
        }
        if (!rawFormName && metaDetails.form_name) {
          rawFormName = metaDetails.form_name;
        }
        console.log(`[Webhook] 🔍 Campanha identificada via Meta Graph API: Campanha="${metaDetails.campaign_name}" | Form="${metaDetails.form_name}" | Anúncio="${metaDetails.ad_name}"`);
      }
    }

    // Constrói contexto de busca para identificar a operadora/produto (Select, Humana, Amil, Unimed...)
    const searchContext = [
      leadData.empreendimento,
      leadData.produto,
      leadData.operadora,
      rawCampanha,
      rawAnuncio,
      rawFormName,
      leadData.observacoes
    ].filter(Boolean).join(' ').toLowerCase();

    let finalCampanha = rawCampanha || 'Meta Ads';
    let empreendimentoId = null;

    // Detecção dinâmica: qualquer operadora cadastrada em "Planos & Operadoras" é reconhecida
    // pelo nome (ex: "Select Saúde") ou pela marca/operadora (ex: "Select").
    const operadoras = await db.query('SELECT id, nome, incorporadora FROM empreendimentos WHERE COALESCE(ativo, 1) = 1');
    const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ctxNorm = normalize(searchContext);
    for (const op of operadoras) {
      const termos = [op.nome, op.incorporadora].map(normalize).filter(t => t && t.length >= 3);
      if (termos.some(t => ctxNorm.includes(t))) {
        empreendimentoId = op.id;
        finalCampanha = op.nome;
        break;
      }
    }

    // Tipo de plano (PF / Familiar / PME) e quantidade de vidas, se vierem no payload ou nas respostas do formulário
    const tipoPlano = leadData.tipo_plano
      || (ctxNorm.includes('pme') || ctxNorm.includes('empresa') || ctxNorm.includes('cnpj') ? 'PME'
        : ctxNorm.includes('famil') ? 'Familiar'
        : ctxNorm.includes('individual') ? 'Individual' : null);
    const vidasMatch = ctxNorm.match(/(\d{1,3})\s*(vidas|pessoas|beneficiarios)/);
    const qtdVidas = parseInt(leadData.qtd_vidas || leadData.vidas, 10) || (vidasMatch ? parseInt(vidasMatch[1], 10) : null);
    const idades = leadData.idades || null;

    // Se observacoes veio com "Anúncio:  |" em branco do Make, injeta o nome do anúncio identificado
    let observacoesFinais = observacoes || null;
    if (observacoesFinais && observacoesFinais.includes('Anúncio:  |') && rawAnuncio) {
      observacoesFinais = observacoesFinais.replace('Anúncio:  |', `Anúncio: ${rawAnuncio} |`);
    }

    const existing = await findExistingLead(telefone, email);
    if (existing) {
      console.log(`[Webhook] 🔥 Lead reengajado detectado: ${existing.nome} (${existing.telefone}) [${finalCampanha}]`);
      
      const novasObs = observacoesFinais || '';
      const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const historicoMsg = `🔥 [RE-ENGAJAMENTO - ${finalCampanha}] O lead preencheu o formulário novamente em ${dataHora}. ${novasObs ? `Dados preenchidos: ${novasObs}` : ''}`;
      
      const obsAtualizada = existing.observacoes 
        ? `${existing.observacoes}\n\n[Reengajamento ${finalCampanha} em ${dataHora}]:\n${novasObs}`
        : `[Reengajamento ${finalCampanha} em ${dataHora}]:\n${novasObs}`;

      await db.execute(`
        UPDATE leads 
        SET reengajado = true,
            reengajado_em = CURRENT_TIMESTAMP,
            vezes_convertido = COALESCE(vezes_convertido, 1) + 1,
            campanha = CASE WHEN campanha IS NULL OR campanha = 'Meta Ads' THEN ? ELSE campanha END,
            anuncio = COALESCE(?, anuncio),
            empreendimento_interesse_id = COALESCE(?, empreendimento_interesse_id),
            observacoes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [finalCampanha, rawAnuncio, empreendimentoId, obsAtualizada, existing.id]);

      await db.execute(`
        INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, descricao)
        VALUES (?, ?, ?, 'reengajamento', ?)
      `, [uuidv4(), existing.id, existing.corretor_id, historicoMsg]);

      // Dispara alerta imediato de reengajamento para o corretor que cuida do lead
      notifyCorretorReengajamento(existing.id, novasObs).catch(err => console.error('[Webhook] Erro ao notificar reengajamento:', err));

      if (existing.corretor_id) {
        sendPushToUser(existing.corretor_id, {
          title: `⚡ Seu Lead [${finalCampanha}] Preencheu Novamente!`,
          body: `🔥 ${existing.nome} preencheu o formulário de ${finalCampanha} novamente! Toque para ver os dados.`,
          icon: '/logo_icon.png',
          badge: '/logo_icon.png',
          data: { url: `/leads/${existing.id}` }
        }).catch(err => console.error('[Webhook] Erro no Push Reengajamento:', err));
      }
      return;
    }

    const corretorId = await getNextCorretor(origem, finalCampanha) || null;
    const id = uuidv4();
    
    await db.execute(`
      INSERT INTO leads (id, nome, telefone, email, origem, campanha, anuncio, faixa_renda, observacoes, corretor_id, empreendimento_interesse_id, tipo_plano, qtd_vidas, idades)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, nome, telefone, email, origem, finalCampanha, rawAnuncio, rendaFinal, observacoesFinais, corretorId, empreendimentoId, tipoPlano, qtdVidas, idades]);
    
    await db.execute(`INSERT INTO lead_historico (id, lead_id, corretor_id, tipo, descricao) VALUES (?, ?, ?, 'sistema', ?)`, [uuidv4(), id, corretorId, `Lead via Webhook ${origem} (Campanha: ${finalCampanha})`]);
    
    console.log(`[Webhook] ✅ Lead salvo no CRM com sucesso! (${nome} [${finalCampanha}] -> Corretor ID: ${corretorId})`);

    // Dispara notificação por e-mail para o corretor atribuído
    notifyCorretorNewLead(id).catch(err => console.error('[Webhook] Erro ao notificar corretor:', err));

    if (corretorId) {
      const tagProduto = (finalCampanha && finalCampanha.toLowerCase() !== 'meta ads') ? ` [${finalCampanha}]` : '';
      sendPushToUser(corretorId, {
        title: `🔥 Novo Lead${tagProduto}!`,
        body: `${nome} acabou de entrar no CRM com interesse em ${finalCampanha && finalCampanha.toLowerCase() !== 'meta ads' ? finalCampanha : 'plano de saúde'}! Toque para atender.`,
        icon: '/logo_icon.png',
        badge: '/logo_icon.png',
        data: { url: `/leads/${id}` }
      }).catch(err => console.error('[Webhook] Erro no Push Novo Lead:', err));
    }
      
  } catch (e) {
    console.error('[Webhook] Erro no processamento do lead:', e);
  }
};

// Função para buscar dados completos do lead direto na API do Graph do Facebook
async function fetchLeadFromGraphApi(leadgenId, pageToken) {
  try {
    const url = `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${pageToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('[Meta Graph API Error]:', data.error);
      return null;
    }

    let nome = 'Lead Meta Ads';
    let telefone = null;
    let email = null;
    let customObs = [];

    if (data.field_data && Array.isArray(data.field_data)) {
      for (const field of data.field_data) {
        const fieldName = field.name.toLowerCase();
        const value = field.values && field.values[0] ? field.values[0] : '';

        if (fieldName.includes('full_name') || fieldName.includes('nome')) {
          nome = value;
        } else if (fieldName.includes('phone') || fieldName.includes('whatsapp') || fieldName.includes('telefone')) {
          telefone = value;
        } else if (fieldName.includes('email')) {
          email = value;
        } else {
          customObs.push(`${field.name}: ${value}`);
        }
      }
    }

    // Tenta buscar informações do anúncio e campanha se ad_id estiver presente
    let campanha = 'Meta Lead Ads';
    let anuncio = null;

    if (data.ad_id && pageToken) {
      try {
        const adUrl = `https://graph.facebook.com/v20.0/${data.ad_id}?fields=name,campaign{name}&access_token=${pageToken}`;
        const adRes = await fetch(adUrl);
        const adData = await adRes.json();
        if (adData.name) anuncio = adData.name;
        if (adData.campaign && adData.campaign.name) campanha = adData.campaign.name;
      } catch (err) {
        // ignora falha secundária de busca de anúncio
      }
    }

    return {
      nome,
      telefone,
      email,
      campanha,
      empreendimento: anuncio || campanha,
      observacoes: customObs.length > 0 ? customObs.join(' | ') : null
    };
  } catch (err) {
    console.error('[Meta Graph API Fetch Exception]:', err.message);
    return null;
  }
}

// Meta Payload (POST) - Suporta tanto envio Direto do Meta quanto requisições simplificadas
router.post('/meta', async (req, res) => {
  const body = req.body;

  // Responde imediatamente com 200 OK para o Meta não considerar o servidor offline
  res.status(200).json({ success: true });

  // 1. Verificação se é um evento direto do Meta Webhook (payload oficial do Facebook)
  if (body.object === 'page' && Array.isArray(body.entry)) {
    console.log('[Meta Webhook] Recebido disparo direto do Meta!');

    const pageToken = process.env.META_PAGE_ACCESS_TOKEN;

    for (const entry of body.entry) {
      if (Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen' && change.value && change.value.leadgen_id) {
            const leadgenId = change.value.leadgen_id;
            console.log(`[Meta Webhook] Processando leadgen_id: ${leadgenId}`);

            if (pageToken) {
              const leadData = await fetchLeadFromGraphApi(leadgenId, pageToken);
              if (leadData) {
                await handleIncomingLead({ ...leadData, origem: 'meta_ads' });
              }
            } else {
              console.warn('[Meta Webhook] ⚠️ AVISO: META_PAGE_ACCESS_TOKEN não está configurado no Render. Não foi possível buscar o nome/telefone do lead via Graph API.');
            }
          }
        }
      }
    }
    return;
  }

  // 2. Se for payload formatado (do Make ou de um formulário simplificado)
  handleIncomingLead({ ...body, origem: 'meta_ads' });
});

router.post('/google', async (req, res) => {
  res.status(200).json({ success: true });
  handleIncomingLead({ ...req.body, origem: 'google_ads' });
});

router.post('/make', async (req, res) => {
  res.status(200).json({ success: true });
  handleIncomingLead({ ...req.body, origem: 'meta_ads' });
});

export default router;
