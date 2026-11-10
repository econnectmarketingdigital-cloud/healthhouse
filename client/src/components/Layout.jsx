import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { HiHome, HiViewBoards, HiUserGroup, HiCog, HiLogout, HiPlus } from 'react-icons/hi';
import { FiRefreshCw, FiHelpCircle, FiAward, FiUser, FiHeart } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import OnboardingTour from './OnboardingTour';
import PushNotificationManager from './PushNotificationManager';
import api from '../services/api';

const Layout = () => {
  const { user, isGestor, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isOnline, setIsOnline] = useState(user?.pausado_rodizio === 0);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    setIsOnline(user?.pausado_rodizio === 0);
  }, [user]);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('@CRM_Tour_Done');
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      await api.rodizio.pausarCorretor(user.id, !newStatus);
      setIsOnline(newStatus);
    } catch (err) {
      console.error('Erro ao mudar status:', err);
    }
  };

  const navLinks = [
    { to: '/', icon: <HiHome size={24} />, label: 'Dashboard' },
    { to: '/kanban', icon: <HiViewBoards size={24} />, label: 'Kanban' },
    { to: '/leads', icon: <HiUserGroup size={24} />, label: 'Leads' },
    { to: '/ranking', icon: <FiAward size={24} />, label: 'Ranking' },
    { to: '/empreendimentos', icon: <FiHeart size={22} />, label: 'Planos & Operadoras' },
    { to: '/perfil', icon: <FiUser size={24} />, label: 'Meu Perfil' },
  ];

  if (isGestor) {
    navLinks.push({ to: '/equipe', icon: <HiUserGroup size={24} />, label: 'Equipe' });
    navLinks.push({ to: '/rodizio', icon: <FiRefreshCw size={24} />, label: 'Rodízio' });
    navLinks.push({ to: '/configuracoes', icon: <HiCog size={24} />, label: 'Ajustes' });
  }

  return (
    <div 
      className="app-container" 
      style={user?.wallpaper_url ? { 
        backgroundImage: `url(${user.wallpaper_url})`, 
        backgroundSize: 'cover', 
        backgroundPosition: user?.wallpaper_position || 'center center', 
        backgroundAttachment: 'fixed' 
      } : {}}
    >
      {user?.wallpaper_url && <div style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8, 10, 16, 0.82)", zIndex: 0, pointerEvents: "none"}}></div>}
      <OnboardingTour isOpen={showTour} onClose={() => setShowTour(false)} />

      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img 
            src="/logo_icon.png?v=7" 
            alt="Health & House" 
            style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'contain', background: 'rgba(0, 198, 255, 0.08)', border: '1px solid rgba(0, 198, 255, 0.4)' }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>Health & House</span>
            <span style={{ fontSize: '0.6rem', color: '#00C6FF', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700 }}>Saúde & Bem Estar</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Status Rodízio Toggle */}
          <button
            onClick={handleToggleOnline}
            style={{
              background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '20px',
              padding: '3px 8px',
              color: isOnline ? '#10b981' : '#ef4444',
              fontSize: '0.68rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isOnline ? '#10b981' : '#ef4444' }} />
            {isOnline ? 'Online' : 'Offline'}
          </button>

          {/* Botão de Notificação Push com sino */}
          <PushNotificationManager mode="bell" />

          {/* Atalho Rápido: Novo Lead */}
          <button 
            onClick={() => navigate('/leads/novo')}
            style={{
              background: 'linear-gradient(135deg, #00C6FF, #0072FF)',
              color: '#FFFFFF',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(0, 198, 255, 0.35)'
            }}
            title="Novo Lead"
          >
            <HiPlus size={18} />
          </button>

          {/* Avatar / Link Perfil */}
          <div onClick={() => navigate('/perfil')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.nome} 
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #00C6FF' }} 
              />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 198, 255, 0.2)', color: '#00C6FF', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', border: '1px solid rgba(0, 198, 255, 0.4)' }}>
                {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="brand" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <img 
            src="/logo_icon.png?v=7" 
            alt="Health & House" 
            style={{ 
              width: '82px', 
              height: '82px', 
              objectFit: 'contain',
              borderRadius: '50%',
              padding: '4px',
              background: 'radial-gradient(circle, rgba(0, 198, 255, 0.12) 0%, rgba(8, 10, 16, 0.6) 100%)',
              boxShadow: '0 0 24px rgba(0, 198, 255, 0.25)',
              border: '1px solid rgba(0, 198, 255, 0.3)'
            }} 
          />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.5px' }}>
              HEALTH & HOUSE
            </div>
            <span style={{ display: 'inline-block', fontSize: '0.62rem', color: '#00C6FF', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
              Planos de Saúde
            </span>
          </div>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {navLinks.map((link) => (
            <NavLink 
              key={link.to} 
              to={link.to}
              data-tour={`nav-${link.to.replace('/', '') || 'dashboard'}`}
              className={({isActive}) => `btn ${isActive ? 'btn-primary' : ''}`}
              style={{ justifyContent: 'flex-start', backgroundColor: 'transparent' }}
            >
              {link.icon} {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Tutorial / Help Button */}
        <div style={{ padding: '0.75rem 0', borderTop: '1px solid var(--color-border)' }}>
          <button 
            onClick={() => setShowTour(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)',
              fontSize: '0.825rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--color-primary)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
          >
            <FiHelpCircle size={16} /> Guia da Plataforma
          </button>
        </div>

        <div className="user-info" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', overflow: 'hidden' }} onClick={() => navigate('/perfil')}>
              {user?.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.nome} 
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #00C6FF', flexShrink: 0 }} 
                />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0, 198, 255, 0.15)', color: '#00C6FF', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', border: '1px solid rgba(0, 198, 255, 0.35)', flexShrink: 0 }}>
                  {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '115px' }}>
                  {user?.nome}
                </div>
                <div className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  {user?.role}
                </div>
              </div>
            </div>
            <button onClick={logout} className="btn" style={{ padding: '0.5rem', color: 'var(--color-danger)' }} title="Sair do sistema">
              <HiLogout size={20} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span>Status Rodízio:</span>
            <button 
              onClick={handleToggleOnline}
              data-tour="btn-status-rodizio"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                color: isOnline ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)',
                fontWeight: '600'
              }}
            >
              <div style={{ 
                width: '10px', height: '10px', borderRadius: '50%', 
                backgroundColor: isOnline ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)' 
              }}></div>
              {isOnline ? 'Online' : 'Offline'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Alerta de Ativação de Notificações Push Mobile */}
      <PushNotificationManager mode="banner" />

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        <NavLink to="/" className="nav-item">
          <HiHome size={22} />
          <span>Início</span>
        </NavLink>
        <NavLink to="/kanban" className="nav-item">
          <HiViewBoards size={22} />
          <span>Kanban</span>
        </NavLink>
        <NavLink to="/leads" className="nav-item">
          <HiUserGroup size={22} />
          <span>Leads</span>
        </NavLink>
        <NavLink to="/empreendimentos" className="nav-item">
          <FiHeart size={20} />
          <span>Planos</span>
        </NavLink>
        <NavLink to="/perfil" className="nav-item">
          <FiUser size={22} />
          <span>Perfil</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default Layout;
