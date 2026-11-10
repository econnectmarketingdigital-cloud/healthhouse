import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithGoogle, user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      setGoogleLoading(true);
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userInfo = await res.json();
      
      await loginWithGoogle(userInfo.email, userInfo.name);
      addToast('Conectado via Google com sucesso!', 'success');
      navigate('/');
    } catch (error) {
      addToast(error.message || 'Erro no login com Google', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  const loginGoogleAction = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => addToast('O login com Google falhou.', 'error'),
  });

  if (user) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      addToast('Login realizado com sucesso', 'success');
      navigate('/');
    } catch (error) {
      addToast(error.message || 'Erro ao fazer login', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    loginGoogleAction();
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#080A10',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Grid & Ambient Glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(to right, rgba(0, 198, 255, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 198, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        zIndex: 0
      }} />

      {/* Ambient Glows */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-15%', left: '10%', width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(0, 198, 255, 0.16) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(90px)', animation: 'float 12s infinite alternate ease-in-out'
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '5%', width: '55vw', height: '55vw',
          background: 'radial-gradient(circle, rgba(0, 114, 255, 0.14) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(100px)', animation: 'float 15s infinite alternate-reverse ease-in-out'
        }} />
      </div>

      <style>{`
        @keyframes float { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(4%, 4%) scale(1.08); } }
        .glass-login-card {
          background: rgba(14, 18, 28, 0.78);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(0, 198, 255, 0.15);
          box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(0, 198, 255, 0.18);
          border-radius: 24px;
          padding: 3rem 2.5rem;
          position: relative;
          z-index: 10;
        }
        .glass-input {
          background: rgba(8, 12, 20, 0.75) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          border-radius: 12px !important;
          padding: 0.85rem 1rem !important;
          transition: all 0.3s ease !important;
        }
        .glass-input:focus {
          border-color: rgba(0, 198, 255, 0.65) !important;
          box-shadow: 0 0 0 4px rgba(0, 198, 255, 0.16) !important;
          background: rgba(12, 16, 26, 0.92) !important;
        }
        .premium-btn {
          background: linear-gradient(135deg, #00C6FF 0%, #0072FF 100%);
          border: none;
          border-radius: 12px;
          color: #FFFFFF;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 1rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(0, 198, 255, 0.3);
          cursor: pointer;
        }
        .premium-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 198, 255, 0.5);
          background: linear-gradient(135deg, #29D2FF, #0084FF);
        }
      `}</style>

      <div className="glass-login-card" style={{ width: '100%', maxWidth: '420px', margin: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="/logo_icon.png?v=7" 
            alt="Health & House" 
            style={{ 
              width: '120px', 
              height: '120px', 
              objectFit: 'contain', 
              borderRadius: '50%',
              padding: '6px',
              background: 'radial-gradient(circle, rgba(0, 198, 255, 0.14) 0%, rgba(8, 10, 16, 0.7) 100%)',
              display: 'block',
              boxShadow: '0 0 30px rgba(0, 198, 255, 0.3)',
              border: '1px solid rgba(0, 198, 255, 0.35)'
            }} 
          />
          <h2 className="font-heading" style={{ color: '#FFFFFF', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '1.5px', margin: '0.9rem 0 0 0' }}>
            HEALTH & HOUSE
          </h2>
          <p style={{ color: '#00C6FF', letterSpacing: '3px', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 700, marginTop: '0.3rem', opacity: 0.95 }}>
            Saúde e Bem Estar • CRM
          </p>
        </div>

        {/* Google Login Button */}
        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '1.5rem'
          }}
          onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
          onMouseOut={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          {googleLoading ? 'Conectando...' : 'Entrar com o Google'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ padding: '0 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>ou com e-mail</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Email</label>
            <input type="email" className="input glass-input" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%' }} />
          </div>
          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Senha</label>
            <input type="password" className="input glass-input" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%' }} />
          </div>
          <button type="submit" className="premium-btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Autenticando...' : 'Acessar Plataforma'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
