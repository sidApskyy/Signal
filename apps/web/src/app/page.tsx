import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";

export default async function Home() {
  const s = await currentSession();
  redirect(s ? "/overview" : "/login");
}
