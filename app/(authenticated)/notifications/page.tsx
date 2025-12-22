import { auth } from "@/src/auth";
import { NotificationsContent } from "./NotificationsContent";

export default async function NotificationsPage() {
  const session = await auth();
  const userEmail = session?.user?.email || null;

  return <NotificationsContent userEmail={userEmail} />;
}
