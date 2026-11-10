import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FiCheck, FiX } from 'react-icons/fi';

export default function ModalFechamentoVenda({ isOpen, onClose, leadId, onSuccess }) {
  const { addToast } = useToast();
  const [operadoras, setOperadoras] = useState([]);
  const [operadoraId, setOperadoraId] = useState('');
  const [planoNome, setPlanoNome] = useState('');
  const [qtdVidas, setQtdVidas] = useState('1');
  const [valorVenda, setValorVenda] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) fetchOperadoras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const formatBRL = (number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);

  const fetchOperadoras = async () => {
    try {
      const [data, lead] = await Promise.all([
        api.empreendimentos.getEmpreendimentos(),
        leadId ? api.leads.getLead(leadId).catch(() => null) : null
      ]);
      setOperadoras(data || []);
      // Pré-seleciona a operadora/vidas do lead
      if (lead?.empreendimento_interesse_id) setOperadoraId(lead.empreendimento_interesse_id);
      else if (data && data.length > 0) setOperadoraId(data[0].id);
      if (lead?.qtd_vidas) setQtdVidas(String(lead.qtd_vidas));
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const formatCurrencyInput = (value) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    return formatBRL(parseInt(clean, 10) / 100);
  };

  const getRawValue = (formatted) => {
    if (!formatted) return 0;
    return parseInt(formatted.replace(/\D/g, ''), 10) / 100;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valorReal = getRawValue(valorVenda);
    if (!operadoraId || valorReal <= 0) {
      addToast('Selecione a operadora e informe o valor da mensalidade.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.leads.fecharVenda(leadId, {
        empreendimento_id: operadoraId,
        valor_venda: valorReal,
        qtd_vidas: parseInt(qtdVidas, 10) || 1,
        plano_nome: planoNome.trim() || null
      });
      addToast('🎉 Contrato registrado! Faturamento e ranking atualizados.', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      addToast(err.message || 'Erro ao registrar contrato', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const labelStyle = { display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '20px', padding: '2rem', border: '1px solid rgba(0, 198, 255, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 className="font-heading" style={{ fontSize: '1.5rem', margin: 0, color: '#00C6FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💙 Registrar Contrato Fechado
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              Parabéns! Preencha os dados do plano para contabilizar no seu faturamento e ranking.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <FiX size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={labelStyle}>Operadora</label>
            <select className="input" value={operadoraId} onChange={e => setOperadoraId(e.target.value)} required style={{ width: '100%' }}>
              <option value="" disabled>Selecione a operadora</option>
              {operadoras.map(op => (
                <option key={op.id} value={op.id}>{op.nome}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Plano / Produto</label>
              <input className="input" value={planoNome} onChange={e => setPlanoNome(e.target.value)} placeholder="Ex: Vital Coparticipação" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={labelStyle}>Vidas</label>
              <input type="number" min="1" className="input" value={qtdVidas} onChange={e => setQtdVidas(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Valor da Mensalidade Total (R$)</label>
            <input
              type="text"
              className="input"
              value={valorVenda}
              onChange={e => setValorVenda(formatCurrencyInput(e.target.value))}
              placeholder="R$ 0,00"
              required
              style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#00C6FF', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <FiCheck /> {submitting ? 'Salvando...' : 'Confirmar Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
