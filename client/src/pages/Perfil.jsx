import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import PushNotificationManager from '../components/PushNotificationManager';
import { FiImage, FiUpload, FiCheck, FiMove, FiSave, FiUser, FiCamera, FiTrash2 } from 'react-icons/fi';

const Perfil = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingPos, setSavingPos] = useState(false);

  // Parse existing position or default to 50% 50%
  const parsePos = (posStr) => {
    if (!posStr) return { x: 50, y: 50 };
    const parts = posStr.split(' ');
    if (parts.length === 2) {
      const px = parseFloat(parts[0]) || 50;
      const py = parseFloat(parts[1]) || 50;
      return { x: px, y: py };
    }
    return { x: 50, y: 50 };
  };

  const [pos, setPos] = useState(() => parsePos(user?.wallpaper_position));
  const isDragging = useRef(false);
  const startCoords = useRef({ x: 0, y: 0, posX: 50, posY: 50 });

  useEffect(() => {
    if (user?.wallpaper_position) {
      setPos(parsePos(user.wallpaper_position));
    }
  }, [user?.wallpaper_position]);

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Upload Profile Avatar
  const handleAvatarChange = async (event) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      
      setUploadingAvatar(true);
      const base64 = await fileToBase64(file);
      
      const res = await api.auth.uploadImage(base64, 'avatar');
      const publicUrl = res.url || res.data?.url;

      // Refetch fresh user data from server to guarantee sync
      const freshUser = await api.auth.getMe();
      updateUser(freshUser);

      addToast('🎉 Foto de perfil atualizada com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      addToast(error.message || 'Erro ao enviar foto de perfil', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Upload Wallpaper
  const handleWallpaperChange = async (event) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      
      setUploadingWallpaper(true);
      const base64 = await fileToBase64(file);
      
      const res = await api.auth.uploadImage(base64, 'wallpaper');
      const publicUrl = res.url || res.data?.url;

      const defaultPos = '50% 50%';
      setPos({ x: 50, y: 50 });

      await api.auth.updateProfile({ wallpaper_url: publicUrl, wallpaper_position: defaultPos });
      
      // Refetch fresh user data from server to guarantee sync
      const freshUser = await api.auth.getMe();
      updateUser(freshUser);
      
      addToast('🎉 Papel de parede atualizado! Arraste para ajustar o enquadramento.', 'success');
    } catch (error) {
      console.error(error);
      addToast(error.message || 'Erro ao enviar imagem de papel de parede', 'error');
    } finally {
      setUploadingWallpaper(false);
    }
  };

  const handleMouseDown = (e) => {
    isDragging.current = true;
    startCoords.current = {
      x: e.clientX,
      y: e.clientY,
      posX: pos.x,
      posY: pos.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - startCoords.current.x;
    const deltaY = e.clientY - startCoords.current.y;

    const newX = Math.max(0, Math.min(100, startCoords.current.posX - (deltaX * 0.2)));
    const newY = Math.max(0, Math.min(100, startCoords.current.posY - (deltaY * 0.2)));

    const updated = { x: Math.round(newX), y: Math.round(newY) };
    setPos(updated);
    updateUser({ wallpaper_position: `${updated.x}% ${updated.y}%` });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleSliderYChange = (e) => {
    const newY = Number(e.target.value);
    const updated = { ...pos, y: newY };
    setPos(updated);
    updateUser({ wallpaper_position: `${updated.x}% ${updated.y}%` });
  };

  const handleSliderXChange = (e) => {
    const newX = Number(e.target.value);
    const updated = { ...pos, x: newX };
    setPos(updated);
    updateUser({ wallpaper_position: `${updated.x}% ${updated.y}%` });
  };

  const handleSavePosition = async () => {
    try {
      setSavingPos(true);
      const posString = `${pos.x}% ${pos.y}%`;
      await api.auth.updateProfile({ wallpaper_position: posString });
      updateUser({ wallpaper_position: posString });
      addToast('Enquadramento salvo com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Erro ao salvar enquadramento', 'error');
    } finally {
      setSavingPos(false);
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      <div>
        <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 6vw, 2.2rem)', margin: 0, fontWeight: 800, color: '#FFFFFF' }}>Meu Perfil</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
          Personalize sua foto de perfil para o ranking e configure notificações no celular.
        </p>
      </div>

      {/* 1. SEÇÃO DE FOTO DE PERFIL (AVATAR) */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'rgba(0, 245, 160, 0.12)', color: '#00F5A0', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(0, 245, 160, 0.25)' }}>
            <FiUser size={22} />
          </div>
          <div>
            <h2 className="font-heading" style={{ margin: 0, fontSize: '1.3rem', color: '#FFFFFF' }}>
              Foto de Perfil (Avatar do Ranking)
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
              Esta foto será exibida no seu perfil e no Pódio / Tabela do Ranking Global.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
          {/* Avatar Preview */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'rgba(18, 20, 24, 0.9)',
              border: '3px solid #00F5A0',
              boxShadow: '0 0 25px rgba(0, 245, 160, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              color: '#00F5A0',
              fontWeight: 800
            }}>
              {user?.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.nome} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                user?.nome?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>

            <label 
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: '#00F5A0',
                color: '#061912',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: uploadingAvatar ? 'wait' : 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                border: '2px solid #08090A'
              }}
              title="Trocar Foto de Perfil"
            >
              {uploadingAvatar ? <div className="spinner" style={{ width: 14, height: 14, borderTopColor: '#061912' }}></div> : <FiCamera size={16} />}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                disabled={uploadingAvatar}
                style={{ display: 'none' }} 
              />
            </label>
          </div>

          {/* User Info & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>{user?.nome}</div>
              <div style={{ fontSize: '0.9rem', color: '#00F5A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{user?.role}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{user?.email}</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <label 
                className="btn btn-primary" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: uploadingAvatar ? 'wait' : 'pointer', padding: '0.6rem 1.25rem' }}
              >
                {uploadingAvatar ? <div className="spinner" style={{ width: 14, height: 14, borderTopColor: '#061912' }}></div> : <FiUpload />}
                {uploadingAvatar ? 'Enviando...' : 'Carregar Nova Foto'}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  disabled={uploadingAvatar}
                  style={{ display: 'none' }} 
                />
              </label>

              {user?.avatar_url && (
                <button 
                  className="btn btn-secondary" 
                  onClick={async () => {
                    await api.auth.updateProfile({ avatar_url: null });
                    updateUser({ avatar_url: null });
                    addToast('Foto de perfil removida', 'info');
                  }}
                  style={{ color: '#F43F5E', borderColor: 'rgba(244,63,94,0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FiTrash2 /> Remover
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEÇÃO DE NOTIFICAÇÕES NO CELULAR (PUSH) */}
      <PushNotificationManager mode="widget" />

      {/* 3. SEÇÃO DE PAPEL DE PAREDE (WALLPAPER) */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
            <FiImage size={22} />
          </div>
          <div>
            <h2 className="font-heading" style={{ margin: 0, fontSize: '1.3rem', color: '#FFFFFF' }}>
              Personalizar Papel de Parede
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
              Escolha uma imagem de fundo para o painel do seu CRM e ajuste o enquadramento perfeito.
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label 
            className="btn btn-primary" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: uploadingWallpaper ? 'wait' : 'pointer', opacity: uploadingWallpaper ? 0.7 : 1 }}
          >
            {uploadingWallpaper ? <div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#061912' }}></div> : <FiUpload />}
            {uploadingWallpaper ? 'Enviando...' : 'Escolher Imagem de Fundo'}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleWallpaperChange} 
              disabled={uploadingWallpaper}
              style={{ display: 'none' }} 
            />
          </label>

          {user?.wallpaper_url && (
            <>
              <button 
                className="btn btn-primary"
                onClick={handleSavePosition}
                disabled={savingPos}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#00D68B', borderColor: '#00D68B', color: '#061912', fontWeight: 700 }}
              >
                {savingPos ? <div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#061912' }}></div> : <FiSave />}
                Salvar Enquadramento
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={async () => {
                  await api.auth.updateProfile({ wallpaper_url: null, wallpaper_position: null });
                  updateUser({ wallpaper_url: null, wallpaper_position: null });
                  addToast('Papel de parede removido', 'info');
                }}
                style={{ color: '#F43F5E', borderColor: 'rgba(244,63,94,0.3)' }}
              >
                Remover Fundo
              </button>
            </>
          )}
        </div>
        
        {user?.wallpaper_url && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FiMove color="#00F5A0" /> Clique e arraste na foto para reposicionar ou use as barras abaixo:
              </span>
              <span style={{ fontSize: '0.8rem', color: '#00F5A0', background: 'rgba(0, 245, 160, 0.12)', padding: '4px 10px', borderRadius: '8px', fontWeight: 600 }}>
                Posição: X={pos.x}% | Y={pos.y}%
              </span>
            </div>

            {/* Interactive Drag Box */}
            <div 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ 
                border: '2px dashed rgba(0, 245, 160, 0.4)', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                position: 'relative', 
                height: '240px',
                cursor: 'grab',
                backgroundImage: `url(${user.wallpaper_url})`,
                backgroundSize: 'cover',
                backgroundPosition: `${pos.x}% ${pos.y}%`,
                userSelect: 'none',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                <FiMove /> Arraste para enquadrar
              </div>
              <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#00F5A0', border: '1px solid rgba(0, 245, 160, 0.3)' }}>
                <FiCheck /> Pré-visualização Ativa
              </div>
            </div>

            {/* Precision Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                  Ajuste Vertical (Cima / Baixo): <strong>{pos.y}%</strong>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={pos.y} 
                  onChange={handleSliderYChange}
                  style={{ width: '100%', accentColor: '#00F5A0', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                  Ajuste Horizontal (Esquerda / Direita): <strong>{pos.x}%</strong>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={pos.x} 
                  onChange={handleSliderXChange}
                  style={{ width: '100%', accentColor: '#00F5A0', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Perfil;
