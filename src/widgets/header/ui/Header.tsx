import Image from "next/image";
import { ThemeToggle } from "@/features/theme-toggle";

export default function Header() {
    return (
        <div className="p-4 flex items-center justify-between bg-base-100">
            <div className="w-10"></div>
            <Image
                src="/nb_logo.png"
                alt="NB Logo"
                width={150}
                height={60}
                priority
                className="h-auto max-w-full"
            />
            <ThemeToggle />
        </div>
    );
}
