import { PeekProps } from "@/interface/peek";

const PEEK_URL = "https://graph.instagram.com";

interface IgUser {
    id: string;
    username: string;
}

interface IgMedia {
    id: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_url: string;
    permalink: string;
    thumbnail_url?: string;
    timestamp: string;
    username: string;
}

const peek = async ({ filter, limit }: PeekProps) => {
    const accessToken = process.env.IG_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error("Instagram access token is not available.");
    }

    // 1. Get user id from access token
    const userResponse = await fetch(`${PEEK_URL}/me?fields=id,username&access_token=${accessToken}`);

    if (!userResponse.ok) {
        const errorData = await userResponse.json();
        console.error("Instagram API Error:", errorData);
        throw new Error(`Could not fetch Instagram user. Status: ${userResponse.status}`);
    }

    const userData: IgUser = await userResponse.json();
    const userId = userData.id;

    // 2. Get user's media
    const mediaFields = "id,media_type,media_url,permalink,thumbnail_url,timestamp,username";
    const mediaResponse = await fetch(`${PEEK_URL}/${userId}/media?fields=${mediaFields}&access_token=${accessToken}`);
    
    if (!mediaResponse.ok) {
        const errorData = await mediaResponse.json();
        console.error("Instagram API Error:", errorData);
        throw new Error(`Could not fetch Instagram media. Status: ${mediaResponse.status}`);
    }

    const mediaData: { data: IgMedia[] } = await mediaResponse.json();

    let media = mediaData.data;

    // 3. Filter media
    if (filter === "photos") {
        media = media.filter(m => m.media_type === 'IMAGE' || m.media_type === 'CAROUSEL_ALBUM');
    } else if (filter === "videos") {
        media = media.filter(m => m.media_type === 'VIDEO');
    }

    // 4. Limit media
    if (limit && limit > 0) {
        media = media.slice(0, limit);
    }

    return media;
}

export default peek;