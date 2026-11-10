import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { FiAward, FiTrendingUp } from 'react-icons/fi';
import { FaCrown, FaMedal } from 'react-icons/fa';

const Ranking = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [corretores, setCorretores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [users, dashboardData] = await Promise.all([
          api.usuarios.getUsuarios().catch(() => []),
          api.dashboard.getDashboardGestor().catch(() => null)
        ]);
        
        const rankingsMap = {};
        if (dashboardData?.rankings) {
          dashboardData.rankings.forEach(r => {
            rankingsMap[r.corretor_id] = Number(r.vgv || 0);
          });
        }

        // Build list of all team members
        const teamList = users.map(u => ({
          ...u,
          vgv: rankingsMap[u.id] || 0
        })).sort((a, b) => b.vgv - a.vgv);
        
        setCorretores(teamList);
      } catch (err) {
        addToast(err.message || 'Erro ao carregar ranking', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [addToast]);

  if (loading) return (
    <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="spinner"></div>
    </div>
  );

  const top3 = corretores.slice(0, 3);
  const others = corretores.slice(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', position: 'relative', zIndex: 1, minHeight: '100%', paddingBottom: '3rem' }}>
      
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '80%', height: '50vh', zIndex: -1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at top, rgba(0, 198, 255, 0.12) 0%, transparent 70%)', filter: 'blur(50px)'
      }} />

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(0, 198, 255, 0.1)', color: '#00C6FF', padding: '0.4rem 1rem', borderRadius: '50px', border: '1px solid rgba(0, 198, 255, 0.25)', marginBottom: '0.75rem' }}>
          <FiAward size={16} />
          <span style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Top Performers</span>
        </div>
        <h1 className="font-heading" style={{ fontSize: 'clamp(1.8rem, 7vw, 3rem)', margin: 0, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-1px' }}>
          Ranking <span style={{ color: 'transparent', backgroundImage: 'linear-gradient(90deg, #00C6FF, #0EA5E9)', WebkitBackgroundClip: 'text' }}>Global</span>
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>A corrida pelo topo de vendas de planos de sa�de deste mês.</p>
      </div>

      <style>{`
        .podium-container {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 1.5rem;
          margin-top: 1.5rem;
          height: 360px;
        }
        @media (max-width: 600px) {
          .podium-container {
            gap: 6px;
            height: 290px;
          }
          .podium-item {
            width: 105px !important;
          }
        }
        .podium-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 170px;
          position: relative;
          animation: slideUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
          transform: translateY(50px);
        }
        .podium-item:nth-child(1) { animation-delay: 0.3s; } /* 2nd */
        .podium-item:nth-child(2) { animation-delay: 0.1s; } /* 1st */
        .podium-item:nth-child(3) { animation-delay: 0.5s; } /* 3rd */
        
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }

        .podium-avatar {
          width: 84px;
          height: 84px;
          border-radius: 50%;
          background: #121418;
          border: 4px solid #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 800;
          color: white;
          margin-bottom: -15px;
          position: relative;
          z-index: 10;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
          overflow: hidden;
        }
        .podium-base {
          width: 100%;
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          border-bottom: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2.2rem 1rem 1rem 1rem;
          position: relative;
          overflow: hidden;
        }
        .podium-base::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 100%;
          background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%);
        }
        .rank-number {
          font-size: 4rem;
          font-weight: 900;
          line-height: 1;
          color: rgba(255,255,255,0.08);
          position: absolute;
          bottom: 10px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 1rem 1.5rem;
          margin-bottom: 0.75rem;
          transition: all 0.2s ease;
        }
        .list-item:hover {
          background: rgba(255,255,255,0.06);
          transform: translateX(5px);
          border-color: rgba(0, 198, 255, 0.3);
        }
      `}</style>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="podium-container">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="podium-item" style={{ zIndex: 2 }}>
              <FaMedal size={30} color="#38BDF8" style={{ position: 'absolute', top: '-35px', filter: 'drop-shadow(0 4px 10px rgba(56,189,248,0.5))' }} />
              <div className="podium-avatar" style={{ borderColor: '#38BDF8' }}>
                {top3[1].avatar_url ? (
                  <img src={top3[1].avatar_url} alt={top3[1].nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#38BDF8' }}>{top3[1].nome.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="podium-base" style={{ height: '190px', boxShadow: '0 0 40px rgba(56,189,248,0.1)' }}>
                <span style={{ fontWeight: 700, textAlign: 'center', fontSize: '1.1rem', zIndex: 2, color: '#FFFFFF' }}>{top3[1].nome.split(' ')[0]}</span>
                <span style={{ color: '#38BDF8', fontWeight: 700, marginTop: '0.25rem', zIndex: 2 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(top3[1].vgv)}</span>
                <span className="rank-number">2</span>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <div className="podium-item" style={{ zIndex: 3 }}>
              <FaCrown size={45} color="#00C6FF" style={{ position: 'absolute', top: '-55px', filter: 'drop-shadow(0 4px 15px rgba(0,198,255,0.8))' }} />
              <div className="podium-avatar" style={{ borderColor: '#00C6FF', width: '104px', height: '104px', fontSize: '2.5rem', marginBottom: '-20px', boxShadow: '0 0 35px rgba(0,198,255,0.4)' }}>
                {top3[0].avatar_url ? (
                  <img src={top3[0].avatar_url} alt={top3[0].nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#00C6FF' }}>{top3[0].nome.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="podium-base" style={{ height: '250px', background: 'rgba(0,198,255,0.08)', borderColor: 'rgba(0,198,255,0.3)', boxShadow: '0 0 60px rgba(0,198,255,0.2)' }}>
                <span style={{ fontWeight: 800, textAlign: 'center', fontSize: '1.3rem', zIndex: 2, color: '#00C6FF' }}>{top3[0].nome.split(' ')[0]}</span>
                <span style={{ color: '#fff', fontWeight: 800, marginTop: '0.25rem', zIndex: 2, fontSize: '1.2rem' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(top3[0].vgv)}</span>
                <span className="rank-number" style={{ color: 'rgba(0,198,255,0.2)', fontSize: '6rem' }}>1</span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="podium-item" style={{ zIndex: 1 }}>
              <FaMedal size={25} color="#A1A1AA" style={{ position: 'absolute', top: '-30px', filter: 'drop-shadow(0 4px 10px rgba(161,161,170,0.5))' }} />
              <div className="podium-avatar" style={{ borderColor: '#A1A1AA', width: '76px', height: '76px', fontSize: '1.6rem', marginBottom: '-12px' }}>
                {top3[2].avatar_url ? (
                  <img src={top3[2].avatar_url} alt={top3[2].nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#A1A1AA' }}>{top3[2].nome.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="podium-base" style={{ height: '150px', boxShadow: '0 0 30px rgba(161,161,170,0.1)' }}>
                <span style={{ fontWeight: 700, textAlign: 'center', fontSize: '1rem', zIndex: 2, color: '#FFFFFF' }}>{top3[2].nome.split(' ')[0]}</span>
                <span style={{ color: '#A1A1AA', fontWeight: 700, marginTop: '0.25rem', zIndex: 2, fontSize: '0.9rem' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(top3[2].vgv)}</span>
                <span className="rank-number" style={{ fontSize: '3.5rem' }}>3</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List for the rest */}
      <div style={{ maxWidth: '650px', width: '100%', margin: '0 auto' }}>
        {others.map((corretor, index) => (
          <div key={corretor.id} className="list-item" style={{ borderLeft: user?.id === corretor.id ? '4px solid #00C6FF' : '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-tertiary)', width: '30px', textAlign: 'center' }}>{index + 4}º</span>
              
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(0,198,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#00C6FF', overflow: 'hidden', border: '1.5px solid rgba(0,198,255,0.3)', flexShrink: 0 }}>
                {corretor.avatar_url ? (
                  <img src={corretor.avatar_url} alt={corretor.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  corretor.nome.charAt(0).toUpperCase()
                )}
              </div>

              <span style={{ fontWeight: 600, fontSize: '1.05rem', color: '#FFFFFF' }}>
                {corretor.nome} {user?.id === corretor.id && <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(0,198,255,0.15)', color: '#00C6FF', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px', fontWeight: 700 }}>Você</span>}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiTrendingUp color="#00C6FF" />
              <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '1.15rem', color: '#00C6FF' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(corretor.vgv)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ranking;
