import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTrendingUp, FiTarget, FiUsers, FiBarChart2, FiPercent } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const etapaLabels = {
  novo: 'Novo', contato_feito: 'Contato Feito', visita_agendada: 'Visita Agendada',
  proposta: 'Proposta', documentacao: 'Documentação', fechado: 'Fechado', perdido: 'Perdido',
};
const etapaColors = {
  novo: '#38BDF8', contato_feito: '#00F5A0', visita_agendada: '#FBBF24',
  proposta: '#00F5A0', documentacao: '#818CF8', fechado: '#00F5A0', perdido: '#F43F5E',
};
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function CorretorPerfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try { setLoading(true); const res = await api.dashboard.getCorretorPerformance(id); setData(res); }
    catch (err) { addToast(err.message || 'Erro', 'error'); }
    finally { setLoading(false); }
  })(); }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Carregando perfil...</div>;
  if (!data) return <div style={{ padding: '2rem' }}>Corretor não encontrado.</div>;

  const { corretor, vgvTotal, vgvMes, metaIndividual, totalLeads, leadsPorEtapa, vendasPorEmpreendimento, leadsRecentes, taxaConversao } = data;
  const metaP = metaIndividual > 0 ? Math.min((vgvMes / metaIndividual) * 100, 100) : 0;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className='btn btn-outline' style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <FiArrowLeft /> Voltar
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
          {corretor.nome.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className='font-heading' style={{ fontSize: '2rem', color: 'var(--color-text)', margin: 0 }}>{corretor.nome}</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>{corretor.email}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>{corretor.role}</span>
            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: corretor.ativo ? 'var(--color-success-soft)' : 'var(--color-danger-soft)', color: corretor.ativo ? 'var(--color-success)' : 'var(--color-danger)' }}>{corretor.ativo ? 'Ativo' : 'Inativo'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className='card' style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}><FiTrendingUp size={24} /></div>
          <div className='font-heading' style={{ fontSize: '1.75rem', color: 'var(--color-accent)' }}>{fmt(vgvTotal)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>VGV Total</div>
        </div>
        <div className='card' style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}><FiBarChart2 size={24} /></div>
          <div className='font-heading' style={{ fontSize: '1.75rem', color: 'var(--color-accent)' }}>{fmt(vgvMes)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>VGV Este Mês</div>
        </div>
        <div className='card' style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--color-info)', marginBottom: '0.5rem' }}><FiUsers size={24} /></div>
          <div className='font-heading' style={{ fontSize: '1.75rem', color: 'var(--color-accent)' }}>{totalLeads}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Leads Totais</div>
        </div>
        <div className='card' style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--color-warning)', marginBottom: '0.5rem' }}><FiPercent size={24} /></div>
          <div className='font-heading' style={{ fontSize: '1.75rem', color: 'var(--color-accent)' }}>{taxaConversao}%</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Taxa Conversão</div>
        </div>
      </div>

      {metaIndividual > 0 && (
        <div className='card' style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <FiTarget style={{ color: 'var(--color-primary)' }} />
            <h3 className='font-heading' style={{ color: 'var(--color-secondary)', margin: 0 }}>Meta Individual (Mês)</h3>
          </div>
          <div style={{ background: 'var(--color-surface-elevated)', borderRadius: '99px', height: '14px', overflow: 'hidden', marginBottom: '0.5rem' }}>
            <div style={{ width: metaP + '%', background: metaP >= 100 ? 'var(--color-success)' : 'var(--color-primary)', height: '100%', borderRadius: '99px', transition: 'width 1s ease-in-out' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>{fmt(vgvMes)} ({metaP.toFixed(0)}%)</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Meta: {fmt(metaIndividual)}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className='card'>
          <h3 className='card-title' style={{ marginBottom: '1rem' }}>Funil de Leads</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {leadsPorEtapa.length > 0 ? leadsPorEtapa.map(item => (
              <div 
                key={item.etapa} 
                onClick={() => navigate(`/leads?corretor_id=${id}&etapa=${item.etapa}`)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'var(--color-surface-hover)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: etapaColors[item.etapa] || '#888' }} />
                  <span style={{ fontSize: '0.9rem' }}>{etapaLabels[item.etapa] || item.etapa}</span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{item.count}</span>
              </div>
            )) : <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Nenhum lead atribuído.</p>}
          </div>
        </div>
        <div className='card'>
          <h3 className='card-title' style={{ marginBottom: '1rem' }}>Vendas por Empreendimento</h3>
          {vendasPorEmpreendimento.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {vendasPorEmpreendimento.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'var(--color-surface-hover)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.empreendimento || 'Sem empreendimento'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{item.vendas} {item.vendas === 1 ? 'venda' : 'vendas'}</div>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(item.vgv)}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Nenhuma venda registrada.</p>}
        </div>
      </div>

      <div className='card' style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <h3 className='card-title'>Leads Recentes</h3>
        </div>
        <div className='table-container' style={{ border: 'none', borderRadius: 0 }}>
          <table className='table'>
            <thead><tr><th>Nome</th><th>Etapa</th><th>Empreendimento</th><th>Data</th></tr></thead>
            <tbody>
              {leadsRecentes.length > 0 ? leadsRecentes.map(lead => (
                <tr key={lead.id} onClick={() => navigate('/leads/' + lead.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>{lead.nome}</td>
                  <td><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: etapaColors[lead.etapa] || '#888', color: '#fff' }}>{etapaLabels[lead.etapa] || lead.etapa}</span></td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{lead.empreendimento_nome || '-'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                </tr>
              )) : <tr><td colSpan='4' style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Nenhum lead encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
