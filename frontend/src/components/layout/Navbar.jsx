import { Search, Plus } from 'lucide-react';
import { useShell } from './ShellContext';
import { AlertsBell } from './AlertsBell';

// Barra superior de PC: búsqueda (Ctrl K), avisos y "Registrar movimiento".
// En teléfono no se muestra: cada vista trae su propio encabezado.
export const Navbar = ({ registrarOpen }) => {
  const { openSearch, openRegistrar } = useShell();

  return (
    <header className="navbar">
      <button className="topbar-search" onClick={openSearch} aria-label="Buscar (Ctrl+K)">
        <Search size={16} />
        <span className="topbar-search-text">Buscar tarjetas, compras, créditos…</span>
        <kbd className="kbd">Ctrl K</kbd>
      </button>
      <div className="navbar-right">
        <AlertsBell />
        <button className="btn btn-primary" onClick={openRegistrar} aria-expanded={registrarOpen} aria-haspopup="dialog">
          <Plus size={18} /> Registrar movimiento
        </button>
      </div>
    </header>
  );
};
