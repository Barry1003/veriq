export const workspaceNavigation = [
  {
    slug: "overview",
    href: "/",
    shortLabel: "Overview",
    title: "Intelligence Overview",
    description: "A unified view of intelligence signals and investigations.",
    icon: "overview",
  },
  {
    slug: "knowledge",
    href: "/knowledge",
    shortLabel: "Institutional Knowledge",
    title: "Knowledge Explorer",
    description:
      "Source-backed institutional services, records, relationships and temporal validity.",
    icon: "knowledge",
  },
  {
    slug: "customer-experience",
    href: "/customer-experience",
    shortLabel: "Customer Intelligence",
    title: "Customer Intelligence",
    description:
      "Customer-reported interactions and source-linked emerging issues.",
    icon: "customers",
  },
  {
    slug: "operations",
    href: "/operations",
    shortLabel: "Operational Intelligence",
    title: "Operational Intelligence",
    description: "Operational observations, anomalies and source freshness.",
    icon: "operations",
  },
  {
    slug: "investigations",
    href: "/investigations",
    shortLabel: "Investigations",
    title: "Investigations",
    description:
      "Evidence-based investigation cases with explicit verification boundaries.",
    icon: "investigations",
  },
] as const;
export const secondaryRoutes = [
  {
    slug: "data-sources",
    href: "/data-sources",
    title: "Knowledge Sources",
    description: "Knowledge source intake and provenance review.",
  },
  {
    slug: "administration",
    href: "/administration",
    title: "Administration",
    description: "Institutional administration and system configuration.",
  },
] as const;
export type WorkspaceNavigationItem = (typeof workspaceNavigation)[number];
export type WorkspaceIconName = WorkspaceNavigationItem["icon"];
