import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FiPhone, FiMail, FiMessageCircle, FiEdit3, FiInfo, FiClock, FiCheck, FiXCircle, FiArrowRight, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import ModalFechamentoVenda from '../components/ModalFechamentoVenda';
import { getWhatsAppUrl, getCampanhaBadge, getEtapaLabel, ETAPAS_FUNIL } from '../lib/utils';

const ETAPAS = ETAPAS_FUNIL.filter(e => e.id !== 'perdido').map(e => e.id);

// Quebra as respostas do formulário ("Pergunta: resposta | Pergunta: resposta") em itens
const parseRespostas = (obs) => {
  if (!obs) return [];
  return obs
    .split(/\s*\|\s*|\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(item => {
      const idx = item.indexOf(':');
      if (idx > 0 && idx < 80) {
        return { pergunta: item.slice(0, idx).replace(/_/g, ' ').trim(), resposta: item.slice(idx + 1).trim() };
      }
      return { pergunta: null, resposta: item };
    });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const cleanStr = dateStr.includes('T') || dateStr.endsWith('Z') 
    ? dateStr 
    : dateStr.replace(' ', 'T') + 'Z';
  return new Date(cleanStr).toLocaleString('pt-BR');
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [lead, setLead] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notaText, setNotaText] = useState('');
  const [showLostModal, setShowLostModal] = useState(false);
  const [showVendaModal, setShowVendaModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [corretores, setCorretores] = useState([]);
  const [selectedCorretor, setSelectedCorretor] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadData, histData, usersData] = await Promise.all([
        api.leads.getLead(id),
        api.leads.getHistorico(id),
        api.usuarios.getUsuarios()
      ]);
      setLead(leadData);
      setHistorico(histData || []);
      setCorretores((usersData || []).filter(u => u.ativo === 1));
    } catch (err) {
      addToast('Erro ao carregar dados do lead', 'error');
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNota = async () => {
    if (!notaText.trim()) return;
    try {
      setActionLoading(true);
      await api.leads.addNota(id, notaText);
      setNotaText('');
      addToast('Nota adicionada com sucesso', 'success');
      fetchData();
    } catch (err) {
      addToast('Erro ao adicionar nota', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEtapaChange = async (novaEtapa) => {
    if (novaEtapa === lead.etapa) return;
    
    if (novaEtapa === 'perdido') {
      setShowLostModal(true);
      return;
    }

    if (novaEtapa === 'fechado') {
      setShowVendaModal(true);
      return;
    }

    try {
      setActionLoading(true);
      await api.leads.moveLeadEtapa(id, novaEtapa);
      addToast('Etapa atualizada com sucesso', 'success');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Erro ao atualizar etapa', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNextEtapa = async () => {
    if (!lead) return;
    const currentIndex = ETAPAS.indexOf(lead.etapa);
    if (currentIndex >= 0 && currentIndex < ETAPAS.length - 1) {
      handleEtapaChange(ETAPAS[currentIndex + 1]);
    }
  };

  const handleMarkLost = async () => {
    if (!lostReason.trim()) {
      addToast('Motivo é obrigatório', 'error');
      return;
    }
    try {
      setActionLoading(true);
      await api.leads.moveLeadEtapa(id, 'perdido', lostReason);
      setShowLostModal(false);
      setLostReason('');
      addToast('Lead marcado como perdido', 'success');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Erro ao marcar como perdido', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferLead = async () => {
    if (!selectedCorretor) {
      addToast('Selecione um corretor para transferir', 'error');
      return;
    }
    try {
      setActionLoading(true);
      await api.leads.transferirLead(id, selectedCorretor);
      addToast('Lead transferido com sucesso!', 'success');
      setShowTransferModal(false);
      setSelectedCorretor('');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Erro ao transferir lead', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLead = async () => {
    try {
      setActionLoading(true);
      await api.leads.deleteLead(id);
      addToast('Lead excluído com sucesso!', 'success');
      navigate('/kanban');
    } catch (err) {
      addToast(err.message || 'Erro ao excluir lead', 'error');
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Carregando dados...</div>;
  if (!lead) return null;

  const getPhoneNumbers = (phone) => phone ? phone.replace(/\D/g, '') : '';

  return (
    <div style={{ padding: '20px', maxWidth: '1050px', margin: '0 auto' }}>
      
      {/* Back button and title */}
      <button 
        onClick={() => navigate(-1)} 
        className="btn btn-secondary"
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <FiArrowLeft /> Voltar
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
        <div>
          <h1 className="font-heading" style={{ margin: '0 0 10px 0', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF', flexWrap: 'wrap' }}>
            {lead.nome}
            {(() => {
              const b = getCampanhaBadge(lead.campanha, lead.empreendimento_nome);
              if (b) {
                return (
                  <span style={{
                    backgroundColor: b.bg, color: b.color,
                    border: `1px solid ${b.border}`,
                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700
                  }}>
                    {b.label}
                  </span>
                );
              }
              return null;
            })()}
            <span className="badge" style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-secondary)' }}>
              {lead.origem}
            </span>
            <span className="badge" style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px', background: lead.etapa === 'perdido' ? 'rgba(244,63,94,0.2)' : 'rgba(0,198,255,0.15)', color: lead.etapa === 'perdido' ? '#F43F5E' : '#00C6FF', border: `1px solid ${lead.etapa === 'perdido' ? 'rgba(244,63,94,0.3)' : 'rgba(0,198,255,0.3)'}` }}>
              {getEtapaLabel(lead.etapa)}
            </span>
          </h1>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {lead.telefone && (
              <a href={getWhatsAppUrl(lead.telefone)} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#25D366', color: '#fff', textDecoration: 'none', borderRadius: '8px' }}>
                <FiMessageCircle /> WhatsApp ({lead.telefone})
              </a>
            )}
            {lead.telefone && (
              <a href={`tel:${getPhoneNumbers(lead.telefone)}`} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', borderRadius: '8px' }}>
                <FiPhone /> Ligar
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', borderRadius: '8px' }}>
                <FiMail /> {lead.email}
              </a>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowTransferModal(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Transferir Lead"
          >
            Transferir
          </button>
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-secondary"
            style={{ color: '#F43F5E', border: '1px solid rgba(244,63,94,0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Excluir Lead"
          >
            <FiTrash2 /> Excluir
          </button>

          {lead.etapa !== 'perdido' && lead.etapa !== 'fechado' && (
            <>
              <button 
                onClick={() => setShowLostModal(true)}
                className="btn btn-secondary"
                style={{ color: '#F43F5E', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FiXCircle /> Perdido
              </button>
              <button 
                onClick={() => setShowVendaModal(true)}
                className="btn"
                style={{ background: 'linear-gradient(135deg, #00C6FF, #0072FF)', color: '#061912', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                💰 Registrar Contrato
              </button>
              <button 
                onClick={handleNextEtapa} 
                disabled={actionLoading}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Avançar Etapa <FiArrowRight />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      {lead.etapa !== 'perdido' && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', padding: '20px', overflowX: 'auto', gap: '10px' }}>
          {ETAPAS.map((etp, idx) => {
            const currentIdx = ETAPAS.indexOf(lead.etapa);
            const isCompleted = idx <= currentIdx;
            return (
              <div key={etp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: isCompleted ? 1 : 0.35, minWidth: '100px', cursor: 'pointer' }} onClick={() => handleEtapaChange(etp)}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isCompleted ? '#00C6FF' : 'rgba(255,255,255,0.1)', color: isCompleted ? '#061912' : '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', boxShadow: isCompleted ? '0 0 15px rgba(0,198,255,0.4)' : 'none' }}>
                  {isCompleted ? <FiCheck size={18} /> : idx + 1}
                </div>
                <span style={{ fontSize: '0.85em', textAlign: 'center', fontWeight: isCompleted ? 700 : 400, color: isCompleted ? '#FFFFFF' : 'var(--color-text-secondary)' }}>
                  {getEtapaLabel(etp)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Lead Info */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 className="font-heading" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#00C6FF' }}>
            <FiInfo /> Detalhes do Lead
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operadora / Plano de Interesse</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#FFFFFF' }}>{lead.empreendimento_nome || 'Ainda não definido / Aberto'}</p>
            </div>
            {(lead.tipo_plano || lead.qtd_vidas || lead.idades) && (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {lead.tipo_plano && (
                  <div>
                    <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo de Plano</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#FFFFFF' }}>{lead.tipo_plano}</p>
                  </div>
                )}
                {lead.qtd_vidas && (
                  <div>
                    <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vidas</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#FFFFFF' }}>{lead.qtd_vidas}</p>
                  </div>
                )}
                {lead.idades && (
                  <div>
                    <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Idades</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#FFFFFF' }}>{lead.idades}</p>
                  </div>
                )}
              </div>
            )}
            {lead.campanha && lead.campanha !== 'manual' && (
              <div>
                <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Campanha / Produto</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#00C6FF' }}>{lead.campanha}</p>
              </div>
            )}
            {lead.anuncio && (
              <div>
                <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Anúncio de Origem</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 500, color: '#FFFFFF' }}>{lead.anuncio}</p>
              </div>
            )}
            <div>
              <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Corretor Responsável</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#FFFFFF' }}>{lead.corretor_nome || 'Fila Geral'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Respostas do Formulário / Observações</span>
              {parseRespostas(lead.observacoes).length === 0 ? (
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>Nenhuma observação registrada.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {parseRespostas(lead.observacoes).map((r, i) => (
                    <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,198,255,0.05)', border: '1px solid rgba(0,198,255,0.12)' }}>
                      {r.pergunta && <div style={{ fontSize: '0.72rem', color: '#7DD3FC', fontWeight: 600, textTransform: 'capitalize' }}>{r.pergunta}</div>}
                      <div style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>{r.resposta}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {lead.perdido_motivo && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <span style={{ fontSize: '0.8em', color: '#F43F5E', fontWeight: 700, textTransform: 'uppercase' }}>Motivo da Perda</span>
                <p style={{ margin: '4px 0 0 0', color: '#F43F5E' }}>{lead.perdido_motivo}</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes & History */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 className="font-heading" style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#00C6FF' }}>
              <FiEdit3 /> Nova Nota / Acompanhamento
            </h3>
            <textarea 
              value={notaText} 
              onChange={(e) => setNotaText(e.target.value)}
              placeholder="Digite o resumo do contato com o cliente (ex: enviei cotação Select e Humana para 3 vidas)..."
              rows="3"
              className="input"
              style={{ width: '100%', marginBottom: '10px', resize: 'vertical' }}
            />
            <button 
              onClick={handleAddNota} 
              disabled={actionLoading || !notaText.trim()}
              className="btn btn-primary"
              style={{ float: 'right' }}
            >
              Adicionar Nota
            </button>
            <div style={{ clear: 'both' }}></div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

          {/* Timeline */}
          <div>
            <h3 className="font-heading" style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
              <FiClock /> Linha do Tempo & Histórico
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
              {historico.length === 0 ? (
                <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9em' }}>Nenhum histórico registrado.</p>
              ) : (
                historico.map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: '10px', fontSize: '0.9em', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00C6FF', marginTop: '6px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-tertiary)', fontSize: '0.8em', marginBottom: '4px' }}>
                        <span>{item.corretor_nome || 'Sistema'}</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--color-text)' }}>
                        {item.tipo === 'mudanca_etapa' ? (
                          <span>Mudou etapa de <strong>{getEtapaLabel(item.etapa_anterior)}</strong> para <strong>{getEtapaLabel(item.etapa_nova)}</strong></span>
                        ) : (
                          item.descricao
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Lost Modal */}
      {showLostModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
          <div className="card" style={{ padding: '20px', width: '90%', maxWidth: '420px', border: '1px solid rgba(244,63,94,0.4)' }}>
            <h3 className="font-heading" style={{ margin: '0 0 10px 0', color: '#F43F5E' }}>Marcar Lead como Perdido</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>Informe o motivo pelo qual a negociação não avançou:</p>
            <textarea 
              value={lostReason} 
              onChange={(e) => setLostReason(e.target.value)} 
              rows="3"
              className="input"
              placeholder="Ex: Achou caro / Fechou com outra corretora / Carência..."
              style={{ width: '100%', marginBottom: '15px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowLostModal(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleMarkLost} disabled={actionLoading} className="btn" style={{ background: '#F43F5E', color: '#fff' }}>Confirmar Perda</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
          <div className="card" style={{ padding: '25px', width: '90%', maxWidth: '440px' }}>
            <h3 className="font-heading" style={{ margin: '0 0 10px 0', color: '#00C6FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Transferir Lead
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              Selecione o corretor para quem você deseja transferir o lead <strong>{lead.nome}</strong>:
            </p>
            <select
              value={selectedCorretor}
              onChange={(e) => setSelectedCorretor(e.target.value)}
              className="input"
              style={{ width: '100%', marginBottom: '1.5rem', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
            >
              <option value="">-- Selecione o Corretor --</option>
              {corretores.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowTransferModal(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleTransferLead} disabled={actionLoading || !selectedCorretor} className="btn btn-primary" style={{ fontWeight: 'bold' }}>
                Transferir Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
          <div className="card" style={{ padding: '25px', width: '90%', maxWidth: '440px', border: '1px solid rgba(244,63,94,0.4)' }}>
            <h3 className="font-heading" style={{ margin: '0 0 10px 0', color: '#F43F5E', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiTrash2 /> Excluir Lead?
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Tem certeza que deseja excluir <strong>{lead.nome}</strong>? Todas as propostas e histórico vinculados a este lead serão removidos.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleDeleteLead} disabled={actionLoading} className="btn" style={{ background: '#F43F5E', color: '#fff', fontWeight: 'bold' }}>
                Sim, Excluir Lead
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalFechamentoVenda
        isOpen={showVendaModal}
        onClose={() => setShowVendaModal(false)}
        leadId={id}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}
