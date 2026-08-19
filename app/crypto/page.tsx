import { redirect } from "next/navigation"

/** Crypto has no landing screen of its own — Wallets is the entry point. */
export default function Page() {
  redirect("/crypto/wallets")
}
