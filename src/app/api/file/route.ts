import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/app/lib/files";

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();
        
        if (!url) {
            return NextResponse.json(
                { error: "URL is required" }, 
                { status: 400 }
            );
        }

        const fileUrl = await uploadFile(url);
        
        return NextResponse.json({ 
            success: true,
            file: fileUrl,
            message: "File uploaded successfully to uguu.se"
        });
        
    } catch (error) {
        console.error("File upload error:", error);
        return NextResponse.json(
            { 
                success: false,
                error: "Failed to upload file",
                details: error instanceof Error ? error.message : "Unknown error"
            }, 
            { status: 500 }
        );
    }
}