export type NavItem = { href: string; label: string; icon: string; badge?: string };

export const navigation: { group: string; items: NavItem[] }[] = [
  {
    group: "Family wealth",
    items: [
      { href: "/overview", label: "Overview", icon: "OV" },
      { href: "/balance-sheet", label: "Balance sheet", icon: "BS" },
      { href: "/entities", label: "Entities", icon: "ID" },
      { href: "/ledger", label: "Ledger & expenses", icon: "LX" },
      { href: "/documents", label: "Documents", icon: "DC" },
      { href: "/inbox", label: "Email inbox", icon: "EM", badge: "3" }
    ]
  },
  {
    group: "Build & verify",
    items: [
      { href: "/processing", label: "AI processing", icon: "AI" },
      { href: "/review", label: "Review queue", icon: "RV", badge: "6" },
      { href: "/refresh", label: "Refresh worklist", icon: "RF", badge: "4" },
      { href: "/tax", label: "Tax observations", icon: "TX" }
    ]
  },
  {
    group: "Look ahead",
    items: [
      { href: "/obligations", label: "Alerts & obligations", icon: "AL", badge: "3" },
      { href: "/forecast", label: "90-day forecast", icon: "FC" },
      { href: "/snapshots", label: "Snapshots", icon: "SN" },
      { href: "/delivery", label: "Alert delivery", icon: "DL" }
    ]
  },
  {
    group: "Firm administration",
    items: [
      { href: "/families", label: "Client families", icon: "FM" },
      { href: "/users", label: "Users & roles", icon: "UR" },
      { href: "/permissions", label: "Permission matrix", icon: "PM" },
      { href: "/access-log", label: "Access log", icon: "LG" },
      { href: "/billing", label: "Billing", icon: "INR" },
      { href: "/security", label: "Security", icon: "SC" }
    ]
  }
];
