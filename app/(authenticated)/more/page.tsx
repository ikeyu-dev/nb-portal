import { auth } from "@/src/auth";
import MoreClient from "./MoreClient";

export default async function MorePage() {
    const session = await auth();

    return (
        <MoreClient
            user={session?.user}
            displayName={
                session?.displayName ||
                session?.memberName ||
                session?.user?.name ||
                session?.studentId ||
                null
            }
        />
    );
}
