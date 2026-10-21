export const adminNavigation = [
  {
    href: "/administration/system-health",
    label: "System Health",
    icon: "health",
  },
  { href: "/administration/local-ai", label: "Local AI Runtime", icon: "ai" },
  {
    href: "/administration/connectors",
    label: "Connectors",
    icon: "connectors",
  },
  {
    href: "/administration/access",
    label: "Access & Policies",
    icon: "access",
  },
  { href: "/administration/audit", label: "Audit & Activity", icon: "audit" },
] as const;

export type AdminIcon = (typeof adminNavigation)[number]["icon"];
