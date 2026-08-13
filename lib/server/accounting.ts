import "server-only";
import { connectDB } from "./db";
import { BankTransaction, Document, Entity, LineItem, Obligation, RuleSet, Snapshot, TaxObservation } from "./models";
import freshnessConfig from "@/data/freshness-rules.json";
import { accountHeadName, isAssetCategory, isContingentCategory, isLiabilityCategory, isOpeningBalancePosition } from "@/lib/financial-document";

type Row=Record<string,unknown>;
const serial=(row:Row):Row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,key==="_id"||key.endsWith("Id")?String(value):value instanceof Date?value.toISOString():value]));

export async function familyAccounting(familyOfficeId:unknown,familyId:string){
 await connectDB();const scope={familyOfficeId,familyId};
 const[entitiesRaw,itemsRaw,documentsRaw,transactionsRaw,obligationsRaw,snapshotsRaw,taxRaw,freshnessSet]=await Promise.all([
  Entity.find(scope).lean(),LineItem.find(scope).sort({asAtDate:-1}).lean(),Document.find(scope).select("filename mimeType status source aiSummary documentType createdAt").lean(),BankTransaction.find(scope).sort({transactionDate:-1,createdAt:-1}).limit(2000).lean(),Obligation.find(scope).sort({dueDate:1}).lean(),Snapshot.find(scope).sort({asAtDate:1}).lean(),TaxObservation.find(scope).sort({createdAt:-1}).lean(),RuleSet.findOne({familyOfficeId,kind:"freshness"}).sort({effectiveDate:-1}).lean(),
 ]);
 const entities=(entitiesRaw as unknown as Row[]).map(serial),documents=(documentsRaw as unknown as Row[]).map(serial);
 const documentMap=new Map(documents.map(row=>[String(row._id),row])),entityMap=new Map(entities.map(row=>[String(row._id),row])),today=Date.now(),freshRules=((freshnessSet as unknown as Row|null)?.rules||freshnessConfig.rules) as Record<string,number>;
 const lines:Row[]=(itemsRaw as unknown as Row[]).map(raw=>{const row=serial(raw),category=Number(row.category),asAt=new Date(String(row.asAtDate)),threshold=Number(freshRules[`category_${category}`]||90),ageDays=Math.max(0,Math.floor((today-asAt.getTime())/86400000)),freshnessState=ageDays>threshold*1.5?"stale":ageDays>threshold?"ageing":"fresh",held=Boolean(row.held)&&!Boolean(row.confirmed);return{...row,categoryName:accountHeadName(category),categorySection:isAssetCategory(category)?"ASSETS":isLiabilityCategory(category)?"LIABILITIES":isContingentCategory(category)?"CONTINGENT":"REVIEW",entity:String(entityMap.get(String(row.entityId))?.name||"Unknown entity"),source:documentMap.get(String(row.sourceDocumentId)),ageDays,thresholdDays:threshold,freshnessState,held}});
 // Legacy uploads did not store positionRole. Exclude their clearly-labelled
 // opening bank balances so opening and closing positions are never summed.
 const positionLines=lines.filter(row=>!isOpeningBalancePosition(row));
 const accepted=positionLines.filter(row=>!row.held&&!Boolean(entityMap.get(String(row.entityId))?.excludeFromConsolidation));
 const assets=accepted.filter(row=>isAssetCategory(row.category)).reduce((sum,row)=>sum+Number(row.amount),0),liabilities=accepted.filter(row=>isLiabilityCategory(row.category)).reduce((sum,row)=>sum+Math.abs(Number(row.amount)),0),contingent=accepted.filter(row=>isContingentCategory(row.category)).reduce((sum,row)=>sum+Math.abs(Number(row.amount)),0);
 const transactions=(transactionsRaw as unknown as Row[]).map(raw=>{const row=serial(raw);return{...row,source:documentMap.get(String(row.sourceDocumentId)),entity:String(entityMap.get(String(row.entityId))?.name||"Unknown entity")}});
 return{familyId,entities,documents,transactions,lines:positionLines,accepted,review:positionLines.filter(row=>row.held),stale:positionLines.filter(row=>row.freshnessState!=="fresh"),obligations:(obligationsRaw as unknown as Row[]).map(raw=>{const row=serial(raw);return{...row,source:documentMap.get(String(row.sourceDocumentId)),entity:String(entityMap.get(String(row.entityId))?.name||"Unknown entity")}}),snapshots:(snapshotsRaw as unknown as Row[]).map(serial),taxObservations:(taxRaw as unknown as Row[]).map(serial),totals:{assets,liabilities,netWorth:assets-liabilities,contingent,held:positionLines.filter(row=>row.held).reduce((sum,row)=>sum+Math.abs(Number(row.amount)),0)}};
}
