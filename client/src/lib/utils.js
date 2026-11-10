import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getWhatsAppUrl(phone) {
  if (!phone) return '#';
  let digits = phone.replace(/\D/g, '');
  while (digits.startsWith('5555')) {
    digits = digits.substring(2);
  }
  if (!digits.startsWith('55')) {
    digits = '55' + digits;
  }
  return `https://wa.me/${digits}`;
}

// Funil de vendas de planos de saúde (ordem do Kanban)
export const ETAPAS_FUNIL = [
  { id: 'novo', title: 'Novo', color: '#3498db' },
  { id: 'contato_feito', title: 'Em Contato', color: '#f1c40f' },
  { id: 'orcamento_enviado', title: 'Orçamento Enviado', color: '#00C6FF' },
  { id: 'proposta', title: 'Em Negociação', color: '#e67e22' },
  { id: 'documentacao', title: 'Documentação / Implantação', color: '#8e44ad' },
  { id: 'fechado', title: 'Fechado', color: '#2ecc71' },
  { id: 'perdido', title: 'Perdido/S. Resposta', color: '#e74c3c' },
];

export const ETAPA_LABELS = Object.fromEntries(ETAPAS_FUNIL.map(e => [e.id, e.title]));

export const getEtapaLabel = (etapa) => ETAPA_LABELS[etapa] || etapa;
export const getEtapaColor = (etapa) => ETAPAS_FUNIL.find(e => e.id === etapa)?.color || '#95a5a6';

export const TIPOS_PLANO = ['Individual', 'Familiar', 'PME', 'Adesão'];

export function getCampanhaBadge(campanha, empNome) {
  const rawText = empNome || campanha;
  if (!rawText || rawText === 'Meta Ads' || rawText === 'manual' || rawText === 'google_ads') return null;

  const lower = `${campanha || ''} ${empNome || ''}`.toLowerCase();

  if (lower.includes('select')) {
    return { label: '💙 Select Saúde', bg: 'rgba(0, 198, 255, 0.18)', color: '#00C6FF', border: 'rgba(0, 198, 255, 0.45)' };
  }
  if (lower.includes('humana') || lower.includes('vital')) {
    return { label: '🏥 Humana Saúde', bg: 'rgba(16, 185, 129, 0.18)', color: '#10B981', border: 'rgba(16, 185, 129, 0.45)' };
  }
  if (lower.includes('hapvida') || lower.includes('nosso plano')) {
    return { label: '🧡 Hapvida / Nosso Plano', bg: 'rgba(249, 115, 22, 0.18)', color: '#FB923C', border: 'rgba(249, 115, 22, 0.45)' };
  }
  if (lower.includes('amil')) {
    return { label: '💎 Amil', bg: 'rgba(59, 130, 246, 0.18)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.45)' };
  }
  if (lower.includes('unimed') || lower.includes('qualicorp')) {
    return { label: '💚 Unimed / Adesão', bg: 'rgba(34, 197, 94, 0.18)', color: '#4ADE80', border: 'rgba(34, 197, 94, 0.45)' };
  }
  if (lower.includes('bradesco') || lower.includes('sulamerica') || lower.includes('sulamérica')) {
    return { label: '🛡️ Bradesco / SulAmérica', bg: 'rgba(244, 63, 94, 0.18)', color: '#FB7185', border: 'rgba(244, 63, 94, 0.45)' };
  }
  if (lower.includes('pme') || lower.includes('empresarial') || lower.includes('cnpj')) {
    return { label: '🏢 Plano PME / Empresarial', bg: 'rgba(168, 85, 247, 0.18)', color: '#C084FC', border: 'rgba(168, 85, 247, 0.45)' };
  }
  if (lower.includes('familiar') || lower.includes('familia') || lower.includes('família')) {
    return { label: '👨‍👩‍👧‍👦 Plano Familiar', bg: 'rgba(251, 191, 36, 0.18)', color: '#FBBF24', border: 'rgba(251, 191, 36, 0.45)' };
  }
  if (lower.includes('individual') || lower.includes('pf') || lower.includes('adesao') || lower.includes('adesão')) {
    return { label: '👤 Individual / Adesão', bg: 'rgba(56, 189, 248, 0.18)', color: '#38BDF8', border: 'rgba(56, 189, 248, 0.45)' };
  }

  const cleanLabel = rawText.replace(/campanha\s*[-_:]?\s*/i, '').trim();
  return { label: `🩺 ${cleanLabel}`, bg: 'rgba(0, 198, 255, 0.12)', color: '#7DD3FC', border: 'rgba(0, 198, 255, 0.3)' };
}
