"use client";

import { useState, useEffect } from "react";
import { getProfileImageKey } from "./ProfileImageSaver";

interface ProfileAvatarProps {
    name?: string | null;
    size?: "sm" | "md";
}

export function ProfileAvatar({ name, size = "md" }: ProfileAvatarProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const sizeClass = size === "sm" ? "w-10" : "w-12";
    const iconClass = size === "sm" ? "w-5 h-5" : "w-6 h-6";

    useEffect(() => {
        const image = localStorage.getItem(getProfileImageKey());
        if (image) {
            setImageUrl(image);
        }
    }, []);

    return (
        <div className="avatar placeholder">
            {imageUrl ? (
                <div className={`rounded-full ${sizeClass}`}>
                    <img
                        src={imageUrl}
                        alt={name || "プロフィール画像"}
                    />
                </div>
            ) : (
                <div
                    className={`bg-primary text-primary-content rounded-full ${sizeClass} flex items-center justify-center`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 448 512"
                        className={iconClass}
                        fill="currentColor"
                    >
                        <path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z" />
                    </svg>
                </div>
            )}
        </div>
    );
}
