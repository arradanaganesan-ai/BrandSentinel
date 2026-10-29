import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import clsx from 'clsx';

/* ────────────────────────────────────────────────────────────────
   Buttons
   ──────────────────────────────────────────────────────────────── */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: React.ReactNode;
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ' +
  'disabled:opacity-55 disabled:cursor-not-allowed select-none rounded-md';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-vermilion text-white hover:bg-vermilion-hover shadow-sm',
  secondary: 'bg-white text-ink border border-line hover:bg-surface-inset shadow-xs',
  ghost: 'text-ink-soft hover:bg-ink/[0.06] hover:text-ink',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

const buttonSizes = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-[13px] px-4 py-2.5',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}) => (
  <button
    className={clsx(
      buttonBase,
      buttonVariants[variant],
      buttonSizes[size],
      className
    )}
    disabled={disabled || loading}
    {...rest}
  >
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
    {children}
  </button>
);

/* ────────────────────────────────────────────────────────────────
   Surfaces
   ──────────────────────────────────────────────────────────────── */

export const Panel: React.FC<{
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'section' | 'article';
}> = ({ className, children, as: Tag = 'div' }) => (
  <Tag className={clsx('bg-white border border-line rounded-lg shadow-card', className)}>
    {children}
  </Tag>
);

/* ────────────────────────────────────────────────────────────────
   Badges
   ──────────────────────────────────────────────────────────────── */

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-inset text-ink-soft border-line',
  brand: 'bg-vermilion-tint text-indigo-400 border-indigo-800/60',
  success: 'bg-teal-950 text-teal-400 border-teal-800/70',
  warning: 'bg-amber-950 text-amber-300 border-amber-800/70',
  danger: 'bg-red-950 text-red-300 border-red-800/70',
  info: 'bg-blue-950 text-blue-300 border-blue-800/70',
  violet: 'bg-purple-950 text-purple-300 border-purple-800/70',
};

export const Badge: React.FC<{
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
  title?: string;
}> = ({ tone = 'neutral', className, children, title }) => (
  <span
    title={title}
    className={clsx(
      'inline-flex items-center gap-1 border px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
      badgeTones[tone],
      className
    )}
  >
    {children}
  </span>
);

/* Content lifecycle statuses -> tone mapping (shared across pages) */
export const statusTone = (status: string): BadgeTone => {
  switch (status) {
    case 'APPROVED':
    case 'RESOLVED_BY_EDIT':
    case 'SUPPORTED':
      return 'success';
    case 'REJECTED':
    case 'CONFLICTING':
    case 'CRITICAL':
    case 'HIGH':
      return 'danger';
    case 'CHANGES_REQUESTED':
    case 'UNDER_REVIEW':
    case 'PARTIALLY_SUPPORTED':
    case 'NEEDS_HUMAN_REVIEW':
    case 'MEDIUM':
      return 'warning';
    case 'SUBMITTED':
    case 'OPEN':
    case 'FLAGGED_FOR_REVIEW':
      return 'brand';
    case 'LOW':
    case 'INFO':
      return 'info';
    default:
      return 'neutral';
  }
};

/* ────────────────────────────────────────────────────────────────
   Form controls
   ──────────────────────────────────────────────────────────────── */

const fieldControl =
  'w-full bg-ivory border border-line rounded-md px-3 py-2 text-[13px] text-ink ' +
  'placeholder:text-slate-500 transition-colors ' +
  'focus:border-vermilion focus:ring-2 focus:ring-vermilion/20 focus:outline-none';

export const Input: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
> = ({ className, invalid, ...rest }) => (
  <input
    className={clsx(fieldControl, invalid && 'border-red-500 focus:border-red-500 focus:ring-red-500/20', className)}
    {...rest}
  />
);

export const Textarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
> = ({ className, invalid, ...rest }) => (
  <textarea
    className={clsx(fieldControl, 'min-h-[96px] resize-y leading-relaxed', invalid && 'border-red-500', className)}
    {...rest}
  />
);

export const Select: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
> = ({ className, invalid, children, ...rest }) => (
  <select
    className={clsx(fieldControl, 'appearance-none pr-8 bg-no-repeat', invalid && 'border-red-500', className)}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E625A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
      backgroundPosition: 'right 10px center',
    }}
    {...rest}
  >
    {children}
  </select>
);

export const Field: React.FC<{
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ label, hint, error, required, children, className }) => {
  const id = useId();
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
        >
          {label}
          {required && <span className="text-vermilion ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      <div>{typeof children === 'function' ? (children as any)(id) : children}</div>
      {hint && !error && <p className="text-[11px] text-ink-muted">{hint}</p>}
      {error && (
        <p className="text-[11px] text-red-400 flex items-center gap-1" role="alert">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────
   Loading / empty / error states
   ──────────────────────────────────────────────────────────────── */

export const Skeleton: React.FC<{ className?: string; count?: number }> = ({
  className = 'h-4 w-full',
  count = 1,
}) => (
  <div className="space-y-2" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={clsx('skeleton', className)} />
    ))}
  </div>
);

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className }) => (
  <div className={clsx('text-center py-12 px-6', className)}>
    {icon && (
      <div className="mx-auto mb-3 w-10 h-10 rounded-md bg-surface-inset border border-line flex items-center justify-center text-ink-faint">
        {icon}
      </div>
    )}
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    {description && (
      <p className="mt-1 text-xs text-ink-muted max-w-md mx-auto leading-relaxed">{description}</p>
    )}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
  className?: string;
}> = ({
  message = 'We could not reach the BrandSentinel API.',
  onRetry,
  className,
}) => (
  <div
    role="alert"
    className={clsx(
      'rounded-lg border border-red-800/40 bg-red-950 px-4 py-3 text-xs text-red-300 flex items-start gap-2',
      className
    )}
  >
    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="font-semibold">{message}</p>
      <p className="text-[11px] opacity-80 mt-0.5">
        Ensure the backend is running on http://127.0.0.1:8000.
      </p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-[11px] font-semibold underline underline-offset-2 hover:text-red-200"
      >
        Retry
      </button>
    )}
  </div>
);

/* ────────────────────────────────────────────────────────────────
   Modal
   ──────────────────────────────────────────────────────────────── */

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}> = ({ open, onClose, title, description, children, footer, width = 'max-w-lg' }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#251C19]/45 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={clsx(
          'w-full bg-white border border-line rounded-lg shadow-2xl animate-scale-in outline-none',
          width
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-line">
            <div>
              {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
              {description && (
                <p className="text-[11px] text-ink-muted mt-0.5">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-inset transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-line bg-ivory/60 rounded-b-lg flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────
   Toasts
   ──────────────────────────────────────────────────────────────── */

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  detail?: string;
}

interface ToastApi {
  success: (message: string, detail?: string) => void;
  error: (message: string, detail?: string) => void;
  info: (message: string, detail?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
};

const toneStyles: Record<ToastTone, { wrap: string; icon: React.ReactNode }> = {
  success: {
    wrap: 'border-teal-800/60',
    icon: <CheckCircle2 className="w-4 h-4 text-teal-400" />,
  },
  error: {
    wrap: 'border-red-800/60',
    icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
  },
  info: {
    wrap: 'border-line',
    icon: <Info className="w-4 h-4 text-blue-300" />,
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string, detail?: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-3), { id, tone, message, detail }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, d) => push('success', m, d),
      error: (m, d) => push('error', m, d),
      info: (m, d) => push('info', m, d),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-[min(360px,calc(100vw-2.5rem))]"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-white border ${toneStyles[t.tone].wrap} shadow-xl rounded-lg px-4 py-3 flex items-start gap-2.5 animate-fade-up`}
          >
            <div className="mt-0.5 shrink-0">{toneStyles[t.tone].icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink leading-snug">{t.message}</p>
              {t.detail && (
                <p className="text-[11px] text-ink-muted mt-0.5 leading-snug break-words">{t.detail}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-ink-faint hover:text-ink transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/* ────────────────────────────────────────────────────────────────
   Page header (shared by application routes)
   ──────────────────────────────────────────────────────────────── */

export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ eyebrow, title, description, actions, icon }) => (
  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
    <div className="flex items-start gap-3.5 min-w-0 flex-1">
      {icon && (
        <div className="w-11 h-11 shrink-0 rounded-md bg-white border border-line shadow-xs flex items-center justify-center text-vermilion">
          {icon}
        </div>
      )}
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-vermilion mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] leading-tight font-semibold font-display text-ink tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] text-ink-muted mt-1 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
