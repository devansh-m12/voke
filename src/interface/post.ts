/**
 * Represents a media item to be posted on Instagram.
 * Each object must have a publicly accessible URL.
 */
export interface MediaObject {
    /**
     * Publicly accessible URL of the image or video.
     * Videos will be uploaded from here.
     * Images must be in JPEG format.
     */
    url: string;
    /**
     * The type of media. This is used to determine whether to use `image_url` or `video_url`
     * when creating media containers, especially for carousel items.
     */
    type: 'IMAGE' | 'VIDEO';
}

/**
 * The type of post to be created on Instagram.
 * - `IMAGE`, `VIDEO`, `REELS`, `STORIES`: for single media posts.
 * - `CAROUSEL`: for posts with multiple images/videos.
 */
export type PostType = 'IMAGE' | 'VIDEO' | 'REELS' | 'STORIES' | 'CAROUSEL';

/**
 * Defines the properties for creating an Instagram post via the API.
 */
export interface PostProps {
    /**
     * An array of media objects.
     * - For `CAROUSEL`, it can contain 2-10 media objects.
     * - For other `postType`, it must contain exactly 1 media object.
     */
    media: MediaObject[];
    /** The type of Instagram post to create. */
    postType: PostType;
    /**
     * Optional caption for the post.
     * For `CAROUSEL` posts, this caption applies to the entire carousel.
     */
    caption?: string;
} 