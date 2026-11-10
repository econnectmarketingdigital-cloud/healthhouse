import './env.js';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const { Client } = pg;

async function migrate() {
  const clientConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST || 'aws-1-us-east-1.pooler.supabase.com',
        port: Number(process.env.DB_PORT || 6543),
        database: process.env.DB_NAME || 'postgres',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
      };

  const client = new Client(clientConfig);
  await client.connect();
  console.log('⚡ Conectado ao novo banco Supabase para migração...');

  try {
    // 1. Create Tables (complete schema including push_subscriptions and re-engagement columns)
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave VARCHAR(100) PRIMARY KEY,
        valor TEXT
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        telefone VARCHAR(50),
        senha_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'corretor',
        ativo INT DEFAULT 1,
        disponivel_rodizio INT DEFAULT 1,
        pausado_rodizio INT DEFAULT 0,
        meta_vgv_pessoal NUMERIC DEFAULT 0,
        avatar_cor VARCHAR(50),
        avatar_url TEXT,
        wallpaper_url TEXT,
        wallpaper_position TEXT DEFAULT 'center center',
        pesos_campanhas TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS empreendimentos (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        endereco TEXT,
        incorporadora VARCHAR(255),
        tipo VARCHAR(50) NOT NULL,
        faixa_mcmv VARCHAR(50),
        valor_min NUMERIC,
        valor_max NUMERIC,
        comissao_percentual NUMERIC DEFAULT 5.0,
        total_unidades INT DEFAULT 0,
        descricao TEXT,
        ativo INT DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS blocos (
        id VARCHAR(50) PRIMARY KEY,
        empreendimento_id VARCHAR(50) REFERENCES empreendimentos(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS unidades (
        id VARCHAR(50) PRIMARY KEY,
        bloco_id VARCHAR(50) REFERENCES blocos(id) ON DELETE SET NULL,
        empreendimento_id VARCHAR(50) REFERENCES empreendimentos(id) ON DELETE CASCADE,
        numero VARCHAR(50) NOT NULL,
        tipologia VARCHAR(100),
        area_m2 NUMERIC,
        valor NUMERIC,
        status VARCHAR(50) DEFAULT 'disponivel',
        andar INT,
        posicao VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(50),
        email VARCHAR(255),
        origem VARCHAR(50) DEFAULT 'manual',
        campanha VARCHAR(255),
        anuncio VARCHAR(255),
        corretor_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE SET NULL,
        etapa VARCHAR(50) DEFAULT 'novo',
        empreendimento_interesse_id VARCHAR(50) REFERENCES empreendimentos(id) ON DELETE SET NULL,
        observacoes TEXT,
        ultimo_contato TIMESTAMP WITH TIME ZONE,
        proximo_followup TIMESTAMP WITH TIME ZONE,
        perdido_motivo TEXT,
        faixa_renda VARCHAR(100),
        reengajado BOOLEAN DEFAULT false,
        reengajado_em TIMESTAMP WITH TIME ZONE,
        vezes_convertido INT DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lead_historico (
        id VARCHAR(50) PRIMARY KEY,
        lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
        corretor_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE SET NULL,
        tipo VARCHAR(50),
        descricao TEXT,
        etapa_anterior VARCHAR(50),
        etapa_nova VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reservas (
        id VARCHAR(50) PRIMARY KEY,
        unidade_id VARCHAR(50) REFERENCES unidades(id) ON DELETE CASCADE,
        lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
        corretor_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'ativa',
        prazo_expiracao TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS propostas (
        id VARCHAR(50) PRIMARY KEY,
        lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE CASCADE,
        unidade_id VARCHAR(50) REFERENCES unidades(id) ON DELETE SET NULL,
        corretor_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE SET NULL,
        valor_venda NUMERIC,
        comissao_valor NUMERIC,
        status VARCHAR(50) DEFAULT 'em_analise',
        data_proposta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        data_fechamento TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS rodizio_estado (
        id VARCHAR(50) PRIMARY KEY,
        origem VARCHAR(50) UNIQUE NOT NULL,
        ultimo_corretor_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE SET NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS metas (
        id VARCHAR(50) PRIMARY KEY,
        corretor_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo VARCHAR(50) DEFAULT 'vgv',
        valor_meta NUMERIC NOT NULL,
        mes INT NOT NULL,
        ano INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id VARCHAR(50) PRIMARY KEY,
        usuario_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Todas as tabelas criadas no Supabase com sucesso!');

    // 2. Insert Default Configurations
    const configs = [
      ['rodizio_ativo', 'true'],
      ['rodizio_timeout_horas', '2'],
      ['reserva_prazo_horas', '48'],
      ['sla_redistribuicao_minutos', '30'],
      ['meta_vgv_equipe', '10000000']
    ];
    for (const [chave, valor] of configs) {
      await client.query(
        'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING',
        [chave, valor]
      );
    }

    // 3. Insert Default Gestores & Admins
    const defaultUsers = [
      { nome: 'Administrador Health House', email: 'admin@healthhouse.com.br', role: 'gestor', pass: 'admin123' },
      { nome: 'Gabriel Lucas', email: 'ogabriellucaz08@gmail.com', role: 'gestor', pass: 'admin123' },
      { nome: 'Agência eConnect', email: 'econnectmarketingdigital@gmail.com', role: 'gestor', pass: 'admin123' },
      { nome: 'Agência iConnect', email: 'iconnectmarketingdigital@gmail.com', role: 'gestor', pass: 'admin123' }
    ];

    for (const u of defaultUsers) {
      await client.query(`
        INSERT INTO usuarios (id, nome, email, senha_hash, role, ativo, disponivel_rodizio)
        VALUES ($1, $2, $3, $4, $5, 1, $6)
        ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, ativo = 1;
      `, [uuidv4(), u.nome, u.email.toLowerCase().trim(), bcrypt.hashSync(u.pass, 10), u.role, u.role === 'corretor' ? 1 : 0]);
    }

    console.log('🚀 Migração para o Supabase concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    await client.end();
  }
}

migrate();
