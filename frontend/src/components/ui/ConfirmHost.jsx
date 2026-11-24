import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { registerConfirmHost } from '../../utils/alerts';

// Diálogo único de confirmación. `alerts.fire({ showCancelButton })` lo abre y
// espera la respuesta del usuario.
export const ConfirmHost = () => {
  const [req, setReq] = useState(null);
  const [value, setValue] = useState('');
  const resolver = useRef(null);

  useEffect(() => {
    registerConfirmHost((r) => new Promise((resolve) => {
      resolver.current = resolve;
      setValue('');
      setReq(r);
    }));
    return () => registerConfirmHost(null);
  }, []);

  const close = (isConfirmed) => {
    resolver.current?.({ isConfirmed, value: isConfirmed ? value : undefined });
    resolver.current = null;
    setReq(null);
  };

  return (
    <Dialog.Root open={!!req} onOpenChange={(o) => { if (!o) close(false); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dlg-overlay" />
        <Dialog.Content className="dlg-content dlg-confirm" aria-describedby={req?.lines?.length ? 'confirm-desc' : undefined}>
          {req && (
            <form onSubmit={(e) => { e.preventDefault(); if (!req.input || value) close(true); }}>
              <Dialog.Title className="dlg-title">{req.title}</Dialog.Title>
              {req.lines?.length > 0 && (
                <div id="confirm-desc" className="dlg-desc">
                  {req.lines.map((l, i) => <p key={i}>{l}</p>)}
                </div>
              )}
              {req.input && (
                <input
                  className="form-input"
                  type={req.input}
                  placeholder={req.inputPlaceholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                  style={{ marginTop: 16 }}
                />
              )}
              <div className="dlg-actions">
                <button type="button" className="btn btn-secondary" onClick={() => close(false)}>{req.cancelText}</button>
                <button type="submit" className={`btn ${req.danger ? 'btn-danger-solid' : 'btn-primary'}`} disabled={req.input && !value}>
                  {req.confirmText}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
