interface PeekProps {
    username: string;
    filter: "videos" | "photos" | "all";
    limit: number;
}

export type { PeekProps };