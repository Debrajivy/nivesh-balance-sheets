import { NextResponse } from "next/server";
import { AccessLog, User } from "@/lib/server/models";
import { getSession, markReauthenticated, verifyPassword } from "@/lib/server/auth";
import { connectDB } from "@/lib/server/db";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    const { password, purpose } = await req.json();
    if (!password || typeof password !== "string") return NextResponse.json({ error: "Password is required" }, { status: 400 });
    await connectDB();
    const user = await User.findById(session.user._id).select("passwordHash").lean() as { passwordHash?: string } | null;
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) return NextResponse.json({ error: "Invalid password" }, { status: 403 });
    await markReauthenticated(session.user._id);
    const membership = session.memberships[0];
    if (membership) await AccessLog.create({ familyOfficeId: membership.familyOfficeId, familyId: membership.familyIds[0], userId: session.user._id, action: "reauthenticate", target: String(purpose || "sensitive_action") });
    return NextResponse.json({ ok: true, validForMinutes: 10 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Re-authentication failed" }, { status: 400 });
  }
}
