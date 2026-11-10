import './env.js';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Migração complementar: adapta o schema para corretagem de PLANOS DE SAÚDE
// e cadastra as operadoras/produtos iniciais (tabela "empreendimentos" = produtos/operadoras).

const { Client } = pg;

const clientConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 6543),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    };

const OPERADORAS = [
  {
    nome: 'Select Saúde',
    incorporadora: 'Select',
    tipo: 'PF / PME',
    endereco: 'São Luís e região metropolitana (MA)',
    descricao: 'Planos individuais/familiares e PME com e sem coparticipação. Rede própria e credenciada em São Luís.'
  },
  {
    nome: 'Humana Saúde',
    incorporadora: 'Humana',
    tipo: 'PF / Adesão',
    endereco: 'São Luís (MA) — Rede Vital / Hospital Maranhense',
    descricao: 'Linhas Vital São Luís (coparticipação completa e básica) e Referência (sem coparticipação).'
  },
  {
    nome: 'Nosso Plano',
    incorporadora: 'Nosso Plano',
    tipo: 'PF / PME',
    endereco: 'Maranhão',
    descricao: 'Planos regionais com excelente custo-benefício para pessoa física e pequenas empresas.'
  },
  {
    nome: 'Amil',
    incorporadora: 'Amil',
    tipo: 'PME',
    endereco: 'Nacional — rede forte em São Luís (São Domingos, UDI, Natus Lumine...)',
    descricao: 'Linhas Amil Prata (enfermaria) e Amil Ouro (apartamento) para empresas a partir de 2 vidas.'
  },
  {
    nome: 'Unimed',
    incorporadora: 'Unimed',
    tipo: 'Adesão / PME',
    endereco: 'Nacional — Seguros Unimed / Administradoras de Benefício',
    descricao: 'Planos por adesão via entidades de classe e planos empresariais com abrangência nacional.'
  }
];

async function run() {
  const client = new Client(clientConfig);
  await client.connect();
  console.log('⚡ Conectado. Aplicando adaptações para Planos de Saúde...');

  try {
    // Colunas exigidas pelo código (rodízio, perfil etc.)
    await client.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS peso_rodizio INT DEFAULT 1;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE rodizio_estado ADD COLUMN IF NOT EXISTS posicao INT DEFAULT 0;

      -- Dados específicos do lead de plano de saúde
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS qtd_vidas INT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS tipo_plano VARCHAR(50);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS idades TEXT;

      -- Dados do contrato fechado
      ALTER TABLE propostas ADD COLUMN IF NOT EXISTS qtd_vidas INT;
      ALTER TABLE propostas ADD COLUMN IF NOT EXISTS plano_nome VARCHAR(255);
    `);
    console.log('✅ Colunas adicionadas.');

    // Unidade não precisa mais de número obrigatório preenchido manualmente (usada só como registro de venda)
    await client.query(`ALTER TABLE unidades ALTER COLUMN numero DROP NOT NULL;`);

    for (const op of OPERADORAS) {
      const exists = await client.query('SELECT id FROM empreendimentos WHERE nome = $1', [op.nome]);
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO empreendimentos (id, nome, endereco, incorporadora, tipo, descricao) VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), op.nome, op.endereco, op.incorporadora, op.tipo, op.descricao]
        );
      }
    }
    console.log(`✅ ${OPERADORAS.length} operadoras cadastradas.`);
    console.log('🚀 Adaptação concluída!');
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    await client.end();
  }
}

run();
