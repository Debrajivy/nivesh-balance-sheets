import { describe, expect, it } from "vitest";
import { accepted, consolidate, freshness, inrFromForeign, isHeld, statement, type Entity, type LineItem } from "../lib/domain";
import { hasCapability } from "../lib/permissions";
const base:LineItem={id:"1",entityId:"person",category:1,name:"Bank",amount:4_000_000,basis:"declared",confidence:90,asAt:"2026-08-01",source:{documentId:"doc",location:"p.1"},confirmed:false};
describe("accounting invariants",()=>{
 it("holds values above INR 25 lakh",()=>expect(isHeld(base)).toBe(true));
 it("holds confidence below 85 percent",()=>expect(isHeld({...base,amount:100,confidence:84})).toBe(true));
 it("accepts a confirmed material value",()=>expect(accepted([{...base,confirmed:true}])).toHaveLength(1));
 it("calculates assets less liabilities",()=>expect(statement([{...base,amount:100,confirmed:true},{...base,id:"2",category:20,amount:30,confirmed:true}]).netWorth).toBe(70));
 it("excludes company entities from consolidation",()=>{const entities:Entity[]=[{id:"person",familyId:"f",name:"Person",type:"individual",excludeFromConsolidation:false},{id:"company",familyId:"f",name:"Company",type:"company",excludeFromConsolidation:true}];expect(consolidate([{...base,amount:100,confirmed:true},{...base,id:"2",entityId:"company",amount:500,confirmed:true}],entities)).toHaveLength(1)});
 it("calculates ageing and stale states",()=>{expect(freshness("2026-01-01",30,new Date("2026-02-05")).state).toBe("ageing");expect(freshness("2026-01-01",30,new Date("2026-03-01")).state).toBe("stale")});
 it("converts foreign values using a supplied RBI rate",()=>expect(inrFromForeign(100,83.25)).toBe(8325));
});
describe("permission matrix",()=>{
 it("prevents an admin from reading financial statements",()=>expect(hasCapability("admin","view_sheet")).toBe(false));
 it("prevents a principal from uploading",()=>expect(hasCapability("principal","upload")).toBe(false));
 it("allows a principal to confirm and declare manual items",()=>{expect(hasCapability("principal","confirm")).toBe(true);expect(hasCapability("principal","manual_item")).toBe(true)});
 it("allows only firm admins to read access logs",()=>{expect(hasCapability("admin","access_log")).toBe(true);expect(hasCapability("operator","access_log")).toBe(false)});
});
