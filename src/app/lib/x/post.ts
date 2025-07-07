import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

interface TweetPostProps {
    text: string;
    mediaUrl?: string;
}

interface TweetResponse {
    id: string;
    text: string;
    url: string;
}

const postTweet = async ({ text, mediaUrl }: TweetPostProps): Promise<TweetResponse> => {
    console.log('🎬 STARTING TWEET POST PROCESS');
    console.log('📝 Tweet text:', text);
    console.log('📸 Media URL:', mediaUrl || 'None');
    
    // Check for required environment variables
    console.log('🔍 Checking environment variables...');
    if (!process.env.X_API_KEY || !process.env.X_API_SECRET || !process.env.X_ACCESS_TOKEN || !process.env.X_ACCESS_TOKEN_SECRET) {
        console.error('❌ Missing X API credentials in environment variables');
        throw new Error("X API credentials are not available in environment variables.");
    }
    console.log('✅ All X API credentials found');

    // Using direct fetch to X API (no library initialization needed)
    console.log('🔧 Using direct fetch to X API endpoints...');
    console.log('✅ Ready to use v1.1 for media upload and v2 for tweet posting');

    try {
        let mediaIds: string[] = [];

        // If media URL is provided, upload it first
        if (mediaUrl) {
            console.log('📥 Media URL provided - starting media processing...');
            
            // Download the media file directly from the URL
            console.log('🌐 Downloading media from URL:', mediaUrl);
            const mediaResponse = await fetch(mediaUrl);
            if (!mediaResponse.ok) {
                console.error('❌ Failed to fetch media:', mediaResponse.statusText);
                throw new Error(`Failed to fetch media from URL: ${mediaResponse.statusText}`);
            }
            console.log('✅ Media downloaded successfully');
            
            // Get file info
            const contentType = mediaResponse.headers.get('content-type') || 'image/jpeg';
            const contentLength = mediaResponse.headers.get('content-length');
            console.log('📄 Media content type:', contentType);
            console.log('📏 Media content length:', contentLength);
            
            // Check file size limits according to X API docs
            // Image: 5 MB, GIF: 15 MB, Video: 512 MB
            console.log('📊 Checking file size limits...');
            if (contentLength) {
                const fileSizeInMB = parseInt(contentLength) / (1024 * 1024);
                console.log('📐 File size:', fileSizeInMB.toFixed(2), 'MB');
                
                if (contentType.startsWith('image/') && fileSizeInMB > 5) {
                    console.error('❌ Image size exceeds 5MB limit');
                    throw new Error('Image size exceeds 5MB limit');
                }
                if (contentType.startsWith('video/') && fileSizeInMB > 512) {
                    console.error('❌ Video size exceeds 512MB limit');
                    throw new Error('Video size exceeds 512MB limit');
                }
                if (contentType.includes('gif') && fileSizeInMB > 15) {
                    console.error('❌ GIF size exceeds 15MB limit');
                    throw new Error('GIF size exceeds 15MB limit');
                }
                console.log('✅ File size within limits');
            }
            
            console.log('🔄 Converting media to buffer...');
            const mediaBuffer = await mediaResponse.arrayBuffer();
            const mediaBufferFromArrayBuffer = Buffer.from(mediaBuffer);
            console.log('✅ Media buffer created:', mediaBufferFromArrayBuffer.length, 'bytes');
            
            // Upload media using direct fetch to X API media upload endpoint
            try {
                console.log('🚀 STEP 1: Starting media upload process...');
                console.log('📄 Media buffer size:', mediaBufferFromArrayBuffer.length, 'bytes');
                console.log('📄 Content type:', contentType);
                
                // Media upload uses v1.1 endpoint (v2 doesn't exist for media upload)
                console.log('🔐 STEP 2: Using v1.1 for media upload (v2 media upload does not exist)');
                
                const mediaUploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
                console.log('🌐 STEP 3: Target URL set (v1.1):', mediaUploadUrl);
                
                // Create form data for media upload (v1.1 format)
                console.log('📦 STEP 4: Creating FormData for v1.1 media upload...');
                const formData = new FormData();
                formData.append('media', new Blob([mediaBufferFromArrayBuffer], { type: contentType }));
                console.log('✅ FormData created with media blob for v1.1 API');

                // Use OAuth 1.0a for v1.1 API authentication
                console.log('🔏 STEP 5: Using OAuth 1.0a for v1.1 API authentication...');
                
                // Create OAuth instance for signing requests
                const oauth = new OAuth({
                    consumer: {
                        key: process.env.X_API_KEY!,
                        secret: process.env.X_API_SECRET!,
                    },
                    signature_method: 'HMAC-SHA1',
                    hash_function(base_string, key) {
                        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
                    },
                });

                const token = {
                    key: process.env.X_ACCESS_TOKEN!,
                    secret: process.env.X_ACCESS_TOKEN_SECRET!,
                };

                // For OAuth signing, we need to create the request data without FormData
                console.log('📝 STEP 6: Preparing OAuth request data for v1.1...');
                const requestData = {
                    url: mediaUploadUrl,
                    method: 'POST',
                };

                // Generate OAuth authorization header
                console.log('🔏 STEP 7: Generating OAuth authorization header for v1.1...');
                const authHeader = oauth.toHeader(oauth.authorize(requestData, token));
                console.log('✅ OAuth authorization header generated for v1.1');
                console.log('🔑 Authorization header preview:', authHeader.Authorization.substring(0, 50) + '...');

                // Make the fetch request
                console.log('🌐 STEP 8: Sending media upload request to X API v1.1...');
                const uploadResponse = await fetch(mediaUploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': authHeader.Authorization,
                    },
                    body: formData,
                });

                console.log('📡 STEP 9: Response received from X API v1.1');
                console.log('📊 Response status:', uploadResponse.status);
                console.log('📊 Response status text:', uploadResponse.statusText);
                console.log('📊 Response headers:', Object.fromEntries(uploadResponse.headers.entries()));

                if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text();
                    console.error('❌ v1.1 Upload failed with error response:', errorText);
                    throw new Error(`v1.1 Media upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
                }

                console.log('✅ STEP 10: Upload response OK, parsing JSON...');
                const uploadResult = await uploadResponse.json();
                console.log('🎉 STEP 11: Media upload successful!');
                console.log('📄 Full upload result (v1.1):', JSON.stringify(uploadResult, null, 2));
                
                // v1.1 response format - use media_id_string as primary
                const mediaId = uploadResult.media_id_string || uploadResult.media_id;
                
                if (mediaId) {
                    console.log('🆔 STEP 12: Media ID extracted (v1.1):', mediaId);
                    mediaIds.push(mediaId);
                    console.log('✅ Media ID added to array. Total media IDs:', mediaIds.length);
                } else {
                    console.error('❌ No media ID found in v1.1 response');
                    console.error('📄 Available fields:', Object.keys(uploadResult));
                    throw new Error('Media upload succeeded but no media_id returned');
                }
                
            } catch (uploadError) {
                console.error('v1.1 Direct fetch media upload failed:', uploadError);
                
                // Log detailed error information for debugging
                if (uploadError instanceof Error) {
                    console.error('v1.1 Error message:', uploadError.message);
                    console.error('v1.1 Error stack:', uploadError.stack);
                }
                
                throw new Error(`v1.1 Media upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
            }
        } else {
            console.log('📝 No media URL provided - proceeding with text-only tweet');
        }

        // Post the tweet using v2 API
        console.log('🐦 STEP 13: Preparing tweet for v2 API...');
        const tweetPayload: any = {
            text: text,
        };

        if (mediaIds.length > 0) {
            console.log('📸 STEP 14: Adding media IDs to tweet payload...');
            tweetPayload.media = {
                media_ids: mediaIds,
            };
            console.log('✅ Media IDs attached to tweet');
        } else {
            console.log('📝 STEP 14: No media to attach - text-only tweet');
        }

        console.log('🔧 Tweet payload configured:', JSON.stringify(tweetPayload, null, 2));
        console.log('📊 Media IDs count:', mediaIds.length);

        // Use direct fetch to v2 API for tweet posting
        console.log('🚀 STEP 15: Posting tweet via X API v2...');
        const tweetUrl = 'https://api.twitter.com/2/tweets';
        
        // Create OAuth instance for tweet posting
        const oauth = new OAuth({
            consumer: {
                key: process.env.X_API_KEY!,
                secret: process.env.X_API_SECRET!,
            },
            signature_method: 'HMAC-SHA1',
            hash_function(base_string, key) {
                return crypto.createHmac('sha1', key).update(base_string).digest('base64');
            },
        });

        const token = {
            key: process.env.X_ACCESS_TOKEN!,
            secret: process.env.X_ACCESS_TOKEN_SECRET!,
        };

        const requestData = {
            url: tweetUrl,
            method: 'POST',
        };

        const authHeader = oauth.toHeader(oauth.authorize(requestData, token));
        console.log('🔑 OAuth header generated for tweet posting');

        const tweetResponse = await fetch(tweetUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader.Authorization,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tweetPayload),
        });

        console.log('📡 Tweet response status:', tweetResponse.status);
        console.log('📡 Tweet response status text:', tweetResponse.statusText);

        if (!tweetResponse.ok) {
            const errorText = await tweetResponse.text();
            console.error('❌ Tweet posting failed:', errorText);
            throw new Error(`Tweet posting failed: ${tweetResponse.status} ${tweetResponse.statusText} - ${errorText}`);
        }

        const tweet = await tweetResponse.json();
        console.log('✅ STEP 16: Tweet posted successfully via v2 API!');
        console.log('📄 Tweet response:', JSON.stringify(tweet, null, 2));

        // Return formatted response
        console.log('🎯 STEP 17: Formatting final response...');
        const response = {
            id: tweet.data.id,
            text: tweet.data.text,
            url: `https://twitter.com/i/web/status/${tweet.data.id}`,
        };
        console.log('✅ Final response prepared:', JSON.stringify(response, null, 2));
        console.log('🎉 TWEET POSTING PROCESS COMPLETED SUCCESSFULLY!');
        
        return response;

    } catch (error) {
        console.error('💥 TWEET POSTING PROCESS FAILED');
        console.error('❌ Error details:', error);
        
        if (error instanceof Error) {
            console.error('📝 Error message:', error.message);
            console.error('📍 Error stack:', error.stack);
        }
        
        console.error('🚨 Full error object:', JSON.stringify(error, null, 2));
        throw error;
    }
};

export { postTweet };
export type { TweetPostProps, TweetResponse }; 