"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Activity,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Network,
  Search,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  workspaceNavigation,
  type WorkspaceIconName,
} from "@/config/workspace-navigation";

const navigationIcons: Record<WorkspaceIconName, LucideIcon> = {
  overview: LayoutDashboard,
  knowledge: Network,
  customers: MessagesSquare,
  operations: Activity,
  investigations: Search,
};

function isActive(path: string, href: string) {
  return href === "/"
    ? path === "/"
    : path === href || path.startsWith(`${href}/`);
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const knowledge =
    pathname === "/knowledge" || pathname.startsWith("/knowledge/");
  const dependencyPage = pathname === "/knowledge/dependencies";
  const sourcesPage = pathname === "/data-sources";
  const processingPage = pathname === "/knowledge/processing";
  const customerPage = pathname === "/customer-experience";
  const actionHref = customerPage
    ? "/customer-experience#emerging-issue"
    : sourcesPage
      ? "/knowledge/processing"
      : processingPage
        ? "/knowledge"
        : knowledge
          ? "/data-sources"
          : "/investigations";
  const actionLabel = customerPage
    ? "View emerging issues"
    : sourcesPage
      ? "View processing"
      : processingPage
        ? "Explore knowledge"
        : knowledge
          ? "View sources"
          : "Investigations";
  const breadcrumb = dependencyPage
    ? "Institutional Knowledge / Dependency graph"
    : customerPage
      ? "Customer Intelligence / Interactions"
      : sourcesPage
        ? "Institutional Knowledge / Sources"
        : processingPage
          ? "Institutional Knowledge / Processing"
          : knowledge
            ? "Institutional Knowledge / Explorer"
            : "Veriq Intelligence";

  return (
    <div className="vw-layout">
      <a href="#main-content" className="vw-skip">
        Skip to content
      </a>
      <aside
        id="veriq-sidebar"
        className={`vw-sidebar${mobileMenuOpen ? " vw-sidebar-open" : ""}`}
        aria-label="Intelligence workspace navigation"
      >
        <Link
          href="/"
          className="vw-brand"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Veriq home"
        >
          <Image
            className="vw-brand-image"
            src="/images/veriq-brand-cropped.png"
            alt="Veriq"
            width={194}
            height={68}
            priority
          />
        </Link>
        <p className="vw-sidebar-heading">INTELLIGENCE WORKSPACE</p>
        <nav className="vw-nav" aria-label="Primary">
          {workspaceNavigation.map((item) => {
            const Icon = navigationIcons[item.icon];
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`vw-nav-item${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                <span>{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {mobileMenuOpen && (
        <button
          type="button"
          className="vw-backdrop"
          aria-label="Close navigation"
          onClick={() => {
            setMobileMenuOpen(false);
            menuButton.current?.focus();
          }}
        />
      )}
      <div className="vw-right">
        <header className="vw-header">
          <div className="vw-header-breadcrumb">
            <button
              ref={menuButton}
              type="button"
              className="vw-mobile-trigger"
              aria-label="Toggle navigation"
              aria-controls="veriq-sidebar"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="vw-bank">Cedar Bank</span>
            <span className="vw-slash">/</span>
            <span className="vw-current">{breadcrumb}</span>
          </div>
          <div className="vw-header-actions">
            <span className="vw-synthetic">SYNTHETIC DEMO</span>
            <Link className="vw-header-action" href={actionHref}>
              {actionLabel}
            </Link>
          </div>
        </header>
        <main id="main-content" className="vw-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
