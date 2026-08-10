import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name:"Nivesh — Family wealth, clearly", short_name:"Nivesh", description:"True and fair family wealth statement", start_url:"/overview", display:"standalone", background_color:"#f4f6f9", theme_color:"#0f2547", icons:[{src:"/favicon.ico",sizes:"any",type:"image/x-icon"}] }; }
