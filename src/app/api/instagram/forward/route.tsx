import { getDirectMessages } from "@/app/lib/instagram/message";
import publish from "@/app/lib/instagram/publish";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
       const messages = await getDirectMessages(1, 'clip');

       for (const message of messages[0].messages) {
            const url = message.content.media_url;
            const mediaId = message.media_id;
            const caption = message.content.caption;
            const sender = message.sender;
            const timestamp = message.timestamp;
            const type = message.type == 'clip' ? 'REELS' : 'IMAGE';

            const post = await publish({
                media: [{ url: url, type: type == 'REELS' ? 'VIDEO' : 'IMAGE' }],
                postType: type,
                caption: caption
            });

            console.log(post);
       }
       return NextResponse.json({ message: "ok" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}