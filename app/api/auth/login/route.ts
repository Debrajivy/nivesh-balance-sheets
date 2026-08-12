import { NextResponse } from "next/server";
import { connectDB } from "@/lib/server/db";
import { createSession, verifyPassword } from "@/lib/server/auth";
import { Membership, User } from "@/lib/server/models";
const homes:Record<string,string>={operator:"/overview",principal:"/balance-sheet",ca:"/tax",admin:"/families"};
export async function POST(req:Request){try{const{email,password}=await req.json();await connectDB();const user=await User.findOne({email:String(email).toLowerCase()});if(!user||!await verifyPassword(String(password),String(user.passwordHash)))return NextResponse.json({error:"Invalid email or password."},{status:401});const membership=await Membership.findOne({userId:user._id}).lean() as Record<string,unknown>|null,role=String(membership?.role||"");await createSession(String(user._id));return NextResponse.json({user:{id:user._id,name:user.name,email:user.email},role,home:homes[role]||"/overview"})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Login failed"},{status:500})}}
