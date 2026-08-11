import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PwaStatus } from "@/components/pwa-status";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/server/auth";
import type { Role } from "@/lib/permissions";
export default async function DashboardLayout({children}:{children:React.ReactNode}){let session=null;try{session=await getSession()}catch{}if(!session)redirect("/login");const membership=session.memberships[0];if(!membership)redirect("/login");return <><PwaStatus/><LogoutButton/><AppShell role={membership.role as Role} userName={String(session.user.name)}>{children}</AppShell></>}
