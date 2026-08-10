import "server-only";import mongoose from "mongoose";
const globalDb=globalThis as typeof globalThis&{__niveshDb?:Promise<typeof mongoose>};
export function connectDB(){const uri=process.env.MONGODB_URI;if(!uri||uri.includes("<db_password>")||uri.includes("REPLACE_WITH_PASSWORD"))throw new Error("Set MONGODB_URI with the real Atlas password in .env.local");globalDb.__niveshDb??=mongoose.connect(uri,{dbName:"nivesh",maxPoolSize:10,serverSelectionTimeoutMS:8000});return globalDb.__niveshDb}
