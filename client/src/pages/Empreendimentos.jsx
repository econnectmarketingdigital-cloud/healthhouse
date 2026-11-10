import React, { useState, useEffect } from 'react';
import { FiPlus, FiMapPin, FiUsers, FiEdit2, FiTrash2, FiX, FiSave } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getCampanhaBadge } from '../lib/utils';

const EMPTY_FORM = { nome: '', incorporadora: '', tipo: 'PF / PME', endereco: '', valor_min: '', comissao_percentual: '', descricao: '' };

export default function Empreendimentos() {
  const [operadoras, setOperadoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { addToast } = useToast();
  const isGestor = user?.role === 'gestor';

  useEffect(() => {
    fetchOperadoras();
  }, []);

  const fetchOperadoras = async () => {
    try {
      setLoading(true);
      const data = await api.empreendimentos.getEmpreendimentos();
      setOperadoras(data || []);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar operadoras', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (op) => {
    setEditingId(op.id);
    setForm({
      nome: op.nome || '', incorporadora: op.incorporadora || '', tipo: op.tipo || '',
      endereco: op.endereco || '', valor_min: op.valor_min || '', comissao_percentual: op.comissao_percentual || '',
      descricao: op.descricao || ''
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return addToast('Informe o nome da operadora/produto', 'error');
    const payload = {
      ...form,
      valor_min: form.valor_min ? parseFloat(form.valor_min) : null,
      comissao_percentual: form.comissao_percentual ? parseFloat(form.comissao_percentual) : null,
    };
    try {
      setSaving(true);
      if (editingId) await api.empreendimentos.updateEmpreendimento(editingId, payload);
      else await api.empreendimentos.createEmpreendimento(payload);
      addToast('Operadora salva com sucesso!', 'success');
      setShowForm(false);
      fetchOperadoras();
    } catch (err) {
      addToast(err.message || 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (op) => {
    if (!window.confirm(`Excluir a operadora "${op.nome}"? Os leads vinculados ficarão sem operadora definida.`)) return;
    try {
      await api.empreendimentos.deleteEmpreendimento(op.id);
      addToast('Operadora excluída', 'success');
      fetchOperadoras();
    } catch (err) {
      addToast(err.message || 'Erro ao excluir', 'error');
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Carregando operadoras...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', margin: 0, fontWeight: 800 }}>Planos & Operadoras</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
            Operadoras trabalhadas. O nome cadastrado aqui é usado para identificar automaticamente a operadora dos leads das campanhas.
          </p>
        </div>
        {isGestor && (
          <button onClick={openNew} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <FiPlus /> Nova Operadora
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
        {operadoras.map((op) => {
          const badge = getCampanhaBadge(op.nome, op.nome);
          return (
            <div key={op.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', borderTop: `3px solid ${badge?.color || '#00C6FF'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '8px' }}>
                <h2 className="font-heading" style={{ fontSize: '1.3rem', margin: 0, fontWeight: 800, color: '#FFFFFF' }}>{op.nome}</h2>
                <span style={{
                  backgroundColor: badge?.bg, color: badge?.color, border: `1px solid ${badge?.border}`,
                  padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap'
                }}>
                  {op.tipo || 'Plano de Saúde'}
                </span>
              </div>

              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.5', flex: 1 }}>
                {op.descricao || 'Sem descrição.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                {op.endereco && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                    <FiMapPin color="#00C6FF" /> {op.endereco}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                  <FiUsers color="#00C6FF" /> {op.vendidas || 0} contrato(s) fechado(s)
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.5px', display: 'block' }}>
                    {op.valor_min ? 'Mensalidade a partir de' : 'Comissão'}
                  </span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00C6FF' }}>
                    {op.valor_min ? formatCurrency(op.valor_min) : (op.comissao_percentual ? `${op.comissao_percentual}%` : '—')}
                  </div>
                </div>
                {isGestor && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEdit(op)} className="btn btn-secondary btn-sm" title="Editar"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(op)} className="btn btn-secondary btn-sm" style={{ color: '#F43F5E' }} title="Excluir"><FiTrash2 /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {operadoras.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
            Nenhuma operadora cadastrada.
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)', padding: '1rem' }}>
          <form onSubmit={handleSave} className="card" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="font-heading" style={{ margin: 0, color: '#00C6FF' }}>{editingId ? 'Editar Operadora' : 'Nova Operadora'}</h3>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}><FiX size={20} /></button>
            </div>

            {[
              { key: 'nome', label: 'Nome exibido (ex: Select Saúde) *' },
              { key: 'incorporadora', label: 'Palavra-chave da operadora (ex: Select) — usada para reconhecer nas campanhas' },
              { key: 'tipo', label: 'Modalidades (ex: PF / PME / Adesão)' },
              { key: 'endereco', label: 'Abrangência / Rede principal' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>{f.label}</label>
                <input className="input" style={{ width: '100%' }} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>Mensalidade a partir de (R$)</label>
                <input type="number" step="0.01" className="input" style={{ width: '100%' }} value={form.valor_min} onChange={e => setForm({ ...form, valor_min: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>Comissão (%)</label>
                <input type="number" step="0.1" className="input" style={{ width: '100%' }} value={form.comissao_percentual} onChange={e => setForm({ ...form, comissao_percentual: e.target.value })} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>Descrição / Produtos</label>
              <textarea rows="3" className="input" style={{ width: '100%', resize: 'vertical' }} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiSave /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
