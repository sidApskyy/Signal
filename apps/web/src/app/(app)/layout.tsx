import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { Shell } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await currentSession();
  if (!s) redirect("/login");
  return <Shell>{children}</Shell>;
}
