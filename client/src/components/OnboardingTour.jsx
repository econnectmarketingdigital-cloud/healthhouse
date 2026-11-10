import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCheck, FiArrowRight, FiTarget, FiStar, FiMap, FiX, FiAward } from 'react-icons/fi';

const TOUR_STEPS = [
  {
    target: null,
    title: 'Bem-vindo, {nome}! 🚀',
    description: 'Vamos fazer um tour guiado e interativo pelo CRM. Vou te mostrar exatamente onde clicar!',
    actionText: 'Começar',
    icon: <FiStar size={28} color="var(--color-primary)" />,
    triggerNext: 'button'
  },
  {
    target: '[data-tour="nav-kanban"]',
    title: 'O Coração das Vendas 🗂️',
    description: 'Para começar, clique no menu "Kanban". É lá que você vai gerenciar o avanço dos seus clientes.',
    actionText: 'Clique em Kanban...',
    icon: <FiMap size={28} color="#f1c40f" />,
    triggerNext: '/kanban'
  },
  {
    target: '[data-tour="kanban-board"]',
    title: 'Seu Kanban de Vendas!',
    description: 'Aqui estão as colunas de vendas. Você avança o cliente apenas segurando o card dele e arrastando para a coluna seguinte (ex: de Novo para Contato Feito). Entendeu como funciona? Clique em Avançar!',
    actionText: 'Avançar',
    icon: <FiTarget size={28} color="#2ecc71" />,
    triggerNext: 'button'
  },
  {
    target: '[data-tour="nav-leads"]',
    title: 'Lista de Contatos 👥',
    description: 'Agora clique no menu "Leads". Lá fica a tabela completa com todos os seus clientes em formato de lista.',
    actionText: 'Clique em Leads...',
    icon: <FiMap size={28} color="#3498db" />,
    triggerNext: '/leads'
  },
  {
    target: '.leads-container, table',
    title: 'Gestão Completa!',
    description: 'Nesta tela de Leads você consegue buscar um cliente pelo nome ou telefone, e usar os filtros no topo para achar clientes de uma etapa específica. Tudo muito rápido.',
    actionText: 'Avançar',
    icon: <FiTarget size={28} color="#3498db" />,
    triggerNext: 'button'
  },
  {
    target: '[data-tour="nav-ranking"]',
    title: 'A Corrida pelo Topo 🏆',
    description: 'Aqui fica o Ranking Global da equipe. Clique para conferir quem são os campeões de vendas do mês!',
    actionText: 'Clique em Ranking...',
    icon: <FiAward size={28} color="#f1c40f" />,
    triggerNext: '/ranking'
  },
  {
    target: '.podium-container',
    title: 'O Pódio!',
    description: 'Nesta tela você vê o pódio com os 3 melhores corretores, e a lista completa logo abaixo. É aqui que você acompanha seu progresso em relação aos colegas. Gamificação pura!',
    actionText: 'Avançar',
    icon: <FiTarget size={28} color="#f1c40f" />,
    triggerNext: 'button'
  },
  {
    target: '[data-tour="nav-empreendimentos"]',
    title: 'Catálogo na Mão 🏢',
    description: 'Sempre que precisar tirar dúvidas com o cliente, vá ao menu "Imóveis". Clique nele agora!',
    actionText: 'Clique em Imóveis...',
    icon: <FiMap size={28} color="#9b59b6" />,
    triggerNext: '/empreendimentos'
  },
  {
    target: '.imoveis-grid, .empreendimentos-container',
    title: 'Plantas e Valores!',
    description: 'Aqui estão todos os empreendimentos. Você pode ver as tabelas, unidades disponíveis, faixas do MCMV e os valores atualizados.',
    actionText: 'Avançar',
    icon: <FiTarget size={28} color="#9b59b6" />,
    triggerNext: 'button'
  },
  {
    target: '[data-tour="btn-status-rodizio"]',
    title: 'Plantão Online 🟢',
    description: 'Sempre que for trabalhar, lembre-se de clicar aqui para mudar seu status para "Online". Assim você passa a receber os novos clientes gerados pelo marketing.',
    actionText: 'Avançar',
    icon: <FiTarget size={28} color="#e67e22" />,
    triggerNext: 'button'
  },
  {
    target: null,
    title: 'Tudo pronto! 🎉',
    description: 'Você já domina as principais ferramentas do CRM. Qualquer dúvida, o botão do Guia estará sempre no canto. Boas vendas e muito sucesso!',
    actionText: 'Finalizar',
    icon: <FiCheck size={28} color="var(--color-success)" />,
    triggerNext: 'button'
  }
];

export default function OnboardingTour({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);

  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Spotlight Effect with SVG Mask
  useEffect(() => {
    if (!isOpen) {
      setTargetRect(null);
      // Remove any glow classes
      document.querySelectorAll('.tour-spotlight').forEach(el => {
        el.classList.remove('tour-spotlight');
      });
      return;
    }

    const updateRect = () => {
      const step = TOUR_STEPS[currentStep];
      if (step && step.target) {
        const el = document.querySelector(step.target);
        if (el) {
          const rect = el.getBoundingClientRect();
          setTargetRect({
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          });
          // Add glow class
          document.querySelectorAll('.tour-spotlight').forEach(e => e.classList.remove('tour-spotlight'));
          el.classList.add('tour-spotlight');

          // Temporarily raise the z-index of the sidebar if the target is inside it
          const sidebar = el.closest('.sidebar');
          if (sidebar) {
            sidebar.style.zIndex = '100001';
            sidebar.classList.add('tour-parent-raised');
          }
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      document.querySelectorAll('.tour-parent-raised').forEach(e => {
        e.style.zIndex = '';
        e.classList.remove('tour-parent-raised');
      });
    };
  }, [currentStep, isOpen, location.pathname]);

  // Auto-advance
  useEffect(() => {
    if (!isOpen) return;
    const step = TOUR_STEPS[currentStep];
    if (step && typeof step.triggerNext === 'string' && step.triggerNext.startsWith('/')) {
      if (location.pathname === step.triggerNext) {
        setTimeout(() => setCurrentStep(prev => prev + 1), 500);
      }
    }
  }, [location.pathname, currentStep, isOpen]);

  const handleNext = () => {
    if (currentStep === TOUR_STEPS.length - 1) {
      localStorage.setItem('@CRM_Tour_Done', 'true');
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('@CRM_Tour_Done', 'true');
    onClose();
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isWaitingAction = typeof step.triggerNext === 'string' && step.triggerNext.startsWith('/');

  return (
    <>
      {/* SVG Overlay Mask */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 100000, pointerEvents: 'none'
      }}>
        <svg width="100%" height="100%">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect 
                  x={targetRect.x - 8} 
                  y={targetRect.y - 8} 
                  width={targetRect.width + 16} 
                  height={targetRect.height + 16} 
                  fill="black" 
                  rx="12" 
                />
              )}
            </mask>
          </defs>
          <rect 
            x="0" y="0" width="100%" height="100%" 
            fill="rgba(0, 0, 0, 0.85)" 
            mask="url(#spotlight-mask)" 
          />
        </svg>
      </div>

      {/* Floating Card */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        zIndex: 100002,
        width: '380px',
        backgroundColor: 'var(--color-surface, #231E1B)',
        border: '1px solid var(--color-primary, #d4956a)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(0, 245, 160, 0.25)',
        overflow: 'hidden',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <style>
          {`
            @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes pulseText { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
            .tour-spotlight {
              box-shadow: 0 0 0 4px rgba(0, 245, 160, 0.5), 0 0 25px rgba(0, 245, 160, 0.7) !important;
              border-radius: 8px !important;
              transition: all 0.3s ease;
            }
          `}
        </style>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', color: 'var(--color-primary)', textTransform: 'uppercase' }}>
            Tour Interativo ({currentStep + 1}/{TOUR_STEPS.length})
          </span>
          <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <FiX size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 20px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
              backgroundColor: 'rgba(0, 245, 160, 0.12)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {step.icon}
            </div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {step.title.replace('{nome}', user?.nome?.split(' ')[0] || 'Corretor')}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--color-text-secondary)' }}>
                {step.description}
              </p>
            </div>
          </div>
        </div>

        {/* Footer / Action */}
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: '0.8rem', cursor: 'pointer' }}>
            Pular tudo
          </button>
          
          {isWaitingAction ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600, animation: 'pulseText 2s infinite' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
              {step.actionText}
            </div>
          ) : (
            <button onClick={handleNext} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {step.actionText} {currentStep === TOUR_STEPS.length - 1 ? <FiCheck /> : <FiArrowRight />}
            </button>
          )}
        </div>
        
        {/* Progress Bar */}
        <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--color-border)' }}>
          <div style={{ 
            height: '100%', 
            width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%`,
            backgroundColor: 'var(--color-primary)',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>
    </>
  );
}
