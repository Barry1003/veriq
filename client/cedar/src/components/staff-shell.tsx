"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SessionButton } from "./session-button";
const navigation = [
    { href: "/staff", label: "Overview" },
    { href: "/staff/payment-routes", label: "Payment routes" },
    { href: "/staff/transactions", label: "Transactions" },
    { href: "/staff/support-channels", label: "Support channels" },
    { href: "/staff/institutional-sources", label: "Institutional sources" },
    { href: "/staff/authorizations", label: "Authorizations" },
];
const titles: Record<string, string> = {
    "payment-routes": "Payment route monitoring",
    transactions: "Transaction records",
    "support-channels": "Customer interactions",
    "institutional-sources": "Institutional source registry",
    authorizations: "Integration authorization",
};
export function StaffShell({ children }: {
    children: ReactNode;
}) {
    const pathname = usePathname();
    const [expanded, setExpanded] = useState(false);
    const title = pathname === "/staff" ? "Operations overview" : pathname.startsWith("/staff/cases/") ? "Support case detail" : titles[pathname.split("/")[2]] ?? "Bank operations";
    return <div className="cedar-app">
    <a className="cedar-skip" href="#cedar-content">Skip to content</a>
    <button type="button" className="cedar-mobile-nav" onClick={() => setExpanded(!expanded)} aria-label="Toggle navigation" aria-expanded={expanded} aria-controls="cedar-sidebar">{expanded ? <X size={20}/> : <Menu size={20}/>}</button>
    <aside id="cedar-sidebar" className={`cedar-sidebar${expanded ? " is-open" : ""}`}>
      <Link href="/staff" className="cedar-brand" onClick={() => setExpanded(false)}><Image src="/icons/cedar-mark.svg" width={27} height={30} alt="" priority/><span>Cedar</span></Link>
      <span className="cedar-sidebar-tag">STAFF OPERATIONS</span>
      <nav className="cedar-nav" aria-label="Staff operations">
        {navigation.map(item => {
            const active = pathname === item.href || (item.href === "/staff/support-channels" && pathname.startsWith("/staff/cases/"));
            return <Link key={item.href} href={item.href} onClick={() => setExpanded(false)} className={`cedar-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>{item.label}</Link>;
        })}
      </nav>
      <div className="cedar-sidebar-bottom"><span>CEDAR BANK · SYNTHETIC ENVIRONMENT</span><SessionButton/><Link href="/operator">Restricted console ↗</Link><Link href="/banking">Customer banking ↗</Link></div>
    </aside>
    {expanded && <button className="cedar-overlay" onClick={() => setExpanded(false)} aria-label="Close navigation"/>}
    <div className="cedar-workspace"><header className="cedar-topbar"><div><span>CEDAR BANK · STAFF WORKSPACE</span><h1>{title}</h1></div><span className="cedar-topbar-environment">SYNTHETIC DEMO</span></header><main id="cedar-content" className="cedar-content">{children}</main></div>
  </div>;
}

