import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { FiClock, FiMessageCircle, FiPhone, FiUser, FiUsers, FiFilter } from 'react-icons/fi';
import ModalFechamentoVenda from '../components/ModalFechamentoVenda';
import { getWhatsAppUrl, getCampanhaBadge, ETAPAS_FUNIL } from '../lib/utils';

const columns = ETAPAS_FUNIL;

const originBadgeClass = (origem) => {
  if (origem === 'meta_ads') return 'badge-meta';
  if (origem === 'google_ads') return 'badge-google';
  return 'badge-manual';
};

const originLabel = (origem) => {
  if (origem === 'meta_ads') return 'Meta';
  if (origem === 'google_ads') return 'Google';
  return 'Manual';
};

const Kanban = () => {
  const { user, isGestor } = useAuth();
  const [leads, setLeads] = useState([]);
  const [corretores, setCorretores] = useState([]);
  const [selectedCorretorId, setSelectedCorretorId] = useState('');
  const [selectedProduto, setSelectedProduto] = useState('');
  const [operadoras, setOperadoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVendaModal, setShowVendaModal] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsData, usersData, opsData] = await Promise.all([
        api.leads.getLeads(),
        api.usuarios.getUsuarios().catch(() => []),
        api.empreendimentos.getEmpreendimentos().catch(() => [])
      ]);
      setOperadoras(opsData || []);
      
      const loadedLeads = Array.isArray(leadsData) ? leadsData : (leadsData?.leads || []);
      setLeads(loadedLeads);

      const activeUsers = (usersData || []).filter(u => u.ativo === 1);
      setCorretores(activeUsers);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = fetchData;

  const filteredLeads = leads.filter(lead => {
    if (selectedCorretorId && lead.corretor_id !== selectedCorretorId) return false;
    if (selectedProduto) {
      const text = `${lead.empreendimento_nome || ''} ${lead.campanha || ''}`.toLowerCase();
      if (!text.includes(selectedProduto.toLowerCase())) return false;
    }
    return true;
  });

  const getLeadsByEtapa = (etapa) => {
    return filteredLeads
      .filter(lead => lead.etapa === etapa)
      .sort((a, b) => {
        const timeA = new Date(a.reengajado_em || a.created_at).getTime();
        const timeB = new Date(b.reengajado_em || b.created_at).getTime();
        return timeB - timeA;
      });
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newEtapa = destination.droppableId;
    
    if (newEtapa === 'fechado') {
      setActiveLeadId(draggableId);
      setShowVendaModal(true);
      return;
    }

    let motivo = null;
    if (newEtapa === 'perdido') {
      motivo = window.prompt("Qual o motivo da perda/sem resposta?");
      if (!motivo) return; // cancel drag
    }

    // Optimistic update
    const updatedLeads = leads.map(lead => {
      if (lead.id === draggableId) {
        return { ...lead, etapa: newEtapa };
      }
      return lead;
    });
    setLeads(updatedLeads);

    try {
      await api.leads.moveLeadEtapa(draggableId, newEtapa, motivo);
      addToast('Lead movido com sucesso', 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao mover lead', 'error');
      fetchLeads(); // Revert on failure
    }
  };

  const formatTimeSince = (dateString) => {
    if (!dateString) return 'Sem contato';
    const diff = new Date() - new Date(dateString);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  if (loading) return <div style={{ padding: '2rem' }}>Carregando...</div>;

  return (
    <div className="flex-col h-full">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
        <h1 className="font-heading" style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', margin: 0 }}>Kanban de Vendas</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Botão rápido: Meus Leads */}
          <button
            onClick={() => setSelectedCorretorId(user?.id || '')}
            className="btn btn-sm"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: selectedCorretorId === user?.id ? 'var(--color-primary, #00C6FF)' : 'var(--color-surface)',
              color: selectedCorretorId === user?.id ? '#FFFFFF' : 'var(--color-text)',
              fontWeight: 600, border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 12px'
            }}
          >
            <FiUser /> Meus Leads
          </button>

          {/* Botão rápido: Todos os Leads */}
          <button
            onClick={() => setSelectedCorretorId('')}
            className="btn btn-sm"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: selectedCorretorId === '' ? 'var(--color-primary, #00C6FF)' : 'var(--color-surface)',
              color: selectedCorretorId === '' ? '#FFFFFF' : 'var(--color-text)',
              fontWeight: 600, border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 12px'
            }}
          >
            <FiUsers /> Todos os Leads ({leads.length})
          </button>

          {/* Dropdown por corretor (para Gestores e Admins) */}
          {(isGestor || user?.role === 'gestor') && corretores.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={selectedCorretorId}
                onChange={(e) => setSelectedCorretorId(e.target.value)}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  backgroundColor: 'var(--color-surface)', color: 'var(--color-text)',
                  border: '1px solid var(--color-border)', fontSize: '0.875rem', fontWeight: 500
                }}
              >
                <option value="">-- Filtrar por Corretor --</option>
                {corretores.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.id === user?.id ? '(Você)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Produto / Campanha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={selectedProduto}
              onChange={(e) => setSelectedProduto(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: '6px',
                backgroundColor: selectedProduto ? 'rgba(0, 198, 255, 0.15)' : 'var(--color-surface)',
                color: selectedProduto ? '#00C6FF' : 'var(--color-text)',
                border: `1px solid ${selectedProduto ? '#00C6FF' : 'var(--color-border)'}`,
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <option value="">-- Todas as Operadoras --</option>
              {operadoras.map(op => (
                <option key={op.id} value={op.nome}>🩺 {op.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div data-tour="kanban-board" className="kanban-wrapper" style={{ width: '100%', paddingBottom: '1rem' }}>
          {columns.map(col => {
            const colLeads = getLeadsByEtapa(col.id);
            return (
              <div key={col.id} className="kanban-column" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--color-surface)', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{col.title}</span>
                  <span className="badge" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>{colLeads.length}</span>
                </div>
                
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      style={{
                        minHeight: '100px',
                        flex: '1',
                        overflowY: 'auto',
                        padding: '0.25rem',
                        paddingRight: '0.5rem',
                        borderRadius: '8px',
                        backgroundColor: snapshot.isDraggingOver ? 'var(--color-surface-hover)' : 'transparent',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      {colLeads.map((lead, index) => {
                        const campBadge = getCampanhaBadge(lead.campanha, lead.empreendimento_nome);

                        return (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                className="card"
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => navigate(`/leads/${lead.id}`)}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.8 : 1,
                                  marginBottom: '0.5rem',
                                  padding: '0.75rem',
                                  cursor: 'pointer',
                                  border: lead.reengajado ? '1px solid rgba(255, 87, 34, 0.45)' : undefined,
                                  boxShadow: lead.reengajado ? '0 0 10px rgba(255, 87, 34, 0.15)' : undefined,
                                }}
                              >
                                {campBadge && (
                                  <div style={{ marginBottom: '6px' }}>
                                    <span style={{
                                      backgroundColor: campBadge.bg,
                                      color: campBadge.color,
                                      border: `1px solid ${campBadge.border}`,
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      {campBadge.label}
                                    </span>
                                  </div>
                                )}

                                {(lead.tipo_plano || lead.qtd_vidas) && (
                                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                    {lead.tipo_plano && (
                                      <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)' }}>
                                        {lead.tipo_plano}
                                      </span>
                                    )}
                                    {lead.qtd_vidas && (
                                      <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: 'rgba(0,198,255,0.1)', color: '#7DD3FC' }}>
                                        👥 {lead.qtd_vidas} vida(s)
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <h4 style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)', margin: 0 }}>{lead.nome}</h4>
                                    {lead.reengajado && (
                                      <span style={{ 
                                        alignSelf: 'flex-start',
                                        backgroundColor: 'rgba(255, 87, 34, 0.15)', 
                                        color: '#ff5722', 
                                        border: '1px solid rgba(255, 87, 34, 0.4)', 
                                        fontSize: '0.65rem', 
                                        fontWeight: 700, 
                                        padding: '1px 6px', 
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}>
                                        🔥 Preencheu de novo
                                      </span>
                                    )}
                                  </div>
                                  <span className={`badge ${originBadgeClass(lead.origem)}`} style={{ fontSize: '0.7rem' }}>
                                    {originLabel(lead.origem)}
                                  </span>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 0.5rem 0' }}>
                                  {lead.empreendimento_nome && !campBadge ? (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                      {lead.empreendimento_nome}
                                    </p>
                                  ) : <span />}
                                  {lead.corretor_nome && (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', background: 'var(--color-primary-soft)', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                                      {lead.corretor_nome}
                                    </span>
                                  )}
                                </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: lead.reengajado ? '#ff7043' : 'var(--color-text-tertiary)' }}>
                                  <FiClock size={12} />
                                  <span>{formatTimeSince(lead.reengajado_em || lead.ultimo_contato || lead.created_at)}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {lead.telefone && (
                                    <a href={getWhatsAppUrl(lead.telefone)} target="_blank" rel="noreferrer"
                                       onClick={e => e.stopPropagation()} 
                                       style={{ color: 'var(--color-success)', padding: '2px' }}>
                                      <FiMessageCircle size={14} />
                                    </a>
                                  )}
                                  {lead.telefone && (
                                    <a href={`tel:${lead.telefone}`} onClick={e => e.stopPropagation()}
                                       style={{ color: 'var(--color-info)', padding: '2px' }}>
                                      <FiPhone size={14} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <ModalFechamentoVenda
        isOpen={showVendaModal}
        onClose={() => setShowVendaModal(false)}
        leadId={activeLeadId}
        onSuccess={() => {
          fetchLeads();
        }}
      />
    </div>
  );
};

export default Kanban;
