import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Base compartilhada: foco contido, restauração de foco, Escape e bloqueio do fundo. */
export function Modal({ isOpen = true, title, children, onClose, isBusy = false, className = 'max-w-lg' }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(isBusy);
  useEffect(() => { closeRef.current = onClose; busyRef.current = isBusy; }, [onClose, isBusy]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    const focusable = () => [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter((element) => !element.hidden);
    (dialog.querySelector('[data-autofocus]') || focusable()[0] || dialog).focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busyRef.current) closeRef.current();
      }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0] || dialog;
        const last = elements.at(-1) || dialog;
        if (!elements.length || !dialog.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    };
    const onFocusIn = (event) => {
      if (!dialog.contains(event.target)) (focusable()[0] || dialog).focus();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs" onClick={(event) => {
      if (event.target === event.currentTarget && !isBusy) onClose();
    }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={isBusy} tabIndex={-1}
        className={`max-h-[90dvh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl ${className}`}>
        <header className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <h2 id={titleId} className="font-display text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} disabled={isBusy} aria-label="Fechar diálogo" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">✕</button>
        </header>
        {children}
      </section>
    </div>, document.body,
  );
}
