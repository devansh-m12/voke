import { IgApiClient } from 'instagram-private-api';
import { promises as fs } from 'fs';
import path from 'path';
import { PeekProps } from '@/interface/peek';
// @ts-ignore
import { instagramIdToUrlSegment, urlSegmentToInstagramId } from 'instagram-id-to-url-segment';

// Define the path for storing the session
const SESSION_PATH = path.join(process.cwd(), 'ig-session.json');

// Interfaces for the response
export interface ChildMediaItem {
    id: string;
    media_type: 'IMAGE' | 'VIDEO';
    media_url: string;
    thumbnail_url?: string;
}

export interface MediaItem {
    id: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_url: string;
    permalink: string;
    thumbnail_url?: string;
    timestamp: string;
    username: string;
    caption: string;
    children?: ChildMediaItem[];
    likes: number;
    comments: number;
}

const ig = new IgApiClient();

async function login() {
    ig.state.generateDevice(process.env.IG_USERNAME!);

    ig.request.end$.subscribe(async () => {
        const serialized = await ig.state.serialize();
        delete serialized.constants;
        await fs.writeFile(SESSION_PATH, JSON.stringify(serialized));
    });

    try {
        if (await fs.access(SESSION_PATH).then(() => true).catch(() => false)) {
            const session = await fs.readFile(SESSION_PATH, 'utf8');
            await ig.state.deserialize(JSON.parse(session));
            await ig.account.currentUser();
            console.log("Logged in with session");
            return;
        }
    } catch (e) {
        console.log("Session saved is invalid, logging in again.")
    }
    
    await ig.account.login(process.env.IG_USERNAME!, process.env.IG_PASSWORD!);
    console.log("Logged in with username and password");
}

const peek = async ({ username, filter, limit }: PeekProps): Promise<MediaItem[]> => {
    if (!process.env.IG_USERNAME || !process.env.IG_PASSWORD) {
        throw new Error("Instagram username or password is not available in environment variables.");
    }

    await login();
    
    const userId = await ig.user.getIdByUsername(username);
    const userFeed = ig.feed.user(userId);

    const mediaItems: MediaItem[] = [];

    do {
        const items = await userFeed.items();
        
        const pageItems: MediaItem[] = items.map((item: any): MediaItem | null => {
            let media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
            switch (item.media_type) {
                case 1: media_type = 'IMAGE'; break;
                case 2: media_type = 'VIDEO'; break;
                case 8: media_type = 'CAROUSEL_ALBUM'; break;
                default: return null;
            }

            let children: ChildMediaItem[] | undefined;
            if (media_type === 'CAROUSEL_ALBUM' && item.carousel_media) {
                children = item.carousel_media.map((child: any): ChildMediaItem => ({
                    id: child.id,
                    media_type: child.media_type === 1 ? 'IMAGE' : 'VIDEO',
                    media_url: child.media_type === 2 && child.video_versions?.length ? child.video_versions[0].url : child.image_versions2.candidates[0].url,
                    thumbnail_url: child.image_versions2.candidates[0].url,
                }));
            }

            return {
                id: item.id,
                media_type,
                media_url: media_type === 'VIDEO' && item.video_versions?.length ? item.video_versions[0].url : item.image_versions2.candidates[0].url,
                permalink: `https://www.instagram.com/p/${item.code}/`,
                thumbnail_url: item.image_versions2.candidates[0].url,
                timestamp: new Date(item.taken_at * 1000).toISOString(),
                username: item.user.username,
                caption: item.caption?.text || '',
                children,
                likes: item.like_count || 0,
                comments: item.comment_count || 0
            };
        }).filter((item): item is MediaItem => item !== null);

        let filteredItems = pageItems;
        if (filter === 'photos') {
            filteredItems = pageItems.filter(m => m.media_type === 'IMAGE' || m.media_type === 'CAROUSEL_ALBUM');
        } else if (filter === 'videos') {
            filteredItems = pageItems.filter(m => m.media_type === 'VIDEO');
        }
        
        mediaItems.push(...filteredItems);

        if (limit > 0 && mediaItems.length >= limit) {
            break;
        }

    } while (userFeed.isMoreAvailable());
    
    if (limit > 0) {
        return mediaItems.slice(0, limit);
    }
    
    return mediaItems;
}

const peekPost = async (postId: string): Promise<MediaItem> => {
    if (!process.env.IG_USERNAME || !process.env.IG_PASSWORD) {
        throw new Error("Instagram username or password is not available in environment variables.");
    }

    await login();

    const mediaId = urlSegmentToInstagramId(postId);

    const post = await ig.media.info(mediaId.toString());
    
    // Map the Instagram API response to our MediaItem interface
    const item: any = post.items[0]; // Get the first (and typically only) item, cast to any for flexibility
    
    let media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    switch (item.media_type) {
        case 1: media_type = 'IMAGE'; break;
        case 2: media_type = 'VIDEO'; break;
        case 8: media_type = 'CAROUSEL_ALBUM'; break;
        default: throw new Error(`Unsupported media type: ${item.media_type}`);
    }

    let children: ChildMediaItem[] | undefined;
    if (media_type === 'CAROUSEL_ALBUM' && item.carousel_media) {
        children = item.carousel_media.map((child: any): ChildMediaItem => ({
            id: child.id,
            media_type: child.media_type === 1 ? 'IMAGE' : 'VIDEO',
            media_url: child.media_type === 2 && child.video_versions?.length ? child.video_versions[0].url : child.image_versions2.candidates[0].url,
            thumbnail_url: child.image_versions2.candidates[0].url,
        }));
    }

    const mediaItem: MediaItem = {
        id: item.id,
        media_type,
        media_url: media_type === 'VIDEO' && item.video_versions?.length ? item.video_versions[0].url : item.image_versions2.candidates[0].url,
        permalink: `https://www.instagram.com/p/${item.code}/`,
        thumbnail_url: item.image_versions2.candidates[0].url,
        timestamp: new Date(item.taken_at * 1000).toISOString(),
        username: item.user.username,
        caption: item.caption?.text || '',
        children,
        likes: item.like_count || 0,
        comments: item.comment_count || 0
    };

    return mediaItem;
}

export { peek, peekPost };