import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Authentication - scrumboard",
  description: "Login or register for scrumboard",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
