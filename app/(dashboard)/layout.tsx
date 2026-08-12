import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PwaStatus } from "@/components/pwa-status";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/server/auth";
import { Family } from "@/lib/server/models";
import type { Role } from "@/lib/permissions";
export default async function DashboardLayout({children}:{children:React.ReactNode}){let session=null;try{session=await getSession()}catch{}if(!session)redirect("/login");const membership=session.memberships[0];if(!membership)redirect("/login");const familyId=membership.familyIds[0],family=familyId?await Family.findOne({_id:familyId,familyOfficeId:membership.familyOfficeId}).select("name").lean() as Record<string,unknown>|null:null;return <><PwaStatus/><LogoutButton/><AppShell role={membership.role as Role} userName={String(session.user.name)} familyName={String(family?.name||"Assigned family")}>{children}</AppShell></>}
