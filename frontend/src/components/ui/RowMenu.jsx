import * as ContextMenu from '@radix-ui/react-context-menu';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

/*
 * Acciones rápidas de una fila: el MISMO menú se abre con clic derecho (o
 * mantener presionado en el teléfono) sobre la fila y con el botón ⋯.
 *
 * actions: Array<
 *   | { label, icon?: LucideIcon, onSelect: () => void, danger?: boolean, disabled?: boolean }
 *   | 'sep'                                   // separador
 *   | { heading: string }                     // título de grupo
 *   | null | false                            // se ignoran (para condicionales)
 * >
 *
 * <RowMenu actions={acts}><tr>…</tr></RowMenu>     // clic derecho sobre la fila
 * <RowMenuButton actions={acts} label="Acciones de X" />  // botón ⋯
 */

// Los menús viven en un portal, pero en React los eventos suben igual hasta la
// fila (que suele navegar con onClick/Enter): se frenan aquí.
const stop = (e) => e.stopPropagation();

const renderItems = (P, actions) => {
  const list = actions.filter(Boolean);
  return list.map((a, i) => {
    if (a === 'sep') return <P.Separator key={`s${i}`} className="menu-sep" />;
    if (a.heading) return <P.Label key={`h${i}`} className="menu-label">{a.heading}</P.Label>;
    const Icon = a.icon;
    return (
      <P.Item key={a.label} className={`menu-item ${a.danger ? 'danger' : ''}`} disabled={a.disabled} onSelect={a.onSelect}>
        {Icon && <Icon size={16} />} {a.label}
      </P.Item>
    );
  });
};

export const RowMenu = ({ actions, children }) => (
  <ContextMenu.Root modal={false}>
    <ContextMenu.Trigger asChild data-row-menu="">{children}</ContextMenu.Trigger>
    <ContextMenu.Portal>
      <ContextMenu.Content className="menu-content" collisionPadding={8} onClick={stop} onKeyDown={stop}>
        {renderItems(ContextMenu, actions)}
      </ContextMenu.Content>
    </ContextMenu.Portal>
  </ContextMenu.Root>
);

export const RowMenuButton = ({ actions, label, size = 18 }) => (
  <DropdownMenu.Root modal={false}>
    <DropdownMenu.Trigger asChild>
      <button
        type="button"
        className="icon-btn ghost sm row-menu-btn"
        aria-label={label}
        title="Más opciones (también con clic derecho en la fila)"
        // La fila suele ser un enlace o tener onClick/Enter: que el ⋯ no la active.
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        onKeyDown={stop}
      >
        <MoreHorizontal size={size} />
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content className="menu-content" align="end" sideOffset={4} collisionPadding={8} onClick={stop} onKeyDown={stop}>
        {renderItems(DropdownMenu, actions)}
        <p className="menu-hint desktop-only">Clic derecho en la fila abre este menú</p>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);
