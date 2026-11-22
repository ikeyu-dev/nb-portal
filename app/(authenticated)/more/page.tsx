import { auth, resolveMemberProfile } from "@/src/auth";
import MoreClient from "./MoreClient";

export default async function MorePage() {
    const session = await auth();
    const permission =
        session?.permission ||
        (session?.studentId
            ? (await resolveMemberProfile(session.studentId)).permission
            : null);

    return (
        <MoreClient
            user={session?.user}
            isOfficer={Boolean(
                permission &&
                ["HEAD", "SUB_HEAD", "ACCOUNTANT"].includes(permission)
            )}
            profileImage={session?.profileImage}
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
