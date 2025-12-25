import { auth } from "@/src/auth";
import MoreClient from "./MoreClient";

export default async function MorePage() {
    const session = await auth();

    return <MoreClient user={session?.user} />;
}
