import type { AccountInfo } from '@azure/msal-browser';
import { t } from '../../i18n';
import './Banner.css';

export type WorkspaceView = 'emails' | 'pdm';
export type Lang = 'de' | 'en' | 'hu';

export type BannerNavItem = {
  label: string;
  path: string;
};

interface Props {
  user?: AccountInfo;
  userId?: string;
  version: string;
  lang: Lang;
  onLang: (l: Lang) => void;
  workspaceView: WorkspaceView;
  onWorkspace: (w: WorkspaceView) => void;
  emailView: 'inbox' | 'brett';
  onEmailViewToggle: () => void;
  pdmNavItems: BannerNavItem[];
  activePdmPath: string;
  onPdmNav: (path: string) => void;
  onCompose: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  onDrawer: (side: 'left' | 'right') => void;
}

export function Banner({
  user, userId, version, lang, onLang,
  workspaceView, onWorkspace,
  emailView, onEmailViewToggle,
  pdmNavItems, activePdmPath, onPdmNav,
  onCompose, onRefresh, onLogout, onDrawer,
}: Props) {
  return (
    <header className="banner">
      <div className="banner-main">
        <button className="banner-drawer" onClick={() => onDrawer('left')}>📁</button>

        <div className="banner-brand">
          <img className="banner-logo" src="/pdm/herpert-logo-final-white-erp.png" alt="HERPERT" />
          <div className="banner-name">
            <span className="banner-title">HERPERT / BLITZ</span>
            <span className="banner-sub">{t(lang, 'appSub')}</span>
          </div>
        </div>

        <div className="banner-actions">
          {user && <span className="banner-user" title={`id: ${userId}`}>{user.name}</span>}

          {workspaceView === 'emails' && (
            <button
              className={`banner-btn ${emailView === 'brett' ? 'banner-btn--active' : ''}`}
              onClick={onEmailViewToggle}
            >
              {t(lang, 'brett')}
            </button>
          )}

          {workspaceView === 'emails' && (
            <button className="banner-btn banner-btn--compose" onClick={onCompose}>
              {t(lang, 'compose')}
            </button>
          )}

          <button className="banner-btn" onClick={onRefresh} title={t(lang, 'refresh')}>↻</button>

          <select
            className="banner-lang"
            value={lang}
            onChange={e => onLang(e.target.value as Lang)}
            aria-label="Sprache"
          >
            <option value="de">DE</option>
            <option value="en">EN</option>
            <option value="hu">HU</option>
          </select>

          <button className="banner-drawer" onClick={() => onDrawer('right')}>📋</button>
          <span className="banner-version" title="Build-Version">v{version}</span>
          <button className="banner-btn banner-btn--logout" onClick={onLogout}>{t(lang, 'logout')}</button>
        </div>
      </div>

      <div className="banner-tabs" role="tablist">
        <button
          className={`banner-tab ${workspaceView === 'emails' ? 'banner-tab--active' : ''}`}
          onClick={() => onWorkspace('emails')}
        >
          {t(lang, 'wsEmails')}
        </button>
        <button
          className={`banner-tab ${workspaceView === 'pdm' ? 'banner-tab--active' : ''}`}
          onClick={() => onWorkspace('pdm')}
        >
          {t(lang, 'wsPdm')}
        </button>
      </div>

      {workspaceView === 'pdm' && (
        <div className="banner-subnav">
          {pdmNavItems.map(item => (
            <button
              key={item.path}
              className={`banner-subnav-item ${activePdmPath.split('?')[0] === item.path ? 'banner-subnav-item--active' : ''}`}
              onClick={() => onPdmNav(item.path)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
