import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Rodizio = () => {
  const [config, setConfig] = useState(null);
  const [corretores, setCorretores] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDados = async () => {
    try {
      setLoading(true);
      const conf = await api.config.getConfig();
      const corrs = await api.rodizio.getCorretoresRodizio();
      setConfig(conf);
      setCorretores(corrs || []);
    } catch (error) {
      console.error('Erro ao buscar dados do rodízio:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const handleConfigChange = async (key, value) => {
    try {
      await api.config.updateConfig({ [key]: value });
      setConfig(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      alert('Erro ao atualizar configuração');
    }
  };

  const toggleDisponivel = async (id, disponivelAtual) => {
    try {
      await api.rodizio.toggleDisponivel(id, !disponivelAtual);
      setCorretores(prev => prev.map(c => c.id === id ? { ...c, disponivel_rodizio: !disponivelAtual ? 1 : 0 } : c));
    } catch (error) {
      console.error('Erro ao alterar disponibilidade:', error);
      alert('Erro ao alterar disponibilidade');
    }
  };

  const forcarPausa = async (id) => {
    try {
      await api.rodizio.pausarCorretor(id, true);
      setCorretores(prev => prev.map(c => c.id === id ? { ...c, pausado_rodizio: 1 } : c));
    } catch (error) {
      console.error('Erro ao forçar pausa:', error);
      alert('Erro ao forçar pausa');
    }
  };

  const handlePesoChange = async (id, val) => {
    const numVal = parseInt(val, 10) || 0;
    try {
      await api.rodizio.updatePesosCorretor(id, { peso_rodizio: numVal });
      setCorretores(prev => prev.map(c => c.id === id ? { ...c, peso_rodizio: numVal } : c));
    } catch (error) {
      console.error('Erro ao atualizar peso:', error);
      alert('Erro ao atualizar peso');
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Gerenciamento de Rodízio</h1>
        <p className="text-secondary">Controle a distribuição automática dos leads de campanhas de planos de saúde e a disponibilidade da equipe.</p>
      </header>

      {config && (
        <section className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Configurações Gerais</h2>
          
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="rodizioAtivo" style={{ fontWeight: '500' }}>Rodízio Ativo:</label>
              <input
                id="rodizioAtivo"
                type="checkbox"
                checked={config.rodizio_ativo === 1 || config.rodizio_ativo === 'true' || config.rodizio_ativo === '1'}
                onChange={(e) => handleConfigChange('rodizio_ativo', e.target.checked ? 1 : 0)}
                style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="slaMinutos" style={{ fontWeight: '500' }}>SLA de Atendimento (minutos):</label>
              <input
                id="slaMinutos"
                type="number"
                min="1"
                className="input"
                value={config.sla_redistribuicao_minutos || 15}
                onChange={(e) => handleConfigChange('sla_redistribuicao_minutos', parseInt(e.target.value))}
                style={{ width: '80px' }}
              />
            </div>
          </div>
          
          <div style={{ 
            marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', 
            backgroundColor: 'rgba(0, 198, 255, 0.08)',
            border: '1px solid rgba(0, 198, 255, 0.25)',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <div>
              <strong style={{ display: 'block', color: '#00C6FF' }}>
                Distribuição Equilibrada Inteligente
              </strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Os novos leads recebidos via Meta Ads/Google Ads são distribuídos automaticamente em fila circular entre os corretores online e em plantão.
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Equipe no Rodízio</h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Corretor</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Peso no Rodízio</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Status (Online/Offline)</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Plantão do Dia</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {corretores.map((corretor) => {
                const isOnline = corretor.pausado_rodizio === 0;
                const isDisponivel = corretor.disponivel_rodizio === 1;
                const peso = corretor.peso_rodizio ?? 1;

                return (
                  <tr key={corretor.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '600' }}>{corretor.nome}</div>
                      <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{corretor.email}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <select
                        className="input"
                        value={peso}
                        onChange={(e) => handlePesoChange(corretor.id, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          border: peso > 0 ? '1px solid rgba(0, 198, 255, 0.4)' : '1px solid var(--color-border)',
                          backgroundColor: peso > 0 ? 'rgba(0, 198, 255, 0.08)' : 'transparent',
                          color: peso > 0 ? '#00C6FF' : 'var(--color-text-secondary)'
                        }}
                      >
                        <option value={0}>Pausado (0)</option>
                        <option value={1}>Ativo — Peso 1 (Padrão)</option>
                        <option value={2}>Prioridade — Peso 2 (Dobro)</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          width: '10px', height: '10px', borderRadius: '50%', 
                          backgroundColor: isOnline ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)' 
                        }}></div>
                        <span>{isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isDisponivel}
                          onChange={() => toggleDisponivel(corretor.id, isDisponivel)}
                          style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                        />
                        <span>{isDisponivel ? 'No Plantão' : 'Fora do Plantão'}</span>
                      </label>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {isOnline && (
                        <button 
                          className="btn btn-outline"
                          onClick={() => forcarPausa(corretor.id)}
                          style={{ borderColor: 'var(--color-danger, #ef4444)', color: 'var(--color-danger, #ef4444)', padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          Forçar Pausa
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {corretores.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    Nenhum corretor encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Rodizio;
