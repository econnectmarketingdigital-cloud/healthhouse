import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FiUserPlus, FiArrowLeft, FiSave } from 'react-icons/fi';
import { TIPOS_PLANO } from '../lib/utils';

const formatPhone = (val) => {
  let v = val.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  if (v.length > 10) v = `${v.slice(0,10)}-${v.slice(10)}`;
  return v;
};

const labelStyle = { display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' };

export default function NovoLead() {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    empreendimento_interesse_id: '',
    tipo_plano: '',
    qtd_vidas: '',
    idades: '',
    observacoes: ''
  });
  const [operadoras, setOperadoras] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    api.empreendimentos.getEmpreendimentos()
      .then(data => setOperadoras(data || []))
      .catch(() => addToast('Erro ao carregar operadoras', 'error'));
  }, [addToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'telefone' ? formatPhone(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.telefone) {
      return addToast('Nome e telefone são obrigatórios', 'error');
    }
    
    setLoading(true);
    try {
      const op = operadoras.find(o => o.id === formData.empreendimento_interesse_id);
      await api.leads.createLead({
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        email: formData.email && formData.email.trim() ? formData.email.trim() : null,
        empreendimento_interesse_id: formData.empreendimento_interesse_id || null,
        campanha: op ? op.nome : null,
        tipo_plano: formData.tipo_plano || null,
        qtd_vidas: formData.qtd_vidas || null,
        idades: formData.idades.trim() || null,
        observacoes: formData.observacoes && formData.observacoes.trim() ? formData.observacoes.trim() : null,
        origem: 'manual'
      });
      addToast('Lead cadastrado com sucesso!', 'success');
      navigate('/kanban');
    } catch (err) {
      addToast(err.message || 'Erro ao cadastrar lead', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiArrowLeft /> Voltar
        </button>
        <h1 className="font-heading" style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiUserPlus style={{ color: '#00C6FF' }} /> Novo Lead
        </h1>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Nome Completo *</label>
            <input type="text" name="nome" value={formData.nome} onChange={handleChange} required placeholder="Ex: Maria da Silva" className="input" style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>WhatsApp / Telefone *</label>
              <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} required placeholder="(98) 98445-3529" className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={labelStyle}>E-mail</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="cliente@email.com" className="input" style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Operadora de Interesse</label>
              <select name="empreendimento_interesse_id" value={formData.empreendimento_interesse_id} onChange={handleChange} className="input" style={{ width: '100%' }}>
                <option value="">Ainda não definida</option>
                {operadoras.map(op => (
                  <option key={op.id} value={op.id}>{op.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tipo de Plano</label>
              <select name="tipo_plano" value={formData.tipo_plano} onChange={handleChange} className="input" style={{ width: '100%' }}>
                <option value="">Não informado</option>
                {TIPOS_PLANO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Qtd. de Vidas</label>
              <input type="number" min="1" name="qtd_vidas" value={formData.qtd_vidas} onChange={handleChange} placeholder="Ex: 3" className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={labelStyle}>Idades dos Beneficiários</label>
              <input type="text" name="idades" value={formData.idades} onChange={handleChange} placeholder="Ex: 34, 32, 5" className="input" style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Observações</label>
            <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows="4" placeholder="Ex: Já possui plano, quer reduzir o valor. Precisa de rede com Hospital São Domingos..." className="input" style={{ width: '100%', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.75rem' }}>
              <FiSave /> {loading ? 'Salvando...' : 'Salvar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
