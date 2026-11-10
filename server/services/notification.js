import { getDb } from '../database.js';

/**
 * Sends an email notification to the assigned broker for a new lead.
 * Uses Brevo HTTP API (port 443) instead of SMTP (ports 465/587)
 * because Render blocks outbound SMTP connections on free tier.
 */
export async function notifyCorretorNewLead(leadId) {
  const db = getDb();
  try {
    // 1. Fetch lead details with assigned broker info
    const lead = await db.queryOne(`
      SELECT l.*, e.nome as empreendimento_nome, u.nome as corretor_nome, u.email as corretor_email
      FROM leads l
      LEFT JOIN empreendimentos e ON l.empreendimento_interesse_id = e.id
      LEFT JOIN usuarios u ON l.corretor_id = u.id
      WHERE l.id = ?
    `, [leadId]);

    if (!lead || !lead.corretor_email) {
      console.log(`[Notification] Skip email. Lead ${leadId} has no assigned broker or broker has no email.`);
      return;
    }

    const {
      nome,
      telefone,
      email = 'Não informado',
      origem = 'meta_ads',
      empreendimento_nome = 'Ainda não definido / Aberto',
      corretor_nome,
      corretor_email
    } = lead;

    const origemLabel = origem === 'meta_ads' ? 'Meta Ads' : origem === 'google_ads' ? 'Google Ads' : 'Manual';

    console.log(`[Notification] Preparing email for ${corretor_nome} (${corretor_email}) regarding lead: ${nome}`);

    // 2. Check for Brevo API key
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL || 'econnectmarketingdigital@gmail.com';
    const senderName = process.env.SENDER_NAME || 'Health House CRM';
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

    if (!brevoApiKey) {
      console.log('----------------------------------------------------');
      console.log('📢 [E-mail Simulado - BREVO_API_KEY Não Configurado]');
      console.log(`De: ${senderName} <${senderEmail}>`);
      console.log(`Para: ${corretor_email}`);
      console.log(`Assunto: 🔥 Novo Lead no CRM: ${nome}`);
      console.log(`Dados: Tel=${telefone}, Interesse=${empreendimento_nome}`);
      console.log('----------------------------------------------------');
      return;
    }

    // 3. Build HTML email body
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0d10; color: #f3f4f6; margin: 0; padding: 20px; }
          .card { background-color: #121418; border: 1px solid rgba(0, 245, 160, 0.25); border-radius: 16px; padding: 25px; max-width: 550px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .logo { text-align: center; margin-bottom: 20px; font-weight: bold; color: #00F5A0; font-size: 24px; letter-spacing: -0.5px; }
          .title { color: #00F5A0; font-size: 20px; font-weight: 800; margin-bottom: 15px; text-transform: uppercase; letter-spacing: -0.5px; }
          .lead-info { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; margin-bottom: 20px; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
          .info-row:last-child { border-bottom: none; }
          .label { color: #9ca3af; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .val { color: #ffffff; font-weight: 600; font-size: 14px; text-align: right; }
          .btn { display: block; text-align: center; background: linear-gradient(135deg, #00F5A0, #00D68B); color: #061912 !important; font-weight: 800; text-decoration: none; padding: 12px 20px; border-radius: 10px; margin-top: 20px; box-shadow: 0 5px 15px rgba(0,245,160,0.35); text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🍀 Sheets Park CRM</div>
          <div class="title">🔥 Atenção Corretor! Novo Lead no CRM</div>
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
            Olá, <strong>${corretor_nome}</strong>. Um novo lead de interesse em loteamentos foi distribuído para a sua carteira. Faça o primeiro contato o mais rápido possível!
          </p>
          
          <div class="lead-info">
            <div class="info-row">
              <span class="label">Nome</span>
              <span class="val">${nome}</span>
            </div>
            <div class="info-row">
              <span class="label">WhatsApp / Tel</span>
              <span class="val">${telefone}</span>
            </div>
            <div class="info-row">
              <span class="label">E-mail</span>
              <span class="val">${email || 'Não informado'}</span>
            </div>
            <div class="info-row">
              <span class="label">Origem</span>
              <span class="val">${origemLabel}</span>
            </div>
            <div class="info-row">
              <span class="label">Interesse</span>
              <span class="val">${empreendimento_nome}</span>
            </div>
          </div>

          <a href="${frontendUrl}/leads/${leadId}" class="btn">Visualizar Lead no CRM</a>
        </div>
      </body>
      </html>
    `;

    // 4. Send email via Brevo HTTP API (uses HTTPS port 443 — never blocked by cloud providers)
    console.log(`[Notification] Sending email via Brevo API to ${corretor_email}...`);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [
          { email: corretor_email, name: corretor_nome }
        ],
        subject: `🔥 Atenção: Novo Lead no CRM - ${nome}`,
        htmlContent: htmlBody
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`[Notification] ✅ Email sent successfully to ${corretor_email} (Brevo messageId: ${result.messageId})`);
    } else {
      console.error(`[Notification] ❌ Brevo API error (${response.status}):`, JSON.stringify(result));
    }
  } catch (err) {
    console.error('[Notification] Failed to send email:', err.message);
  }
}

/**
 * Sends an email notification to the broker when a lead re-engages (submits the form again).
 */
export async function notifyCorretorReengajamento(leadId, novasObservacoes) {
  const db = getDb();
  try {
    const lead = await db.queryOne(`
      SELECT l.*, e.nome as empreendimento_nome, u.nome as corretor_nome, u.email as corretor_email
      FROM leads l
      LEFT JOIN empreendimentos e ON l.empreendimento_interesse_id = e.id
      LEFT JOIN usuarios u ON l.corretor_id = u.id
      WHERE l.id = ?
    `, [leadId]);

    if (!lead || !lead.corretor_email) return;

    const { nome, telefone, corretor_nome, corretor_email, empreendimento_nome } = lead;
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL || 'econnectmarketingdigital@gmail.com';
    const senderName = process.env.SENDER_NAME || 'Health House CRM';
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

    if (!brevoApiKey) {
      console.log(`📢 [E-mail Simulado - Reengajamento] Para: ${corretor_email} | Lead ${nome} preencheu novamente!`);
      return;
    }

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0d10; color: #f3f4f6; margin: 0; padding: 20px; }
          .card { background-color: #121418; border: 1px solid #ff5722; border-radius: 16px; padding: 25px; max-width: 550px; margin: 0 auto; }
          .logo { text-align: center; margin-bottom: 20px; font-weight: bold; color: #ff5722; font-size: 24px; }
          .title { color: #ff5722; font-size: 20px; font-weight: 800; margin-bottom: 15px; }
          .lead-info { background: rgba(255,87,34,0.05); border: 1px solid rgba(255,87,34,0.2); border-radius: 12px; padding: 15px; margin-bottom: 20px; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
          .label { color: #9ca3af; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .val { color: #ffffff; font-weight: 600; font-size: 14px; text-align: right; }
          .btn { display: block; text-align: center; background: linear-gradient(135deg, #ff5722, #f4511e); color: #ffffff !important; font-weight: 800; text-decoration: none; padding: 12px 20px; border-radius: 10px; margin-top: 20px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🔥 Sheets Park CRM</div>
          <div class="title">⚡ SEU CLIENTE PREENCHEU NOVAMENTE!</div>
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
            Olá, <strong>${corretor_nome}</strong>! O lead <strong>${nome}</strong>, que já está na sua carteira, acabou de preencher um anúncio novamente no Meta Ads. O cliente está muito quente!
          </p>
          <div class="lead-info">
            <div class="info-row"><span class="label">Nome</span><span class="val">${nome}</span></div>
            <div class="info-row"><span class="label">WhatsApp</span><span class="val">${telefone}</span></div>
            <div class="info-row"><span class="label">Interesse</span><span class="val">${empreendimento_nome || 'Loteamentos'}</span></div>
            ${novasObservacoes ? `<div style="margin-top: 10px; font-size: 13px; color: #ffab91;"><strong>Respostas do formulário:</strong><br/>${novasObservacoes}</div>` : ''}
          </div>
          <a href="${frontendUrl}/leads/${leadId}" class="btn">Abrir Lead no CRM e Chamar no WhatsApp</a>
        </div>
      </body>
      </html>
    `;

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoApiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: corretor_email, name: corretor_nome }],
        subject: `🔥 URGENTE: Seu cliente ${nome} preencheu o anúncio novamente!`,
        htmlContent: htmlBody
      })
    });
    console.log(`[Notification] ✅ E-mail de reengajamento enviado para ${corretor_email}!`);
  } catch (err) {
    console.error('[Notification] Erro ao enviar notificação de reengajamento:', err);
  }
}

