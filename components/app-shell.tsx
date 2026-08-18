"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigation, type NavBadge } from "@/lib/navigation";
import type { Role } from "@/lib/permissions";

const allowed:Record<Role,string[]>={operator:["/overview","/balance-sheet","/entities","/ledger","/documents","/inbox","/processing","/review","/refresh","/tax","/obligations","/forecast","/snapshots","/delivery"],principal:["/overview","/balance-sheet","/entities","/ledger","/review","/tax","/obligations","/forecast","/snapshots","/delivery"],ca:["/overview","/balance-sheet","/entities","/ledger","/tax","/forecast","/snapshots"],admin:["/families","/users","/permissions","/access-log","/billing","/security"]};
const labels:Record<Role,string>={operator:"Operator",principal:"Principal",ca:"CA / advisor",admin:"Firm admin"};

export function AppShell({children,role,userName,familyName="Assigned family"}:{children:React.ReactNode;role:Role;userName:string;familyName?:string}){
 const path=usePathname(),[open,setOpen]=useState(false),[badges,setBadges]=useState<Partial<Record<NavBadge,number>>>({}),initials=userName.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
 useEffect(()=>{if(role==="admin")return;const controller=new AbortController();void fetch("/api/accounting",{cache:"no-store",signal:controller.signal}).then(async response=>{if(!response.ok)return;const data=await response.json() as {review?:unknown[];stale?:unknown[];documents?:Record<string,unknown>[];obligations?:Record<string,unknown>[]};const now=Date.now(),in30Days=now+30*86400000;setBadges({review:data.review?.length||0,refresh:data.stale?.length||0,inbox:data.documents?.filter(row=>row.source==="email"&&(row.status==="queued"||row.status==="processing"||row.status==="needs_confirmation")).length||0,obligations:data.obligations?.filter(row=>!row.acknowledged&&new Date(String(row.dueDate)).getTime()<=in30Days).length||0})}).catch(()=>{});return()=>controller.abort()},[role]);
 const mobile=[{href:"/overview",icon:"◈",label:"Home"},{href:"/balance-sheet",icon:"▦",label:"Sheet"},{href:"/documents",icon:"+",label:"Add",fab:true},{href:"/obligations",icon:"◷",label:"Alerts"},{href:"/tax",icon:"✦",label:"Insights"}];
 return <div className="shell">
  <aside className={open?"side open":"side"}>
   <div className="logo"><i>₹</i><div><b>Nivesh</b><span>Family wealth, clearly.</span></div><button onClick={()=>setOpen(false)}>×</button></div>
   <div className="tenant"><small>PERSONAL WORKSPACE</small><button><i>{initials}</i><span>{familyName}<em>FY 2026–27 · private & secure</em></span><b>⌄</b></button></div>
   <nav>{navigation.map(group=>{const items=group.items.filter(x=>allowed[role].includes(x.href));return items.length?<div className="nav-group" key={group.group}><small>{group.group}</small>{items.map(item=>{const count=item.badge?badges[item.badge]:undefined;return <Link onClick={()=>setOpen(false)} className={path===item.href?"active":""} href={item.href} key={item.href}><i>{item.icon}</i><span>{item.label}</span>{count!==undefined&&<b>{count}</b>}</Link>})}</div>:null})}</nav>
   <div className="identity"><i>{initials}</i><span><b>{userName}</b><small>{labels[role]}</small></span></div>
  </aside>
  {open&&<button className="scrim" onClick={()=>setOpen(false)} aria-label="Close menu"/>}
  <main className="workspace"><header><button className="hamb" onClick={()=>setOpen(true)}>☰</button><div><small>PERSONAL BALANCE SHEET</small><b>{familyName}</b><span>FY 2026–27</span></div><div className="head-right"><span>{labels[role]}</span><button aria-label="Search">⌕</button><Link className="header-review" href="/review" aria-label="Review queue">✓<i/></Link><i className="top-avatar">{initials}</i></div></header><div className="page">{children}</div></main>
  <nav className="mobile-tabs" aria-label="Primary navigation">{mobile.map(item=><Link key={item.href} href={item.href} className={`${path===item.href?"active":""} ${item.fab?"mobile-fab":""}`}><i>{item.icon}</i><span>{item.label}</span></Link>)}</nav>
 </div>
}
