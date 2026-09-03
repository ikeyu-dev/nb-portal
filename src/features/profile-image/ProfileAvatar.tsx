import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

interface ProfileAvatarProps {
    name?: string | null;
    imageUrl?: string | null;
    size?: "sm" | "md";
}

export function ProfileAvatar({
    name,
    imageUrl,
    size = "md",
}: ProfileAvatarProps) {
    const sizeClass = size === "sm" ? "w-10" : "w-12";
    const sizePixels = size === "sm" ? 40 : 48;
    const iconClass = size === "sm" ? "text-lg" : "text-2xl";

    return (
        <div className="avatar placeholder">
            {imageUrl ? (
                <div className={`overflow-hidden rounded-full ${sizeClass}`}>
                    <Image
                        src={imageUrl}
                        alt={name || "プロフィール画像"}
                        width={sizePixels}
                        height={sizePixels}
                        unoptimized
                        className="aspect-square h-auto w-full object-cover"
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
