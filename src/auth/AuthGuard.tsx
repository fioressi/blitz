import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from './msalConfig';
import './AuthGuard.css';

interface Props {
  children: React.ReactNode;
}

export function AuthGuard({ children }: Props) {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-logo">⚡ BLITZ</div>
          <p className="auth-subtitle">EMAIL FÜR HERPERT</p>
          <button
            className="auth-login-btn"
            onClick={() => instance.loginRedirect(loginRequest)}
          >
            Mit Microsoft anmelden
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
