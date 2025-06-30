import { IgApiClient } from 'instagram-private-api';
import { promises as fs } from 'fs';
import path from 'path';
import { allowedUser } from './constant';

const SESSION_PATH = path.join(process.cwd(), 'ig-session.json');
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

const processMessageItem = (item: any) => {
    // console.log(item);
    const message: { type: string; content: any; senderId: string; timestamp: string; media_id: string } = {
        type: item.item_type,
        content: `Unsupported message type: ${item.item_type}`,
        senderId: item.user_id.toString(),
        timestamp: new Date(parseInt(item.timestamp) / 1000).toISOString(),
        media_id: item.item_id,
    };

    // console.log(item.item_type);

    switch (item.item_type) {
        case 'text':
            message.content = item.text;
            break;
        case 'media_share':
            if (item.media_share) {
                if (item.media_share.carousel_media && item.media_share.carousel_media.length > 0) {
                    message.type = 'carousel_share';
                    message.content = {
                        caption: item.media_share.caption?.text || '',
                        children: item.media_share.carousel_media.map((child: any) => ({
                            media_url: child.video_versions?.[0]?.url || child.image_versions2?.candidates[0]?.url,
                            thumbnail_url: child.image_versions2?.candidates[0]?.url,
                            type: child.video_versions?.[0]?.url ? 'video' : 'image',
                        })),
                        username: item.media_share.user.username,
                    };
                } else {
                    message.content = {
                        caption: item.media_share.caption?.text || '',
                        media_url: item.media_share.video_versions?.[0]?.url || item.media_share.image_versions2?.candidates[0]?.url,
                        thumbnail_url: item.media_share.image_versions2?.candidates[0]?.url,
                        username: item.media_share.user.username,
                    };
                }
            }
            break;
        case 'media': // Direct photo/video
            if (item.media) {
                message.content = {
                    media_url: item.media.video_versions?.[0]?.url || item.media.image_versions2?.candidates[0]?.url,
                    thumbnail_url: item.media.image_versions2?.candidates[0]?.url,
                };
            }
            break;
        case 'clip': // Reels sent as 'clip'
            if (item.clip?.clip) {
                message.content = {
                    media_url: item.clip.clip.video_versions?.[0]?.url,
                    thumbnail_url: item.clip.clip.image_versions2?.candidates[0]?.url,
                    caption: item.clip.clip.caption?.text || '',
                };
            }
            break;
        case 'link':
            if (item.link?.link_context) {
                message.content = {
                    text: item.link.text,
                    url: item.link.link_context.link_url,
                };
            }
            break;
        case 'like':
            message.content = '❤️';
            break;
        case 'story_share':
            if (item.story_share?.media) {
                message.content = {
                    text: item.story_share.text,
                    media_url: item.story_share.media.video_versions?.[0]?.url || item.story_share.media.image_versions2?.candidates[0]?.url,
                    thumbnail_url: item.story_share.media.image_versions2?.candidates[0]?.url,
                };
                if (!message.content.media_url) {
                    message.content = `Story by ${item.story_share.media.user.username} is unavailable.`
                }
            }
            break;
        case 'voice_media':
            if (item.voice_media?.media) {
                message.content = {
                    audio_url: item.voice_media.media.audio.audio_src,
                    duration: item.voice_media.media.audio.duration,
                };
            }
            break;
        case 'placeholder':
            if (item.placeholder) {
                message.content = item.placeholder.message;
            }
            break;
    }
    return message;
};

export const getDirectMessages = async (limit: number = 10, type: 'all' | 'clip' = 'all') => {
    await login();
    const directInboxFeed = ig.feed.directInbox();
    const threads = await directInboxFeed.items();

    const currentUser = await ig.account.currentUser();

    return threads
        .filter(thread => thread.users.some(user => allowedUser.includes(user.username)))
        .map(thread => {
            const userMap = new Map<string, string>();
            thread.users.forEach(user => userMap.set(user.pk.toString(), user.username));
            userMap.set(currentUser.pk.toString(), currentUser.username);

            const messages = thread.items.slice(0, limit).filter(item => {
                if (type === 'clip') {
                    return item.item_type === 'clip';
                }
                return true;
            }).map(item => {
                const processedMessage = processMessageItem(item);
                return {
                    ...processedMessage,
                    sender: userMap.get(processedMessage.senderId) || `User ID: ${processedMessage.senderId}`,
                }
            }).reverse();

            return {
                threadId: thread.thread_id,
                threadTitle: thread.thread_title,
                users: thread.users.map(user => user.username),
                messages
            }
        });
};
