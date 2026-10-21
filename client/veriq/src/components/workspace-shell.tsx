"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Database,
  FolderSearch,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  workspaceNavigation,
  type WorkspaceIconName,
  type WorkspaceNavigationItem,
} from "@/config/workspace-navigation";

const navigationIcons: Record<WorkspaceIconName, LucideIcon> = {
  overview: LayoutDashboard,
  knowledge: BookOpen,
  operations: Activity,
  customers: MessageSquare,
  investigations: FolderSearch,
  sources: Database,
  administration: Settings,
};

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: readonly WorkspaceNavigationItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <ul className="workspace-nav-list">
      {items.map((item) => {
        const Icon = navigationIcons[item.icon];
        const active = isActive(pathname, item.href);

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`workspace-nav-link${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const currentPage = workspaceNavigation.find((item) => isActive(pathname, item.href));

  function closeNavigation() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="workspace-root">
      <a className="workspace-skip-link" href="#main-content">Skip to content</a>

      <header className="workspace-topbar">
        <div className="workspace-topbar-title">
          <button
            ref={menuButton}
            type="button"
            className="workspace-menu-button"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-controls="workspace-sidebar"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
          <div className="workspace-breadcrumb" aria-label="Current location">
            <span>Intelligence Workspace</span>
            <span className="workspace-breadcrumb-separator" aria-hidden="true">/</span>
            <strong>{currentPage?.shortLabel ?? "Workspace"}</strong>
          </div>
        </div>
        <span className="workspace-preview-label">UI preview</span>
      </header>

      <button
        type="button"
        className={`workspace-backdrop${mobileMenuOpen ? " is-open" : ""}`}
        onClick={closeNavigation}
        aria-label="Close navigation menu"
        tabIndex={mobileMenuOpen ? 0 : -1}
      />

      <aside
        id="workspace-sidebar"
        className={`workspace-sidebar${mobileMenuOpen ? " is-open" : ""}`}
        aria-label="Workspace navigation"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            closeNavigation();
            menuButton.current?.focus();
          }
        }}
      >
        <Link href="/" className="workspace-brand" onClick={closeNavigation}>
          <span className="workspace-brand-symbol" aria-hidden="true">V</span>
          <span className="workspace-brand-name">veriq<span className="workspace-brand-dot">.</span></span>
        </Link>
        <div className="workspace-sidebar-scroll">
          <nav aria-label="Main navigation">
            <p className="workspace-nav-heading">INTELLIGENCE</p>
            <NavigationLinks
              items={workspaceNavigation.filter((item) => item.group === "intelligence")}
              pathname={pathname}
              onNavigate={closeNavigation}
            />
            <p className="workspace-nav-heading workspace-nav-heading-spaced">WORKSPACE</p>
            <NavigationLinks
              items={workspaceNavigation.filter((item) => item.group === "management")}
              pathname={pathname}
              onNavigate={closeNavigation}
            />
          </nav>
        </div>
        <div className="workspace-sidebar-footer">
          <span className="workspace-sidebar-footer-indicator" aria-hidden="true" />
          <span>Frontend development preview</span>
        </div>
      </aside>

      <main id="main-content" className="workspace-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}