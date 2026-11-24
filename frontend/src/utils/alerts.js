import { toast } from 'sonner';

// Avisos y confirmaciones de la app. Mantiene la forma de `Swal.fire(opts)`
// (devuelve { isConfirmed, value }) para no reescribir cada llamada:
//  · con `showCancelButton` o `input` → diálogo de confirmación (ConfirmHost)
//  · sin ellos → toast de sonner según `icon`
// `html` se muestra como texto plano (sin etiquetas): las descripciones vienen
// del usuario y no deben interpretarse como HTML.

let openConfirm = null;
export const registerConfirmHost = (fn) => { openConfirm = fn; };

export const htmlToLines = (html) =>
  String(html)
    .split(/<br\s*\/?>/i)
    .map(l => l.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

const DANGER_COLOR = /DC2626|B42318|EF4444|danger|neg-/i;

const fire = (opts = {}) => {
  const lines = opts.html ? htmlToLines(opts.html) : (opts.text ? [opts.text] : []);

  if (opts.showCancelButton || opts.input) {
    const req = {
      title: opts.title,
      lines,
      input: opts.input,
      inputPlaceholder: opts.inputPlaceholder,
      confirmText: opts.confirmButtonText || 'Confirmar',
      cancelText: opts.cancelButtonText || 'Cancelar',
      danger: opts.danger ?? DANGER_COLOR.test(opts.confirmButtonColor || ''),
    };
    if (openConfirm) return openConfirm(req);
    return Promise.resolve({ isConfirmed: window.confirm([req.title, ...lines].join('\n')) });
  }

  const show = { success: toast.success, error: toast.error, warning: toast.warning, info: toast.info }[opts.icon] || toast;
  show(opts.title, lines.length ? { description: lines.join(' ') } : undefined);
  return Promise.resolve({ isConfirmed: true });
};

const Alerts = { fire };
export default Alerts;
