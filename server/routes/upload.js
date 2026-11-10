import '../env.js';
import express from 'express';
import sharp from 'sharp';
import { authenticateToken } from '../middleware/auth.js';
import { getDb } from '../database.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase Configuration via .env
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

async function ensureBucket() {
  if (!supabase) {
    console.warn('[Upload] ⚠️ SUPABASE_URL / SUPABASE_SERVICE_KEY não configurados no .env.');
    return;
  }
  try {
    const { error } = await supabase.storage.getBucket(BUCKET_NAME);
    if (error && error.message.includes('not found')) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024 // 5MB
      });
      console.log(`[Upload] ✅ Bucket '${BUCKET_NAME}' criado no Supabase!`);
    } else if (!error) {
      console.log(`[Upload] ✅ Bucket '${BUCKET_NAME}' já existe no Supabase.`);
    }
  } catch (err) {
    console.error('[Upload] ❌ Erro ao verificar bucket:', err.message);
  }
}
ensureBucket();

router.post('/', authenticateToken, async (req, res) => {
  const db = getDb();
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase Storage não configurado no .env' });
    }

    const { image, type = 'wallpaper' } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'Nenhuma imagem fornecida' });
    }

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(image, 'base64');
    }

    const filename = `${type}-${req.user.id}-${Date.now()}.webp`;
    let processedBuffer;

    if (type === 'avatar') {
      processedBuffer = await sharp(buffer)
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer();
    } else {
      processedBuffer = await sharp(buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, processedBuffer, {
        contentType: 'image/webp',
        upsert: true
      });

    if (uploadError) {
      console.error('[Upload] Supabase upload error:', uploadError);
      return res.status(500).json({ success: false, error: 'Erro no Storage: ' + uploadError.message });
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;
    console.log(`[Upload] ✅ Imagem salva no Supabase: ${publicUrl}`);

    if (type === 'avatar') {
      await db.execute('UPDATE usuarios SET avatar_url = ? WHERE id = ?', [publicUrl, req.user.id]);
    } else {
      await db.execute('UPDATE usuarios SET wallpaper_url = ? WHERE id = ?', [publicUrl, req.user.id]);
    }

    return res.json({ success: true, url: publicUrl, data: { url: publicUrl } });
  } catch (error) {
    console.error('[Upload] Erro geral:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao processar imagem: ' + error.message });
  }
});

export default router;
