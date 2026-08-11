import "server-only";
import { connectDB } from "./db";
import { Document, Entity, LineItem, Obligation, RuleSet, Snapshot, TaxObservation } from "./models";
import freshnessConfig from "@/data/freshness-rules.json";

type Row=Record<string,unknown>;
const categoryNames=["","Bank and cash","Listed investments","Unlisted and private holdings","Real estate","Retirement and small savings","Physical and other","Loans and advances given","Foreign assets","Home and property loans","Loans against securities and personal loans","Business and director liabilities","Taxes and dues payable"];
const thresholdKeys=["","bank_cash","listed_investments","private_holdings","real_estate","retirement","physical_other","loans_given","foreign_assets","property_loans","las_personal","business_liabilities","taxes_dues"] as const;
const serial=(row:Row):Row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,key==="_id"||key.endsWith("Id")?String(value):value instanceof Date?value.toISOString():value]));

export async function familyAccounting(familyOfficeId:unknown,familyId:string){
 await connectDB();const scope={familyOfficeId,familyId};
 const[entitiesRaw,itemsRaw,documentsRaw,obligationsRaw,snapshotsRaw,taxRaw,freshnessSet]=await Promise.all([
  Entity.find(scope).lean(),LineItem.find(scope).sort({asAtDate:-1}).lean(),Document.find(scope).select("filename mimeType status source aiSummary documentType createdAt").lean(),Obligation.find(scope).sort({dueDate:1}).lean(),Snapshot.find(scope).sort({asAtDate:1}).lean(),TaxObservation.find(scope).sort({createdAt:-1}).lean(),RuleSet.findOne({familyOfficeId,kind:"freshness"}).sort({effectiveDate:-1}).lean(),
 ]);
 const entities=(entitiesRaw as unknown as Row[]).map(serial),documents=(documentsRaw as unknown as Row[]).map(serial);
 const documentMap=new Map(documents.map(row=>[String(row._id),row])),entityMap=new Map(entities.map(row=>[String(row._id),row])),today=Date.now(),freshRules=((freshnessSet as unknown as Row|null)?.rules||freshnessConfig.rules) as Record<string,number>;
 const lines:Row[]=(itemsRaw as unknown as Row[]).map(raw=>{const row=serial(raw),category=Number(row.category),asAt=new Date(String(row.asAtDate)),threshold=Number(freshRules[thresholdKeys[category]]||90),ageDays=Math.max(0,Math.floor((today-asAt.getTime())/86400000)),freshnessState=ageDays>threshold*1.5?"stale":ageDays>threshold?"ageing":"fresh",held=Boolean(row.held)&&!Boolean(row.confirmed);return{...row,categoryName:categoryNames[category],entity:String(entityMap.get(String(row.entityId))?.name||"Unknown entity"),source:documentMap.get(String(row.sourceDocumentId)),ageDays,thresholdDays:threshold,freshnessState,held}});
 const accepted=lines.filter(row=>!row.held&&!Boolean(entityMap.get(String(row.entityId))?.excludeFromConsolidation));
 const assets=accepted.filter(row=>Number(row.category)<=8).reduce((sum,row)=>sum+Number(row.amount),0),liabilities=accepted.filter(row=>Number(row.category)>=9).reduce((sum,row)=>sum+Math.abs(Number(row.amount)),0);
 return{familyId,entities,documents,lines,accepted,review:lines.filter(row=>row.held),stale:lines.filter(row=>row.freshnessState!=="fresh"),obligations:(obligationsRaw as unknown as Row[]).map(raw=>{const row=serial(raw);return{...row,source:documentMap.get(String(row.sourceDocumentId)),entity:String(entityMap.get(String(row.entityId))?.name||"Unknown entity")}}),snapshots:(snapshotsRaw as unknown as Row[]).map(serial),taxObservations:(taxRaw as unknown as Row[]).map(serial),totals:{assets,liabilities,netWorth:assets-liabilities,held:lines.filter(row=>row.held).reduce((sum,row)=>sum+Math.abs(Number(row.amount)),0)}};
}
export {categoryNames};
