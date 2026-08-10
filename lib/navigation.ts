export type NavItem = { href: string; label: string; icon: string; badge?: string };
export const navigation: { group: string; items: NavItem[] }[] = [
  { group: "Family wealth", items: [
    { href: "/overview", label: "Overview", icon: "⌂" }, { href: "/balance-sheet", label: "Balance sheet", icon: "▤" },
    { href: "/documents", label: "Documents", icon: "▱" }, { href: "/inbox", label: "Email inbox", icon: "✉", badge: "3" },
  ]},
  { group: "Build & verify", items: [
    { href: "/processing", label: "AI processing", icon: "✦" }, { href: "/review", label: "Review queue", icon: "✓", badge: "6" },
    { href: "/refresh", label: "Refresh worklist", icon: "↻", badge: "4" }, { href: "/tax", label: "Tax observations", icon: "◇" },
  ]},
  { group: "Look ahead", items: [
    { href: "/obligations", label: "Alerts & obligations", icon: "◷", badge: "3" }, { href: "/forecast", label: "90-day forecast", icon: "⌁" },
    { href: "/snapshots", label: "Snapshots", icon: "◉" }, { href: "/delivery", label: "Alert delivery", icon: "♢" },
  ]},
  { group: "Firm administration", items: [
    { href: "/families", label: "Client families", icon: "♧" }, { href: "/users", label: "Users & roles", icon: "♙" },
    { href: "/permissions", label: "Permission matrix", icon: "⊞" }, { href: "/access-log", label: "Access log", icon: "⌕" },
    { href: "/billing", label: "Billing", icon: "₹" }, { href: "/security", label: "Security", icon: "⬡" },
  ]},
];
