import { getDb } from '../database.js';

export const normalizePhone = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('55')) {
     return digits.substring(2);
  }
  return digits || null;
};

export const findExistingLead = async (telefone, email) => {
  const db = getDb();
  
  if (telefone) {
    const digits = telefone.toString().replace(/\D/g, '');
    const last8 = digits.slice(-8);
    if (last8.length >= 8) {
      const leadByPhone = await db.queryOne(`
        SELECT * FROM leads 
        WHERE RIGHT(REGEXP_REPLACE(telefone, '\\D', '', 'g'), 8) = $1
        LIMIT 1
      `, [last8]);
      if (leadByPhone) return leadByPhone;
    }
  }

  if (email && email.toString().trim() !== '') {
    const leadByEmail = await db.queryOne('SELECT * FROM leads WHERE LOWER(email) = LOWER($1) LIMIT 1', [email.toString().trim()]);
    if (leadByEmail) return leadByEmail;
  }

  return null;
};
