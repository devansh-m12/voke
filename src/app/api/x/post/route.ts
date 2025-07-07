import { NextRequest, NextResponse } from 'next/server';
import { postTweet } from '@/app/lib/x/post';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, mediaUrl } = body;

        // Validate required fields
        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'Text is required and must be a string' },
                { status: 400 }
            );
        }

        // Validate text length (X allows up to 280 characters for basic posts)
        if (text.length > 280) {
            return NextResponse.json(
                { error: 'Text must be 280 characters or less' },
                { status: 400 }
            );
        }

        // Validate mediaUrl if provided
        if (mediaUrl && typeof mediaUrl !== 'string') {
            return NextResponse.json(
                { error: 'Media URL must be a string' },
                { status: 400 }
            );
        }

        // Post the tweet
        const result = await postTweet({ text, mediaUrl });

        return NextResponse.json({
            success: true,
            data: result,
        }, { status: 200 });

    } catch (error) {
        console.error('Error in X post API:', error);
        
        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('credentials are not available')) {
                return NextResponse.json(
                    { error: 'X API configuration error' },
                    { status: 500 }
                );
            }
            
            if (error.message.includes('authentication')) {
                return NextResponse.json(
                    { error: 'X API authentication failed' },
                    { status: 401 }
                );
            }
            
            if (error.message.includes('rate limit')) {
                return NextResponse.json(
                    { error: 'Rate limit exceeded' },
                    { status: 429 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Failed to post tweet' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json(
        { message: 'X Post API endpoint - use POST method to post tweets' },
        { status: 200 }
    );
} 