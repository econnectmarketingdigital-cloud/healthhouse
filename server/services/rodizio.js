import { getDb } from '../database.js';

export const isRodizioAtivo = async () => {
  const db = getDb();
  const config = await db.queryOne("SELECT valor FROM configuracoes WHERE chave = 'rodizio_ativo'");
  return config && (config.valor === 'true' || config.valor === '1');
};

/**
 * Rodízio único (fila geral) balanceado por peso de cada corretor.
 * peso 0 = não recebe | 1 = normal | 2 = recebe o dobro.
 */
export const getNextCorretor = async (origem, campanha = '') => {
  const db = getDb();
  if (!(await isRodizioAtivo())) return null;

  const filaKey = 'geral';

  const corretores = await db.query(`
    SELECT id, nome, COALESCE(peso_rodizio, 1) as peso FROM usuarios 
    WHERE ativo = 1 AND disponivel_rodizio = 1 AND pausado_rodizio = 0 AND COALESCE(peso_rodizio, 1) > 0
    ORDER BY nome ASC
  `);

  if (corretores.length === 0) return null;

  // Monta fila balanceada intercalando por peso
  const maxPeso = Math.max(...corretores.map(c => c.peso));
  const fila = [];
  for (let round = 1; round <= maxPeso; round++) {
    for (const c of corretores) {
      if (c.peso >= round) fila.push(c);
    }
  }
  if (fila.length === 0) return null;

  const estado = await db.queryOne('SELECT posicao FROM rodizio_estado WHERE origem = ?', [filaKey]);
  let nextIndex = 0;
  if (estado && estado.posicao !== undefined && estado.posicao !== null) {
    nextIndex = (estado.posicao + 1) % fila.length;
  }

  const nextCorretor = fila[nextIndex];

  await db.execute(`
    INSERT INTO rodizio_estado (id, origem, ultimo_corretor_id, posicao, updated_at) 
    VALUES (gen_random_uuid(), ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(origem) DO UPDATE SET 
      ultimo_corretor_id = EXCLUDED.ultimo_corretor_id,
      posicao = EXCLUDED.posicao,
      updated_at = CURRENT_TIMESTAMP
  `, [filaKey, nextCorretor.id, nextIndex]);

  console.log(`[Rodízio] Lead (${campanha || origem}) distribuído para: ${nextCorretor.nome} (Posição ${nextIndex + 1}/${fila.length})`);
  return nextCorretor.id;
};
