import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  const problemTitle = "";
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-3xl font-bold">🚀 Welcome to Lextro AI</h1>

      <SignedOut>
        <div className="flex gap-4">
          <SignInButton>Sign In</SignInButton>
          <SignUpButton>Sign Up</SignUpButton>
        </div>
      </SignedOut>

      <SignedIn>
        <UserButton />
        <Sidebar problemTitle={problemTitle} />
      </SignedIn>
    </main>
  );
}
