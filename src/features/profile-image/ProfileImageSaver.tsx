"use client";

import { useEffect } from "react";

const PROFILE_IMAGE_KEY = "nb-portal-profile-image";

interface ProfileImageSaverProps {
    profileImage?: string | null;
}

export function ProfileImageSaver({ profileImage }: ProfileImageSaverProps) {
    useEffect(() => {
        if (profileImage) {
            // localStorageに保存（まだ保存されていない場合のみ）
            const existing = localStorage.getItem(PROFILE_IMAGE_KEY);
            if (!existing) {
                localStorage.setItem(PROFILE_IMAGE_KEY, profileImage);
            }
        }
    }, [profileImage]);

    return null;
}

export function useProfileImage(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(PROFILE_IMAGE_KEY);
}

export function getProfileImageKey(): string {
    return PROFILE_IMAGE_KEY;
}
