import { auth } from "@/src/auth";
import { NotificationsContent } from "./NotificationsContent";

export default async function NotificationsPage() {
    const session = await auth();
    const studentId = session?.studentId;

    return <NotificationsContent studentId={studentId} />;
}
