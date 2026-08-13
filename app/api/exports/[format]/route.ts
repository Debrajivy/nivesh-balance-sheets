import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { requireRecentReauth } from "@/lib/server/auth";
import { familyAccounting } from "@/lib/server/accounting";
import { AccessLog } from "@/lib/server/models";
import { isAssetCategory, isContingentCategory, isLiabilityCategory } from "@/lib/financial-document";

type Row=Record<string,unknown>;
const money=(value:number)=>`INR ${Math.round(value).toLocaleString("en-IN")}`;
export async function GET(req:Request,ctx:RouteContext<"/api/exports/[format]">){
 try{
  const{format}=await ctx.params;
  if(!["xlsx","pdf"].includes(format))return NextResponse.json({error:"Unsupported export"},{status:404});
  const requested=new URL(req.url).searchParams.get("familyId")||undefined;
  const auth=await requireRecentReauth("export",requested);
  const data=await familyAccounting(auth.membership.familyOfficeId,auth.familyId);
  let bytes:Uint8Array,contentType:string,filename:string;
  if(format==="xlsx"){
   const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet("Balance sheet");
   sheet.addRow(["Nivesh — True and fair statement"]);
   sheet.addRow(["Type","Item","Category","Entity","Basis","Cost","Value","As at","Freshness","Source","Location"]);
   for(const line of data.accepted){const row=line as Row,source=row.source as Row|undefined;sheet.addRow([isAssetCategory(row.category)?"Asset":isLiabilityCategory(row.category)?"Liability":isContingentCategory(row.category)?"Contingent liability":"Review",row.name,row.categoryName,row.entity,row.basis,row.costAmount||"",row.amount,row.asAtDate,row.freshnessState,source?.filename||"",row.sourceLocation])}
   sheet.addRow([]);sheet.addRow(["Total assets",data.totals.assets]);sheet.addRow(["Total liabilities",data.totals.liabilities]);sheet.addRow(["Net worth",data.totals.netWorth]);sheet.addRow(["Contingent liabilities",data.totals.contingent||0]);sheet.columns.forEach(column=>{column.width=18});
   bytes=new Uint8Array(await workbook.xlsx.writeBuffer());contentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";filename="nivesh-balance-sheet.xlsx";
  }else{
   const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);let page=pdf.addPage([595,842]),y=805;
   const write=(text:string,size=9,isBold=false)=>{if(y<45){page=pdf.addPage([595,842]);y=805}page.drawText(text.replace(/[^\x20-\x7E]/g,"-").slice(0,105),{x:38,y,size,font:isBold?bold:font});y-=size+6};
   write("NIVESH - TRUE AND FAIR STATEMENT",16,true);write(`Assets ${money(data.totals.assets)} | Liabilities ${money(data.totals.liabilities)} | Net worth ${money(data.totals.netWorth)}`,11,true);write(`Contingent liabilities tracked separately: ${money(Number(data.totals.contingent||0))}`,9,true);write("Every figure includes its source and location. Not a legally audited statement.",8);y-=8;
   for(const line of data.accepted){const row=line as Row,source=row.source as Row|undefined;write(`${isAssetCategory(row.category)?"ASSET":isLiabilityCategory(row.category)?"LIABILITY":isContingentCategory(row.category)?"CONTINGENT":"REVIEW"} | ${String(row.name)} | ${money(Number(row.amount))}`,9,true);write(`${String(row.entity)} | ${String(row.categoryName)} | ${String(row.basis)} | ${String(row.freshnessState)}`);write(`Source: ${String(source?.filename||"Missing")} - ${String(row.sourceLocation)}`,8);y-=3}
   bytes=await pdf.save();contentType="application/pdf";filename="nivesh-balance-sheet.pdf";
  }
  await AccessLog.create({familyOfficeId:auth.membership.familyOfficeId,familyId:auth.familyId,userId:auth.user._id,action:"export",target:`balance_sheet:${format}`});
  const body=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
  return new Response(body,{headers:{"Content-Type":contentType,"Content-Disposition":`attachment; filename="${filename}"`,"Cache-Control":"private, no-store"}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Export failed"},{status:error instanceof Error&&error.message==="REAUTH_REQUIRED"?401:error instanceof Error&&error.message==="FORBIDDEN"?403:400})}
}
