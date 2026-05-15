import React from 'react';
import { AuthService } from '../../services/authService';

export const Navbar = () => {
  const user = AuthService.getCurrentUser();
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="navbar">
      <div className="navbar-title">
        {/* Can be breadcrumbs or page title */}
      </div>
      <div className="navbar-user">
        <div className="text-right">
          <div className="font-semibold text-sm">{user?.name || 'Usuario'}</div>
          <div className="text-xs text-muted">{user?.email || ''}</div>
        </div>
        <div className="user-avatar">
          {userInitial}
        </div>
      </div>
    </header>
  );
};
