"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ClipboardList,
  Database,
  Menu,
  Settings2,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { adminNavigation, type AdminIcon } from "@/config/admin-navigation";
import "./admin-shell.css";
import "@/app/administration/system-health/system-health.css";

const icons: Record<AdminIcon, LucideIcon> = {
  health: Activity,
  ai: Settings2,
  connectors: Database,
  access: ShieldCheck,
  audit: ClipboardList,
};

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const firstNavLink = useRef<HTMLAnchorElement>(null);
  const current =
    adminNavigation.find((item) => pathname === item.href)?.label ??
    "Administration";

  useEffect(() => {
    if (menuOpen) firstNavLink.current?.focus();
  }, [menuOpen]);

  function dismissMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="admin-layout">
      <a className="admin-skip" href="#admin-main">
        Skip to main content
      </a>
      {menuOpen && (
        <button
          type="button"
          className="admin-backdrop"
          aria-label="Close administration navigation"
          onClick={() => {
            dismissMenu();
            menuTrigger.current?.focus();
          }}
        />
      )}
      <aside
        id="admin-sidebar"
        aria-label="Administration navigation"
        className={`admin-sidebar${menuOpen ? " admin-sidebar-open" : ""}`}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            dismissMenu();
            menuTrigger.current?.focus();
          }
        }}
      >
        <Link
          href="/administration/system-health"
          className="admin-brand"
          onClick={dismissMenu}
          aria-label="Veriq administration home"
        >
          <Image
            src="/images/veriq-admin-brand.png"
            alt="Veriq"
            width={194}
            height={94}
            priority
          />
        </Link>
        <p className="admin-sidebar-label">ADMINISTRATION / RESTRICTED</p>
        <nav className="admin-nav" aria-label="Administrative sections">
          {adminNavigation.map((item, index) => {
            const Icon = icons[item.icon];
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={index === 0 ? firstNavLink : undefined}
                className={`admin-nav-link${active ? " is-current" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={dismissMenu}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-footer">
          <strong>Administrator view · preview</strong>
          <span>Cedar Bank · Demo environment</span>
        </div>
      </aside>
      <div className="admin-column">
        <header className="admin-header">
          <div className="admin-header-location">
            <button
              type="button"
              ref={menuTrigger}
              className="admin-menu-trigger"
              aria-controls="admin-sidebar"
              aria-expanded={menuOpen}
              aria-label={
                menuOpen ? "Close navigation" : "Open administration navigation"
              }
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? (
                <X size={21} aria-hidden="true" />
              ) : (
                <Menu size={21} aria-hidden="true" />
              )}
            </button>
            <span className="admin-institution">Cedar Bank</span>
            <span className="admin-header-divider">/</span>
            <span className="admin-header-context">
              Administration / {current}
            </span>
          </div>
          <div className="admin-header-end">
            <span className="admin-synthetic">SYNTHETIC DEMO</span>
            <Link
              className="admin-header-button"
              href="/administration/local-ai"
            >
              Local AI runtime
            </Link>
          </div>
        </header>
        <main id="admin-main" className="admin-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
