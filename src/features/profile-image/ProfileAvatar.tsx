"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { getProfileImageKey } from "./ProfileImageSaver";

interface ProfileAvatarProps {
    name?: string | null;
    size?: "sm" | "md";
}

export function ProfileAvatar({ name, size = "md" }: ProfileAvatarProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const sizeClass = size === "sm" ? "w-10" : "w-12";
    const iconClass = size === "sm" ? "text-lg" : "text-2xl";

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
                    <FontAwesomeIcon
                        icon={faUser}
                        className={iconClass}
                    />
                </div>
            )}
        </div>
    );
}
