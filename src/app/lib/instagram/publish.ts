import { PostProps, MediaObject, PostType } from "@/interface/post";
import { uploadFile } from "../files";

const API_VERSION = "v20.0";
const BASE_URL = `https://graph.instagram.com/${API_VERSION}`;

interface IgUser {
    id: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const checkContainerStatus = async (containerId: string, accessToken: string): Promise<string> => {
    const response = await fetch(`${BASE_URL}/${containerId}?fields=status_code&access_token=${accessToken}`);
    if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error checking status for container ${containerId}:`, errorData);
        throw new Error(`Failed to check container status. Status: ${response.status}`);
    }
    const { status_code } = await response.json();
    return status_code;
};

const waitForContainerReady = async (containerId: string, accessToken: string) => {
    const MAX_RETRIES = 20;
    const RETRY_DELAY_MS = 3000;

    for (let i = 0; i < MAX_RETRIES; i++) {
        const status = await checkContainerStatus(containerId, accessToken);
        switch (status) {
            case 'FINISHED':
                console.log(`Container ${containerId} is ready.`);
                return;
            case 'IN_PROGRESS':
                console.log(`Container ${containerId} processing... Attempt ${i + 1}/${MAX_RETRIES}`);
                await delay(RETRY_DELAY_MS);
                break;
            case 'ERROR':
                throw new Error(`Container ${containerId} failed with status: ERROR.`);
            case 'EXPIRED':
                throw new Error(`Container ${containerId} has expired.`);
            case 'PUBLISHED':
                console.log(`Container ${containerId} has already been published.`);
                return;
            default:
                throw new Error(`Unknown status for container ${containerId}: ${status}`);
        }
    }
    throw new Error(`Container ${containerId} did not become ready in time.`);
};

const createMediaContainer = async (
    userId: string,
    accessToken: string,
    media: MediaObject,
    isCarouselItem: boolean,
    caption?: string,
    postTypeForSingleMedia?: PostType
): Promise<string> => {
    const params = new URLSearchParams({ access_token: accessToken });

    const tempUrl = await uploadFile(media.url);

    console.log('tempUrl', tempUrl);

    if (media.type === 'VIDEO') {
        params.append('video_url', tempUrl);
    } else {
        params.append('image_url', tempUrl);
    }

    if (postTypeForSingleMedia && !isCarouselItem) {
        if (['REELS', 'STORIES', 'VIDEO'].includes(postTypeForSingleMedia)) {
            params.append('media_type', postTypeForSingleMedia);
        }
    }

    if (isCarouselItem) {
        params.append('is_carousel_item', 'true');
    }

    if (caption && !isCarouselItem) {
        params.append('caption', caption);
    }

    const response = await fetch(`${BASE_URL}/${userId}/media?${params.toString()}`, {
        method: 'POST',
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Instagram API Error (createMediaContainer):", errorData);
        throw new Error(`Could not create media container for ${tempUrl}. Status: ${response.status}`);
    }

    const data = await response.json();
    const containerId = data.id;

    if (media.type === 'VIDEO') {
        await waitForContainerReady(containerId, accessToken);
    }

    return containerId;
};

const createCarouselContainer = async (userId: string, accessToken: string, childrenIds: string[], caption?: string): Promise<string> => {
    const params = new URLSearchParams({
        access_token: accessToken,
        media_type: 'CAROUSEL',
        children: childrenIds.join(','),
    });

    if (caption) {
        params.append('caption', caption);
    }

    const response = await fetch(`${BASE_URL}/${userId}/media?${params.toString()}`, {
        method: 'POST',
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Instagram API Error (createCarouselContainer):", errorData);
        throw new Error(`Could not create carousel container. Status: ${response.status}`);
    }

    const data = await response.json();
    return data.id;
}

const publishContainer = async (userId: string, accessToken: string, containerId: string) => {
    const params = new URLSearchParams({
        access_token: accessToken,
        creation_id: containerId,
    });

    const response = await fetch(`${BASE_URL}/${userId}/media_publish?${params.toString()}`, {
        method: 'POST',
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Instagram API Error (publishContainer):", errorData);
        throw new Error(`Could not publish media container ${containerId}. Status: ${response.status}`);
    }

    return await response.json();
}

const getIgUserId = async (accessToken: string): Promise<string> => {
    const userResponse = await fetch(`${BASE_URL}/me?fields=id&access_token=${accessToken}`);
    if (!userResponse.ok) {
        const errorData = await userResponse.json();
        console.error("Instagram API Error:", errorData);
        throw new Error(`Could not fetch Instagram user. Status: ${userResponse.status}`);
    }
    const userData: IgUser = await userResponse.json();
    return userData.id;
}

const publish = async ({ media, postType, caption }: PostProps) => {
    const accessToken = process.env.IG_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error("Instagram access token is not available.");
    }
    const userId = await getIgUserId(accessToken);

    let finalContainerId;

    if (postType === 'CAROUSEL') {
        if (!media || media.length < 2 || media.length > 10) {
            throw new Error("Carousel posts require 2 to 10 media items.");
        }
        const childContainerIds = await Promise.all(
            media.map((item: MediaObject) => createMediaContainer(userId, accessToken, item, true))
        );
        finalContainerId = await createCarouselContainer(userId, accessToken, childContainerIds, caption);
        await waitForContainerReady(finalContainerId, accessToken);
    } else {
        if (!media || media.length !== 1) {
            throw new Error(`${postType} posts require exactly 1 media item.`);
        }
        finalContainerId = await createMediaContainer(userId, accessToken, media[0], false, caption, postType);
    }
    
    const postResult = await publishContainer(userId, accessToken, finalContainerId);
    return postResult;
}

export default publish;
