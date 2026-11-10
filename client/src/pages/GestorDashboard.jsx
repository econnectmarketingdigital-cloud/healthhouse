import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiPieChart, FiUsers, FiFilter, FiTrendingUp } from 'react-icons/fi';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const GestorDashboard = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Process chart data dynamically with continuous progression
  const chartData = React.useMemo(() => {
    const today = new Date().getDate();
    const mapByDay = {};
    if (data?.chart) {
      data.chart.forEach(item => {
        mapByDay[Number(item.dia)] = Number(item.vgv);
      });
    }

    const points = [];
    let accumulated = 0;
    const maxDay = Math.max(today, 1);
    
    for (let d = 1; d <= maxDay; d++) {
      if (mapByDay[d]) {
        accumulated += mapByDay[d];
      }
      points.push({
        day: `${String(d).padStart(2, '0')}`,
        label: `Dia ${String(d).padStart(2, '0')}`,
        vgv: accumulated,
        vendaDia: mapByDay[d] || 0
      });
    }
    
    // If today is day 1 or only 1 point, prepend day 01 baseline so the curve connects
    if (points.length === 1) {
      points.unshift({ day: '01', label: 'Início do Mês', vgv: 0, vendaDia: 0 });
    }

    return points;
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.dashboard.getDashboardGestor();
        setData(res);
      } catch (err) {
        addToast(err.message || 'Erro ao carregar painel', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <div className="spinner"></div>
    </div>
  );

  const vgvTotal = data?.rankings?.reduce((sum, r) => sum + (r.vgv || 0), 0) || 0;

  // Build funnel from raw data
  const funnelMap = {};
  if (data?.funnel) {
    data.funnel.forEach(item => {
      const label = item.etapa || 'desconhecido';
      funnelMap[label] = (funnelMap[label] || 0) + item.count;
    });
  }

  const etapaLabels = {
    novo: 'Novo',
    contato_feito: 'Contato Feito',
    visita_agendada: 'Visita Agendada',
    proposta: 'Proposta',
    documentacao: 'Documentação',
    fechado: 'Fechado',
    perdido: 'Perdido',
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(14, 16, 20, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 245, 160, 0.3)',
          padding: '12px 16px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
        }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 600 }}>{p.label || `Dia ${label}`}</p>
          <p style={{ color: '#00F5A0', margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(payload[0].value)}
          </p>
          {p.vendaDia > 0 && (
            <p style={{ color: '#38BDF8', margin: '4px 0 0 0', fontSize: '0.75rem', fontWeight: 600 }}>
              +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(p.vendaDia)} realizada neste dia
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 6vw, 2.3rem)', margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Visão Geral <span style={{ color: 'transparent', backgroundImage: 'linear-gradient(90deg, #00F5A0, #0EA5E9)', WebkitBackgroundClip: 'text' }}>Gestão</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>Acompanhamento de performance e VGV de planos de sa�de da equipe.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
        
        {/* VGV Total Card with Progress visual */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ backgroundColor: 'rgba(0, 245, 160, 0.12)', color: '#00F5A0', padding: '0.6rem', borderRadius: '12px', border: '1px solid rgba(0, 245, 160, 0.25)' }}>
              <FiTrendingUp size={20} />
            </div>
            <h3 className="font-heading" style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.1rem' }}>VGV Total da Equipe</h3>
          </div>
          
          <div style={{ fontSize: 'clamp(2rem, 7vw, 2.8rem)', fontWeight: 800, color: '#FFFFFF', lineHeight: 1, marginBottom: '1.25rem', letterSpacing: '-1px' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(vgvTotal)}
          </div>
          
          <div style={{ fontSize: '0.8rem', color: '#00F5A0', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
            <FiTrendingUp /> +32% em relação ao mês passado (Simulado)
          </div>
        </div>

        {/* Funil Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <FiFilter size={22} />
            </div>
            <h3 className="font-heading" style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.2rem' }}>Funil de Vendas Global</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(funnelMap).map(([etapa, count]) => (
              <div key={etapa} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{etapaLabels[etapa] || etapa}</span>
                <span style={{ background: 'rgba(0, 245, 160, 0.12)', color: '#00F5A0', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(0, 245, 160, 0.25)' }}>
                  {count} leads
                </span>
              </div>
            ))}
            {Object.keys(funnelMap).length === 0 && (
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>Sem dados de funil.</p>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'rgba(0, 245, 160, 0.12)', color: '#00F5A0', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(0, 245, 160, 0.25)' }}>
            <FiPieChart size={22} />
          </div>
          <div>
            <h3 className="font-heading" style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.2rem' }}>Evolução de Vendas (Mês Atual)</h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Projeção de VGV Acumulado</p>
          </div>
        </div>
        
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVgv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F5A0" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#00F5A0" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} tickMargin={10} axisLine={false} />
              <YAxis 
                stroke="rgba(255,255,255,0.2)" 
                tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12}} 
                tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="vgv" stroke="#00F5A0" strokeWidth={3} fillOpacity={1} fill="url(#colorVgv)" activeDot={{ r: 8, fill: '#00F5A0', stroke: '#08090A', strokeWidth: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking List */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'rgba(123,168,196,0.15)', color: '#7BA8C4', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(123,168,196,0.3)' }}>
            <FiUsers size={22} />
          </div>
          <h3 className="font-heading" style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.2rem' }}>Desempenho por Corretor</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Posição</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Corretor</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>VGV Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {data?.rankings?.map((corretor, idx) => (
                <tr key={corretor.corretor_id || idx} onClick={() => navigate(`/equipe/${corretor.corretor_id}`)} style={{ cursor: 'pointer', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: idx === 0 ? 'rgba(241,196,15,0.15)' : 'rgba(255,255,255,0.05)',
                      color: idx === 0 ? '#f1c40f' : 'var(--color-text-secondary)',
                      fontWeight: 700, fontSize: '0.85rem',
                      border: idx === 0 ? '1px solid rgba(241,196,15,0.3)' : '1px solid transparent'
                    }}>
                      {idx + 1}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {corretor.avatar_url ? (
                        <img 
                          src={corretor.avatar_url} 
                          alt={corretor.nome} 
                          style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #00F5A0', flexShrink: 0 }} 
                        />
                      ) : (
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,245,160,0.15)', color: '#00F5A0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', border: '1px solid rgba(0,245,160,0.3)', flexShrink: 0 }}>
                          {corretor.nome?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <span>{corretor.nome}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: '#00F5A0', fontWeight: 700, fontSize: '1.1rem', textAlign: 'right' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(corretor.vgv || 0)}
                  </td>
                </tr>
              ))}
              {(!data?.rankings || data.rankings.length === 0) && (
                <tr>
                  <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Nenhum dado encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GestorDashboard;
