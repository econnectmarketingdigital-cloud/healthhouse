import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { FiPlus, FiSearch, FiFilter, FiMessageCircle } from 'react-icons/fi';
import { getCampanhaBadge, getEtapaColor, getEtapaLabel, ETAPAS_FUNIL, getWhatsAppUrl } from '../lib/utils';

const getOrigemColor = (origem) => {
  const colors = {
    meta_ads: '#4267B2',
    google_ads: '#DB4437',
    manual: '#2c3e50'
  };
  return colors[origem] || '#95a5a6';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const cleanStr = dateStr.includes('T') || dateStr.endsWith('Z') 
    ? dateStr 
    : dateStr.replace(' ', 'T') + 'Z';
  return new Date(cleanStr).toLocaleDateString('pt-BR');
};

export default function Leads() {
  const { user, isGestor } = useAuth();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [corretores, setCorretores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [etapaFilter, setEtapaFilter] = useState(searchParams.get('etapa') || '');
  const [origemFilter, setOrigemFilter] = useState('');
  const [corretorFilter, setCorretorFilter] = useState(searchParams.get('corretor_id') || '');
  const [produtoFilter, setProdutoFilter] = useState('');
  const [operadoras, setOperadoras] = useState([]);
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkCorretorId, setBulkCorretorId] = useState('');
  const [isTransferringBulk, setIsTransferringBulk] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [data, usersData, opsData] = await Promise.all([
        api.leads.getLeads(),
        api.usuarios.getUsuarios().catch(() => []),
        api.empreendimentos.getEmpreendimentos().catch(() => [])
      ]);
      setOperadoras(opsData || []);
      setLeads(data || []);
      setCorretores((usersData || []).filter(u => u.ativo === 1));
      setSelectedLeads([]);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = fetchData;

  const filteredLeads = leads
    .filter(lead => {
      const matchesSearch = 
        (lead.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (lead.telefone || '').includes(searchTerm) ||
        (lead.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const matchesEtapa = etapaFilter ? lead.etapa === etapaFilter : true;
      const matchesOrigem = origemFilter ? lead.origem === origemFilter : true;
      const matchesCorretor = corretorFilter ? lead.corretor_id === corretorFilter : true;
      const matchesProduto = produtoFilter 
        ? `${lead.empreendimento_nome || ''} ${lead.campanha || ''}`.toLowerCase().includes(produtoFilter.toLowerCase())
        : true;

      return matchesSearch && matchesEtapa && matchesOrigem && matchesCorretor && matchesProduto;
    })
    .sort((a, b) => {
      const timeA = new Date(a.reengajado_em || a.created_at).getTime();
      const timeB = new Date(b.reengajado_em || b.created_at).getTime();
      return timeB - timeA;
    });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(filteredLeads.map(l => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectOne = (e, id) => {
    e.stopPropagation(); // prevent row click
    if (e.target.checked) {
      setSelectedLeads(prev => [...prev, id]);
    } else {
      setSelectedLeads(prev => prev.filter(leadId => leadId !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedLeads.length} lead(s) selecionado(s)? Esta ação é irreversível.`)) {
      return;
    }
    
    setIsDeletingBulk(true);
    let successCount = 0;
    
    try {
      // Execute in parallel chunks or one by one
      for (const id of selectedLeads) {
        await api.leads.deleteLead(id);
        successCount++;
      }
      addToast(`${successCount} lead(s) excluído(s) com sucesso.`, 'success');
      fetchLeads(); // refresh
    } catch (err) {
      addToast(`Erro ao excluir alguns leads. ${successCount} excluídos.`, 'error');
      fetchLeads(); // refresh anyway to show updated state
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleBulkTransfer = async () => {
    if (!bulkCorretorId) {
      addToast('Selecione um corretor de destino para transferir os leads.', 'error');
      return;
    }

    const corretorDestino = corretores.find(c => String(c.id) === String(bulkCorretorId));
    const nomeDestino = corretorDestino ? corretorDestino.nome : 'o corretor selecionado';

    if (!window.confirm(`Deseja transferir ${selectedLeads.length} lead(s) selecionado(s) para ${nomeDestino}?`)) {
      return;
    }

    setIsTransferringBulk(true);
    try {
      await api.leads.transferirLeadsEmMassa(selectedLeads, bulkCorretorId);
      addToast(`${selectedLeads.length} lead(s) transferido(s) para ${nomeDestino} com sucesso!`, 'success');
      setBulkCorretorId('');
      fetchLeads();
    } catch (err) {
      // Fallback caso o servidor esteja reiniciando na rota antiga
      let successCount = 0;
      try {
        for (const id of selectedLeads) {
          await api.leads.transferirLead(id, bulkCorretorId);
          successCount++;
        }
        addToast(`${successCount} lead(s) transferido(s) para ${nomeDestino} com sucesso!`, 'success');
        setBulkCorretorId('');
        fetchLeads();
      } catch (fallbackErr) {
        addToast(fallbackErr.message || `Erro ao transferir leads (${successCount} concluídos).`, 'error');
        fetchLeads();
      }
    } finally {
      setIsTransferringBulk(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0, color: 'var(--color-text)', fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Leads</h1>
        <button 
          onClick={() => navigate('/leads/novo')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'var(--color-primary, #007bff)', color: '#fff',
            border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          <FiPlus /> Novo Lead
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', minWidth: 0, position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-tertiary)' }} />
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', 
              border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)', boxSizing: 'border-box'
            }}
          />
        </div>
        <select 
          value={etapaFilter} 
          onChange={(e) => setEtapaFilter(e.target.value)}
          style={{ 
            padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', minWidth: 0, flex: '1 1 auto'
          }}
        >
          <option value="">Todas as Etapas</option>
          {ETAPAS_FUNIL.map(e => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        <select 
          value={origemFilter} 
          onChange={(e) => setOrigemFilter(e.target.value)}
          style={{ 
            padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', minWidth: 0, flex: '1 1 auto'
          }}
        >
          <option value="">Todas as Origens</option>
          <option value="meta_ads">Meta Ads</option>
          <option value="google_ads">Google Ads</option>
          <option value="manual">Manual</option>
        </select>
        {(isGestor || user?.role === 'gestor') && corretores.length > 0 && (
          <select 
            value={corretorFilter} 
            onChange={(e) => setCorretorFilter(e.target.value)}
            style={{ 
              padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', minWidth: 0, flex: '1 1 auto', fontWeight: 500 
            }}
          >
            <option value="">Todos os Corretores</option>
            <option value={user?.id}>Meus Leads (Você)</option>
            {corretores.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome} {c.id === user?.id ? '(Você)' : ''}
              </option>
            ))}
          </select>
        )}
        <select 
          value={produtoFilter} 
          onChange={(e) => setProdutoFilter(e.target.value)}
          style={{ 
            padding: '10px 12px', borderRadius: '8px', border: `1px solid ${produtoFilter ? '#00C6FF' : 'var(--color-border)'}`,
            fontWeight: 600, minWidth: 0, flex: '1 1 auto',
            backgroundColor: produtoFilter ? 'rgba(0, 198, 255, 0.15)' : 'var(--color-surface)',
            color: produtoFilter ? '#00C6FF' : 'var(--color-text)'
          }}
        >
          <option value="">Todas as Operadoras</option>
          {operadoras.map(op => (
            <option key={op.id} value={op.nome}>🩺 {op.nome}</option>
          ))}
        </select>
      </div>

      {selectedLeads.length > 0 && (
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          backgroundColor: 'var(--color-surface-hover)', padding: '12px 20px', 
          borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--color-border)' 
        }}>
          <span style={{ fontWeight: 600 }}>{selectedLeads.length} lead(s) selecionado(s)</span>
          <div style={{ flex: 1 }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={bulkCorretorId}
              onChange={(e) => setBulkCorretorId(e.target.value)}
              disabled={isTransferringBulk || isDeletingBulk}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid var(--color-border, #ddd)',
                backgroundColor: 'var(--color-surface, #1e1e1e)',
                color: 'var(--color-text, #fff)',
                fontWeight: 500,
                minWidth: '220px'
              }}
            >
              <option value="">-- Transferir para Corretor --</option>
              {corretores.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <button
              onClick={handleBulkTransfer}
              disabled={!bulkCorretorId || isTransferringBulk || isDeletingBulk}
              style={{
                backgroundColor: bulkCorretorId ? '#3498db' : '#555',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: (!bulkCorretorId || isTransferringBulk || isDeletingBulk) ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: (!bulkCorretorId || isTransferringBulk || isDeletingBulk) ? 0.7 : 1
              }}
            >
              {isTransferringBulk ? 'Transferindo...' : 'Transferir Selecionados'}
            </button>
          </div>

          <button 
            onClick={handleBulkDelete}
            disabled={isDeletingBulk || isTransferringBulk}
            style={{
              backgroundColor: '#e74c3c', color: 'white', border: 'none', 
              padding: '8px 16px', borderRadius: '4px', cursor: (isDeletingBulk || isTransferringBulk) ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {isDeletingBulk ? 'Excluindo...' : 'Excluir Selecionados'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Carregando leads...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Corretor</th>
                  <th>Origem</th>
                  <th>Etapa</th>
                  <th>Operadora / Plano</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr 
                    key={lead.id} 
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    style={{ cursor: 'pointer', backgroundColor: selectedLeads.includes(lead.id) ? 'var(--color-surface-hover)' : 'transparent' }}
                  >
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedLeads.includes(lead.id)}
                        onChange={(e) => handleSelectOne(e, lead.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{lead.nome}</span>
                        {lead.reengajado && (
                          <span style={{ 
                            backgroundColor: 'rgba(255, 87, 34, 0.15)', 
                            color: '#ff5722', 
                            border: '1px solid rgba(255, 87, 34, 0.4)', 
                            fontSize: '0.65rem', 
                            fontWeight: 700, 
                            padding: '1px 6px', 
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                          }}>
                            🔥 Preencheu de novo
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{lead.telefone}</span>
                        {lead.telefone && (
                          <a 
                            href={getWhatsAppUrl(lead.telefone)} 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: 'rgba(37, 211, 102, 0.15)',
                              color: '#25D366',
                              border: '1px solid rgba(37, 211, 102, 0.35)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                            title="Conversar no WhatsApp"
                          >
                            <FiMessageCircle size={13} />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: lead.corretor_nome ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>
                      {lead.corretor_nome || 'Sem corretor'}
                    </td>
                    <td>
                      <span style={{ 
                        backgroundColor: getOrigemColor(lead.origem), color: '#fff', 
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase'
                      }}>
                        {lead.origem}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        backgroundColor: getEtapaColor(lead.etapa), color: '#fff', 
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase'
                      }}>
                        {getEtapaLabel(lead.etapa)}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const b = getCampanhaBadge(lead.campanha, lead.empreendimento_nome);
                        if (b) {
                          return (
                            <span style={{
                              backgroundColor: b.bg, color: b.color,
                              border: `1px solid ${b.border}`,
                              padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                              whiteSpace: 'nowrap'
                            }}>
                              {b.label}
                            </span>
                          );
                        }
                        return <span style={{ color: 'var(--color-text-secondary)' }}>{lead.empreendimento_nome || lead.campanha || '-'}</span>;
                      })()}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Nenhum lead encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
