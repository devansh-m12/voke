import { NextResponse } from "next/server";
import { PeekProps } from "@/interface/peek";
import peek from "@/app/lib/instagram/peek";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, filter, limit } = body;
        const result = await peek({ username, filter, limit });
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}