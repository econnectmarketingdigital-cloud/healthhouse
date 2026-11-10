import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUserPlus, FiUser, FiPower, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function Equipe() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [novoCorretor, setNovoCorretor] = useState({ nome: '', email: '', senha: '', role: 'corretor' });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const data = await api.usuarios.getUsuarios();
      setUsuarios(data || []);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar equipe', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleAtivo = async (id, currentStatus) => {
    try {
      await api.usuarios.toggleUsuarioAtivo(id, { ativo: !currentStatus });
      addToast('Status do usuário atualizado.', 'success');
      fetchUsuarios();
    } catch (err) {
      addToast(err.message || 'Erro ao atualizar status', 'error');
    }
  };

  const handleAddCorretor = async (e) => {
    e.preventDefault();
    if (!novoCorretor.nome || !novoCorretor.email || !novoCorretor.senha) {
      return addToast('Preencha todos os campos obrigatórios', 'error');
    }
    try {
      setSubmitting(true);
      await api.auth.register({ 
        nome: novoCorretor.nome.trim(), 
        email: novoCorretor.email.trim(), 
        senha: novoCorretor.senha, 
        role: novoCorretor.role 
      });
      addToast('Membro de equipe adicionado com sucesso!', 'success');
      setNovoCorretor({ nome: '', email: '', senha: '', role: 'corretor' });
      fetchUsuarios();
    } catch (err) {
      addToast(err.message || 'Erro ao adicionar membro de equipe', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcluir = async (id, nome) => {
    if (window.confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o usuário ${nome}?`)) {
      try {
        await api.usuarios.deleteUsuario(id);
        addToast('Usuário excluído com sucesso.', 'success');
        fetchUsuarios();
      } catch (err) {
        addToast(err.message || 'Erro ao excluir usuário', 'error');
      }
    }
  };

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="spinner"></div>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 className="font-heading" style={{ fontSize: '2rem', marginBottom: '2rem', color: '#FFFFFF', fontWeight: 800 }}>Minha Equipe</h1>

      {user?.role === 'gestor' && (
        <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
          <h2 className="font-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.4rem', color: '#00F5A0', margin: '0 0 1.5rem 0' }}>
            <FiUserPlus /> Novo Membro da Equipe
          </h2>
          <form onSubmit={handleAddCorretor} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Nome Completo</label>
              <input
                type="text"
                required
                value={novoCorretor.nome}
                onChange={e => setNovoCorretor({...novoCorretor, nome: e.target.value})}
                className="input"
                placeholder="Ex: João Silva"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>E-mail (Acesso)</label>
              <input
                type="email"
                required
                value={novoCorretor.email}
                onChange={e => setNovoCorretor({...novoCorretor, email: e.target.value})}
                className="input"
                placeholder="joao@gmail.com"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Senha Inicial</label>
              <input
                type="password"
                required
                value={novoCorretor.senha}
                onChange={e => setNovoCorretor({...novoCorretor, senha: e.target.value})}
                className="input"
                placeholder="mínimo 4 caracteres"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Tipo de Acesso</label>
              <select
                value={novoCorretor.role}
                onChange={e => setNovoCorretor({...novoCorretor, role: e.target.value})}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="corretor">Corretor</option>
                <option value="gestor">Gestor / Administrador</option>
              </select>
            </div>
            <div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', height: '42px' }}>
                {submitting ? 'Adicionando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
          <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBlockEnd: 0 }}>
            Dica: Ao cadastrar um Gmail válido, o usuário poderá usar o botão "Entrar com o Google" imediatamente sem precisar digitar a senha!
          </p>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left' }}>Usuário</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left' }}>Acesso</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left' }}>Status Plantão</th>
                {user?.role === 'gestor' && <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.5, borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(`/equipe/${u.id}`)}>
                      {u.avatar_url ? (
                        <img 
                          src={u.avatar_url} 
                          alt={u.nome} 
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #00F5A0' }} 
                        />
                      ) : (
                        <div style={{ 
                          width: '36px', height: '36px', borderRadius: '50%', 
                          backgroundColor: 'rgba(0,245,160,0.15)', color: '#00F5A0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem'
                        }}>
                          {u.nome.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{u.nome}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                      backgroundColor: u.role === 'gestor' ? 'rgba(0,245,160,0.12)' : 'rgba(255,255,255,0.06)',
                      color: u.role === 'gestor' ? '#00F5A0' : 'var(--color-text-secondary)',
                      border: u.role === 'gestor' ? '1px solid rgba(0,245,160,0.3)' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {u.role === 'gestor' ? 'Gestor' : 'Corretor'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: u.disponivel_rodizio ? '#00F5A0' : '#F43F5E' }} />
                      <span style={{ fontSize: '0.85rem', color: '#FFFFFF' }}>{u.disponivel_rodizio ? 'Disponível (Rodízio)' : 'Fora do Rodízio'}</span>
                    </div>
                  </td>
                  {user?.role === 'gestor' && (
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {user.id !== u.id && (
                          <>
                            <button
                              onClick={() => toggleAtivo(u.id, u.ativo)}
                              className={`btn ${u.ativo ? 'btn-secondary' : 'btn-primary'}`}
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              {u.ativo ? 'Desativar' : 'Reativar'}
                            </button>
                            <button
                              onClick={() => handleExcluir(u.id, u.nome)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.3)' }}
                            >
                              Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
