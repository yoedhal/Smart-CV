import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const iconMap = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    info: <Info size={20} />,
  };

  const colorMap = {
    success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', icon: '#10b981', text: '#ecfdf5' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', icon: '#ef4444', text: '#fef2f2' },
    info: { bg: 'rgba(79, 70, 229, 0.15)', border: 'rgba(79, 70, 229, 0.4)', icon: '#818cf8', text: '#eef2ff' },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        left: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        zIndex: 9999,
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => {
          const colors = colorMap[toast.type] || colorMap.info;
          return (
            <div
              key={toast.id}
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${colors.border}`,
                borderRight: `4px solid ${colors.icon}`,
                color: colors.text,
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                minWidth: '280px',
                maxWidth: '400px',
                pointerEvents: 'all',
                animation: 'toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                direction: 'rtl',
              }}
            >
              <span style={{ color: colors.icon, flexShrink: 0 }}>{iconMap[toast.type]}</span>
              <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: 500 }}>{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                style={{ background: 'transparent', border: 'none', color: colors.text, cursor: 'pointer', opacity: 0.6, padding: 0, flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
