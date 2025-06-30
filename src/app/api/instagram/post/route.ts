'use server';

import { NextResponse } from "next/server";
import { PostProps } from "@/interface/post";
import publish from "@/app/lib/instagram/publish";


export async function POST(request: Request) {
    try {
        const body: PostProps = await request.json();
        const { media, postType, caption } = body;

        if (!media || !postType) {
            return NextResponse.json({ message: "media and postType are required" }, { status: 400 });
        }

        const result = await publish({ media, postType, caption });
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
} 