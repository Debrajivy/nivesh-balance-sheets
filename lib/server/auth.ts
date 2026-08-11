import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { connectDB } from "./db";
import { Membership, Session, User } from "./models";
import { hasCapability, type Capability, type Role } from "@/lib/permissions";
export type { Capability, Role } from "@/lib/permissions";
const scrypt=promisify(scryptCb),cookieName=process.env.SESSION_COOKIE_NAME||"nivesh_session",hash=(x:string)=>createHash("sha256").update(x).digest("hex");
type SessionRow={userId:unknown};type UserRow={_id:unknown;name:unknown;email:unknown;active:unknown};type MembershipRow={familyOfficeId:unknown;familyIds:unknown[];role:string};
export async function hashPassword(password:string){const salt=randomBytes(16).toString("hex"),key=await scrypt(password,salt,64)as Buffer;return`${salt}:${key.toString("hex")}`}
export async function verifyPassword(password:string,stored:string){const[salt,hex]=stored.split(":");if(!salt||!hex)return false;const key=await scrypt(password,salt,64)as Buffer,a=Buffer.from(hex,"hex");return a.length===key.length&&timingSafeEqual(a,key)}
export async function createSession(userId:string){await connectDB();const token=randomBytes(32).toString("base64url"),expiresAt=new Date(Date.now()+7*864e5);await Session.create({tokenHash:hash(token),userId,expiresAt});(await cookies()).set(cookieName,token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",expires:expiresAt})}
export async function destroySession(){const store=await cookies(),token=store.get(cookieName)?.value;if(token){await connectDB();await Session.deleteOne({tokenHash:hash(token)})}store.delete(cookieName)}
export async function getSession(){const token=(await cookies()).get(cookieName)?.value;if(!token)return null;await connectDB();const session=await Session.findOne({tokenHash:hash(token),expiresAt:{$gt:new Date()}}).lean()as unknown as SessionRow|null;if(!session)return null;const user=await User.findById(session.userId).select("name email active").lean()as unknown as UserRow|null;const memberships=await Membership.find({userId:session.userId}).lean()as unknown as MembershipRow[];return user&&user.active?{user,memberships}:null}
export async function requireMembership(familyId?:string){const session=await getSession();if(!session)throw new Error("UNAUTHENTICATED");const membership=session.memberships.find(m=>familyId?m.familyIds.map(String).includes(familyId):m.familyIds.length>0);if(!membership)throw new Error("FORBIDDEN");return{...session,membership,role:membership.role as Role,familyId:familyId||String(membership.familyIds[0])}}
export async function requireCapability(capability:Capability,familyId?:string){const auth=await requireMembership(familyId);if(!hasCapability(auth.role,capability))throw new Error("FORBIDDEN");return auth}
export async function requireFirmAdmin(){const session=await getSession();if(!session)throw new Error("UNAUTHENTICATED");const membership=session.memberships.find(m=>m.role==="admin");if(!membership)throw new Error("FORBIDDEN");return{...session,membership,role:"admin" as const}}
