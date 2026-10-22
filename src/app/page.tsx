import { redirect } from "next/navigation";
import { firstTabSlug } from "@/config/tabs";

export default function HomePage() {
  redirect(`/tv/${firstTabSlug}`);
}
