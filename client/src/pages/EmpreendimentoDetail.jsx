import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiHome, FiCheckCircle, FiClock, FiXCircle, FiArrowLeft } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

export default function EmpreendimentoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [empreendimento, setEmpreendimento] = useState(null);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState('todos');
  const { addToast } = useToast();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empData, uniData] = await Promise.all([
        api.empreendimentos.getEmpreendimento(id),
        api.unidades.getUnidades(id)
      ]);
      setEmpreendimento(empData);
      setUnidades(Array.isArray(uniData) ? uniData : []);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar loteamento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="spinner"></div>
    </div>
  );

  if (!empreendimento) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
      Loteamento não encontrado.
    </div>
  );

  const stats = {
    total: unidades.length,
    disponivel: unidades.filter(u => u.status === 'disponivel').length,
    reservado: unidades.filter(u => u.status === 'reservado').length,
    vendido: unidades.filter(u => u.status === 'vendido').length
  };

  const filteredUnidades = selectedTipo === 'todos' 
    ? unidades 
    : unidades.filter(u => (u.tipologia || '').toLowerCase().includes(selectedTipo.toLowerCase()));

  // Determine category based on empreendimento name
  const empName = (empreendimento.nome || '').toLowerCase();
  const category = empName.includes('beira') ? 'beira-rio' : empName.includes('comerci') ? 'comercial' : 'residencial';
  const catEmoji = category === 'beira-rio' ? '🌊' : category === 'comercial' ? '🏢' : '🏡';
  const catLabel = category === 'beira-rio' ? 'Beira-Rio' : category === 'comercial' ? 'Comercial' : 'Residencial';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/empreendimentos')} 
        className="btn btn-secondary"
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <FiArrowLeft /> Voltar aos Loteamentos
      </button>

      {/* Header Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="font-heading" style={{ fontSize: '2rem', margin: 0, fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>{catEmoji}</span>
              {empreendimento.nome}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
              {empreendimento.endereco || empreendimento.descricao || 'Loteamento Sheets Park'}
            </p>
          </div>
          <span style={{ 
            background: 'rgba(0, 245, 160, 0.15)', 
            color: '#00F5A0', 
            border: '1px solid rgba(0, 245, 160, 0.3)', 
            padding: '6px 16px', 
            borderRadius: '20px', 
            fontSize: '0.85rem', 
            fontWeight: 700 
          }}>
            {catLabel}
          </span>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <FiHome size={12} /> Total de Lotes
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>{stats.total}</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,245,160,0.3)', background: 'rgba(0,245,160,0.05)' }}>
            <div style={{ fontSize: '0.7rem', color: '#00F5A0', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <FiCheckCircle size={12} /> Disponíveis
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#00F5A0' }}>{stats.disponivel}</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.05)' }}>
            <div style={{ fontSize: '0.7rem', color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <FiClock size={12} /> Reservados
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FBBF24' }}>{stats.reservado}</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.05)' }}>
            <div style={{ fontSize: '0.7rem', color: '#F43F5E', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <FiXCircle size={12} /> Vendidos
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F43F5E' }}>{stats.vendido}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs + Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="font-heading" style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700, color: '#FFFFFF' }}>
          Mapa de Lotes
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { key: 'todos', label: `Todos (${unidades.length})` },
            { key: 'quadra a', label: '🏡 Quadra A' },
            { key: 'quadra b', label: '🏡 Quadra B' },
            { key: 'quadra', label: '🏢 Quadra Comercial' },
            { key: 'setor', label: '🌊 Setor Beira-Rio' },
          ].map(filter => (
            <button 
              key={filter.key}
              onClick={() => setSelectedTipo(filter.key)}
              className={`btn btn-sm ${selectedTipo === filter.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '20px', fontSize: '0.8rem' }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Lot Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {filteredUnidades.map(unidade => {
          const statusColor = unidade.status === 'disponivel' ? '#00F5A0' : unidade.status === 'reservado' ? '#FBBF24' : '#F43F5E';
          const statusBg = unidade.status === 'disponivel' ? 'rgba(0,245,160,0.12)' : unidade.status === 'reservado' ? 'rgba(251,191,36,0.12)' : 'rgba(244,63,94,0.12)';
          const statusLabel = unidade.status === 'disponivel' ? 'Disponível' : unidade.status === 'reservado' ? 'Reservado' : 'Vendido';

          return (
            <div key={unidade.id} className="card" style={{ padding: '1rem', position: 'relative', overflow: 'hidden', borderRadius: '14px' }}>
              {/* Top color bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: statusColor }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', marginTop: '4px' }}>
                <span className="font-heading" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#FFFFFF' }}>
                  {unidade.numero}
                </span>
                <span style={{ 
                  background: statusBg, 
                  color: statusColor, 
                  border: `1px solid ${statusColor}30`, 
                  padding: '3px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.7rem', 
                  fontWeight: 700 
                }}>
                  {statusLabel}
                </span>
              </div>
              
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                {unidade.tipologia && <div>Tipo: <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{unidade.tipologia}</span></div>}
                {unidade.area_m2 > 0 && <div>Área: <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{unidade.area_m2} m²</span></div>}
              </div>
              
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#00F5A0' }}>
                {formatCurrency(unidade.valor)}
              </div>
            </div>
          );
        })}

        {filteredUnidades.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
            Nenhum lote encontrado nesta categoria.
          </div>
        )}
      </div>
    </div>
  );
}
