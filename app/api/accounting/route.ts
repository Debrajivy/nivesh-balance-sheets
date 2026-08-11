import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/server/auth";
import { familyAccounting } from "@/lib/server/accounting";
import { AccessLog } from "@/lib/server/models";
export async function GET(req:Request){try{const requested=new URL(req.url).searchParams.get("familyId")||undefined,auth=await requireCapability("view_sheet",requested),data=await familyAccounting(auth.membership.familyOfficeId,auth.familyId);await AccessLog.create({familyOfficeId:auth.membership.familyOfficeId,familyId:auth.familyId,userId:auth.user._id,action:"view",target:"accounting_statement"});return NextResponse.json(data)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Failed"},{status:error instanceof Error&&error.message==="UNAUTHENTICATED"?401:403})}}
