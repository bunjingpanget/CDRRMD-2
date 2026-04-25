import { useEffect, useState, type ReactNode } from 'react';
import cdrrmdLogo from '../assets/cdrrmd-logo.png';
import { d } from '../adminDesign';

type ActiveView = 'dashboard' | 'admin' | 'users' | 'monitoring' | 'risk-priority' | 'evacuation' | 'post-updates';

type Props = {
  activeView: ActiveView;
  title: string;
  subtitle?: string;
  noMainScroll?: boolean;
  onLogout: () => void;
  onOpenDashboard: () => void;
  onOpenAdmin: () => void;
  onOpenUsers: () => void;
  onOpenMonitoring: () => void;
  onOpenRiskPriority: () => void;
  onOpenEvacuationAreas: () => void;
  onOpenPostUpdates: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

type NavItem = {
  key: ActiveView;
  label: string;
  onClick: () => void;
};

function itemClass(isActive: boolean) {
  return [
    d.shell.navItem,
    isActive ? d.shell.navItemActive : d.shell.navItemIdle,
  ].join(' ');
}

export default function AdminShell({
  activeView,
  title,
  subtitle,
  noMainScroll,
  onLogout,
  onOpenDashboard,
  onOpenAdmin,
  onOpenUsers,
  onOpenMonitoring,
  onOpenRiskPriority,
  onOpenEvacuationAreas,
  onOpenPostUpdates,
  actions,
  children,
}: Props) {
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(activeView === 'admin' || activeView === 'users');

  useEffect(() => {
    if (activeView === 'admin' || activeView === 'users') {
      setIsAccountsExpanded(true);
      return;
    }

    setIsAccountsExpanded(false);
  }, [activeView]);

  function onAccountsClick() {
    if (activeView !== 'admin' && activeView !== 'users') {
      onOpenAdmin();
      setIsAccountsExpanded(true);
      return;
    }

    setIsAccountsExpanded((prev) => !prev);
  }

  // Single source of truth for desktop and mobile navigation labels/actions.
  const navItems: NavItem[] = [
    { key: 'monitoring', label: 'Incident Monitoring', onClick: onOpenMonitoring },
    { key: 'risk-priority', label: 'Risk Priority', onClick: onOpenRiskPriority },
    { key: 'post-updates', label: 'Post Updates', onClick: onOpenPostUpdates },
    { key: 'evacuation', label: 'Evacuation Areas', onClick: onOpenEvacuationAreas },
  ];

  return (
    <div className={d.shell.root}>
      <div className={d.shell.layout}>
        {/* Mobile top bar */}
        <div className={d.shell.mobileTop}>
          <div className={d.shell.mobileTopInner}>
            <div className={d.shell.mobileLogoWrap}>
              <img src={cdrrmdLogo} alt="CDRRMD logo" className={d.shell.mobileLogo} />
              <p className={d.shell.mobileBrand}>CDRRMD</p>
            </div>
            <button onClick={onLogout} className={d.shell.mobileLogout}>Logout</button>
          </div>
        </div>

        <aside className={d.shell.aside}>
          <div className={d.shell.logoWrap}>
            <img src={cdrrmdLogo} alt="CDRRMD logo" className={d.shell.logo} />
            <div>
              <p className={d.shell.brand}>CDRRMD</p>
            </div>
          </div>

          <nav className={d.shell.nav}>
            <button onClick={onOpenDashboard} className={itemClass(activeView === 'dashboard')}>
              Dashboard
            </button>

            <div>
              <button onClick={onAccountsClick} className={itemClass(activeView === 'admin' || activeView === 'users')}>
                Accounts
              </button>
              {isAccountsExpanded ? (
                <div className={d.shell.accountsDropdownWrap}>
                  <button
                    onClick={onOpenAdmin}
                    className={[d.shell.accountsDropdownItem, activeView === 'admin' ? d.shell.accountsDropdownItemActive : d.shell.accountsDropdownItemIdle].join(' ')}
                  >
                    Admin
                  </button>
                  <button
                    onClick={onOpenUsers}
                    className={[d.shell.accountsDropdownItem, activeView === 'users' ? d.shell.accountsDropdownItemActive : d.shell.accountsDropdownItemIdle].join(' ')}
                  >
                    Users
                  </button>
                </div>
              ) : null}
            </div>

            {navItems.map((item) => (
              <button key={item.key} onClick={item.onClick} className={itemClass(activeView === item.key)}>
                {item.label}
              </button>
            ))}
          </nav>

          <button
            onClick={onLogout}
            className={d.shell.logout}
          >
            Logout
          </button>
        </aside>

        <main
          className={[
            d.shell.mainBase,
            noMainScroll ? d.shell.mainNoScroll : d.shell.mainScroll,
          ].join(' ')}
        >
          {/* Shared page header for all admin views */}
          <header className={d.shell.header}>
            <div className={d.shell.headerInner}>
              <div>
                <h1 className={d.shell.h1}>{title}</h1>
                {subtitle ? <p className={d.shell.subtitle}>{subtitle}</p> : null}
              </div>
              {actions ? <div className={d.shell.actions}>{actions}</div> : null}
            </div>
          </header>

          {children}
        </main>

        <nav className={d.shell.mobileNav}>
          <button
            onClick={onOpenDashboard}
            className={[
              d.shell.mobileNavItem,
              activeView === 'dashboard' ? d.shell.mobileNavActive : d.shell.mobileNavIdle,
            ].join(' ')}
          >
            Dashboard
          </button>
          <button
            onClick={onOpenAdmin}
            className={[
              d.shell.mobileNavItem,
              activeView === 'admin' || activeView === 'users' ? d.shell.mobileNavActive : d.shell.mobileNavIdle,
            ].join(' ')}
          >
            Accounts
          </button>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={item.onClick}
              className={[
                d.shell.mobileNavItem,
                activeView === item.key ? d.shell.mobileNavActive : d.shell.mobileNavIdle,
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
