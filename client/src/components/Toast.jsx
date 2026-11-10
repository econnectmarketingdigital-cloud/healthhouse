import React, { useEffect } from 'react';

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'var(--color-success)';
      case 'error': return 'var(--color-danger)';
      case 'warning': return 'var(--color-warning)';
      default: return 'var(--color-info)';
    }
  };

  return (
    <div style={{
      padding: '12px 18px',
      backgroundColor: getBackgroundColor(),
      color: '#fff',
      borderRadius: '8px',
      marginBottom: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      minWidth: '260px',
      maxWidth: '380px',
      animation: 'fadeIn 0.2s ease',
      zIndex: 9999,
      pointerEvents: 'auto'
    }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
        style={{ 
          background: 'rgba(0,0,0,0.15)', 
          border: 'none', 
          color: '#fff', 
          cursor: 'pointer', 
          marginLeft: '12px',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
        title="Fechar"
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;
