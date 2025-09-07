import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function syncUser(clerkUserId: string) {
  try {
    // Get the user data from Clerk
    const authData = await auth();
    
    if (!authData.userId) {
      throw new Error("User not authenticated");
    }

    // Get user data from Clerk
    const response = await fetch(
      `https://api.clerk.com/v1/users/${authData.userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Clerk API error: ${response.statusText}`);
    }

    const clerkUser = await response.json();
    const email = clerkUser?.email_addresses?.[0]?.email_address;

    if (!email) {
      throw new Error("User email not found in Clerk");
    }

    // Upsert: Update if user exists, otherwise create new user
    return await prisma.user.upsert({
      where: { clerkId: clerkUserId },
      update: { email },
      create: {
        clerkId: clerkUserId,
        email,
      },
    });
  } catch (error) {
    console.error("Error in syncUser:", error);
    throw new Error("Failed to sync user with database");
  }
}
