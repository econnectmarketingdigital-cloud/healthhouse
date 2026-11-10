import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiAlertCircle, FiTrendingUp, FiAward, FiClock, FiChevronRight } from 'react-icons/fi';

const etapaLabels = {
  novo: 'Novo',
  contato_feito: 'Contato Feito',
  visita_agendada: 'Visita Agendada',
  proposta: 'Proposta',
  documentacao: 'Documentação',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

const Dashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.dashboard.getDashboardCorretor();
        setData(res);
      } catch (err) {
        addToast(err.message || 'Erro ao carregar dashboard', 'error');
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

  const vgvTotal = data?.vgv || 0;
  const meta = data?.meta || 1000000;
  const vgvPercent = meta > 0 ? Math.min((vgvTotal / meta) * 100, 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Background Dots Texture */}
      <div style={{
        position: 'absolute', top: '-2rem', left: '-2rem', right: '-2rem', bottom: '-2rem', zIndex: -1, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(0,245,160,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.6
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 6vw, 2.3rem)', margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Olá, <span style={{ color: 'transparent', backgroundImage: 'linear-gradient(90deg, #00F5A0, #0EA5E9)', WebkitBackgroundClip: 'text' }}>{user?.nome?.split(' ')[0] || 'Corretor'}</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>Aqui está o resumo da sua performance.</p>
        </div>
      </div>
      
      <style>{`
        .glass-card-override {
          background: rgba(18, 20, 24, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .glass-card-override:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,245,160,0.2);
        }
        .glass-card-override::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.02), transparent);
          transform: skewX(-20deg);
          animation: shine 12s infinite ease-in-out;
        }
        @keyframes shine { 0% { left: -100%; } 15% { left: 200%; } 100% { left: 200%; } }
        
        .progress-track {
          background: rgba(0,0,0,0.4);
          border-radius: 99px;
          height: 12px;
          overflow: hidden;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);
          position: relative;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00F5A0, #0EA5E9);
          border-radius: 99px;
          position: relative;
          box-shadow: 0 0 12px rgba(0,245,160,0.5);
          transition: width 1.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .progress-fill::after {
          content: '';
          position: absolute; top:0; left:0; right:0; bottom:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer-progress 3s infinite linear;
        }
        @keyframes shimmer-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
        
        {/* VGV Meta */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ backgroundColor: 'rgba(0,245,160,0.12)', color: '#00F5A0', padding: '0.6rem', borderRadius: '12px', border: '1px solid rgba(0,245,160,0.25)' }}>
              <FiTrendingUp size={20} />
            </div>
            <h3 className="font-heading" style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.1rem' }}>Avanço da Meta</h3>
          </div>
          
          <div style={{ fontSize: 'clamp(2rem, 7vw, 2.5rem)', fontWeight: 800, color: '#FFFFFF', lineHeight: 1, marginBottom: '1.25rem', letterSpacing: '-1px' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(vgvTotal)}
          </div>

          <div className="progress-track" style={{ marginBottom: '0.5rem' }}>
            <div className="progress-fill" style={{ width: `${vgvPercent}%` }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            <span>R$ 0</span>
            <span>Meta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(meta)}</span>
          </div>
        </div>

        {/* Ranking */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/ranking')}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(0,245,160,0.12) 0%, transparent 70%)', filter: 'blur(20px)', zIndex: -1 }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: 'rgba(0,245,160,0.12)', color: '#00F5A0', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(0,245,160,0.25)' }}>
                <FiAward size={22} />
              </div>
              <h3 className="font-heading" style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.2rem' }}>Ranking Global</h3>
            </div>
            <FiChevronRight size={20} color="var(--color-text-secondary)" />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', height: '80px' }}>
            <span style={{ fontSize: '4rem', fontWeight: 800, color: 'transparent', backgroundImage: 'linear-gradient(180deg, #00F5A0, #0EA5E9)', WebkitBackgroundClip: 'text', lineHeight: 1, filter: 'drop-shadow(0 4px 10px rgba(0,245,160,0.3))' }}>
              {data?.rank || '-'}º
            </span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>lugar</span>
          </div>
        </div>

        {/* Avisos */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: 'rgba(244,63,94,0.15)', color: '#F43F5E', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(244,63,94,0.3)' }}>
              <FiAlertCircle size={22} />
            </div>
            <h3 className="font-heading" style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.2rem' }}>Atenção</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '80px', overflowY: 'auto', paddingRight: '5px' }}>
            {data?.leads?.length > 0 ? (
              data.leads.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{etapaLabels[item.etapa] || item.etapa}</span>
                  <span style={{ background: 'rgba(0,245,160,0.12)', color: '#00F5A0', padding: '2px 8px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(0,245,160,0.25)' }}>
                    {item.count} leads
                  </span>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
                Nenhum alerta.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'rgba(56,189,248,0.15)', color: '#38BDF8', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.3)' }}>
            <FiClock size={18} />
          </div>
          <h3 className="font-heading" style={{ margin: 0, fontSize: '1.1rem' }}>Movimentações Recentes</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Nome</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Etapa</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, textAlign: 'right' }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentLeads?.length > 0 ? (
                data.recentLeads.map(lead => (
                  <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{lead.nome}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ display: 'inline-block', background: 'rgba(0,245,160,0.12)', color: '#00F5A0', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(0,245,160,0.25)' }}>
                        {etapaLabels[lead.etapa] || lead.etapa}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem', textAlign: 'right' }}>
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Nenhuma atividade recente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
