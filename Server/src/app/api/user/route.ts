import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { syncUser } from "@/lib/syncUser";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get Clerk user data
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return new NextResponse("User not found in Clerk", { status: 404 });
    }

    // Use syncUser to ensure user exists in the database
    const user = await syncUser(userId);
    if (!user) {
      return new NextResponse("User not found in database", { status: 404 });
    }

    // Return user data with name from Clerk
    const userData = {
      id: user.id,
      name: clerkUser.firstName || 'User',
      email: user.email,
      // Add any other fields you want to expose
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
