import Image from "next/image";

export default function Header() {
    return (
        <div className="p-4 flex items-center justify-center bg-base-100">
            <Image
                src="/nb_logo.png"
                alt="NB Logo"
                width={150}
                height={60}
                priority
                className="w-auto h-auto max-w-full"
            />
        </div>
    );
}
