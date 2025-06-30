import { NextResponse } from "next/server";
import { getDirectMessages } from "@/app/lib/instagram/message";

export async function GET() {
    try {
        const messages = await getDirectMessages();
        return NextResponse.json(messages);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 