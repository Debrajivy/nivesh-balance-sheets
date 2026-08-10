import { NextResponse } from "next/server";
import { connectDB } from "@/lib/server/db";
import { createSession, verifyPassword } from "@/lib/server/auth";
import { User } from "@/lib/server/models";
export async function POST(req:Request){try{const{email,password}=await req.json();await connectDB();const user=await User.findOne({email:String(email).toLowerCase()});if(!user||!await verifyPassword(String(password),String(user.passwordHash)))return NextResponse.json({error:"Invalid email or password."},{status:401});await createSession(String(user._id));return NextResponse.json({user:{id:user._id,name:user.name,email:user.email}})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Login failed"},{status:500})}}
