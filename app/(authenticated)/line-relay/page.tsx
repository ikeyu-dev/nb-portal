import { redirect } from "next/navigation";
import { auth, resolveMemberProfile } from "@/src/auth";
import { LineRelaySettings } from "./ui/LineRelaySettings";

const officers = new Set(["HEAD", "SUB_HEAD", "ACCOUNTANT"]);

export default async function LineRelayPage() {
    const session = await auth();
    if (!session?.studentId) redirect("/login");
    const permission =
        session.permission ||
        (await resolveMemberProfile(session.studentId)).permission;
    if (!permission || !officers.has(permission)) redirect("/home");

    return <LineRelaySettings />;
}
