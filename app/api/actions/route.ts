import { NextResponse } from "next/server";
import { connectDB } from "@/lib/server/db";
import { requireMembership } from "@/lib/server/auth";
import { AccessLog } from "@/lib/server/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action || "").trim();
    if (!action || action.length > 160) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    const { membership, user } = await requireMembership();
    await connectDB();
    const row = await AccessLog.create({ familyOfficeId: membership.familyOfficeId, familyId: membership.familyIds[0], userId: user._id, action: "ui_action", target: String(body.path || "unknown"), metadata: { label: action } });
    return NextResponse.json({ ok: true, id: row._id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Action failed" }, { status: 400 });
  }
}
