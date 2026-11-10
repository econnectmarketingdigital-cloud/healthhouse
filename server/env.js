import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega variáveis do arquivo .env automaticamente sem depender de pacotes externos
const possiblePaths = [
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server', '.env')
];

for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
    break;
  }
}
