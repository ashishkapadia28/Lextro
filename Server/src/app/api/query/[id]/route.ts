import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { syncUser } from "@/lib/syncUser";

async function getAuthenticatedUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return syncUser(userId);
}

async function getQueryById(queryId: string, userId: string) {
  return prisma.query.findFirst({
    where: { 
      id: queryId,
      userId: userId
    }
  });
}

// GET /api/query/[id] - Get a specific query by ID
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dbUser = await getAuthenticatedUser();
    const queryId = params.id;

    if (!queryId) {
      return NextResponse.json(
        { error: "Query ID is required" },
        { status: 400 }
      );
    }

    const query = await getQueryById(queryId, dbUser.id);
    if (!query) {
      return NextResponse.json(
        { error: "Query not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(query);
  } catch (error) {
    console.error("Error in GET /api/query/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/query/[id] - Delete a specific query by ID
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dbUser = await getAuthenticatedUser();
    const queryId = params.id;

    if (!queryId) {
      return NextResponse.json(
        { error: "Query ID is required" },
        { status: 400 }
      );
    }

    // First verify the query exists and belongs to the user
    const query = await getQueryById(queryId, dbUser.id);
    if (!query) {
      return NextResponse.json(
        { error: "Query not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the query
    await prisma.query.delete({
      where: { id: queryId }
    });

    return NextResponse.json({ success: true, message: "Query deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error in DELETE /api/query/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
