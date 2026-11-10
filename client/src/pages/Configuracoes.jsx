import React, { useState, useEffect } from 'react';
import { FiSave } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

export default function Configuracoes() {
  const [config, setConfig] = useState({
    rodizio_ativo: 'false',
    rodizio_timeout_horas: '',
    reserva_prazo_horas: '',
    alerta_sem_contato_horas: '',
    meta_vgv_equipe: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await api.config.getConfig();
      if (Array.isArray(data)) {
        const configObj = { ...config };
        data.forEach(item => {
          if (configObj.hasOwnProperty(item.chave)) {
            configObj[item.chave] = item.valor;
          }
        });
        setConfig(configObj);
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.config.updateConfig(config);
      addToast({ type: 'success', title: 'Sucesso', message: 'Configurações atualizadas com sucesso!' });
    } catch (err) {
      addToast({ type: 'error', title: 'Erro', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-[var(--color-text-secondary)]">Carregando configurações...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="font-heading" style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--color-primary)' }}>Configurações do Sistema</h1>
      
      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.25rem' }}>Rodízio de Leads Ativo</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Ativar ou desativar a distribuição automática</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                name="rodizio_ativo"
                checked={config.rodizio_ativo === 'true'}
                onChange={handleChange}
                style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label>Timeout sem contato (horas)</label>
              <input
                type="number"
                name="rodizio_timeout_horas"
                value={config.rodizio_timeout_horas}
                onChange={handleChange}
                className="input"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>Lead é reatribuído se não contatado neste prazo.</p>
            </div>

            <div className="input-group">
              <label>Alerta de Inatividade (horas)</label>
              <input
                type="number"
                name="alerta_sem_contato_horas"
                value={config.alerta_sem_contato_horas}
                onChange={handleChange}
                className="input"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>Avisa no dashboard após este tempo sem ação.</p>
            </div>

            <div className="input-group">
              <label>Prazo de Reserva (horas)</label>
              <input
                type="number"
                name="reserva_prazo_horas"
                value={config.reserva_prazo_horas}
                onChange={handleChange}
                className="input"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>Tempo até a unidade voltar a ficar disponível.</p>
            </div>

            <div className="input-group">
              <label>Meta VGV Equipe (Mensal)</label>
              <input
                type="number"
                name="meta_vgv_equipe"
                value={config.meta_vgv_equipe}
                onChange={handleChange}
                className="input"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>Valor Global de Vendas esperado para o time inteiro.</p>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FiSave />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
