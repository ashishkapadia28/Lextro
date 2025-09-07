import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getGeminiExplanation } from "@/lib/gemini";
import { syncUser } from "@/lib/syncUser";

// ✅ CREATE (Generate + Save Query)
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ✅ Ensure user exists in DB
    const dbUser = await syncUser(userId);

    const body = await req.json();
    console.log('Raw request body:', JSON.stringify(body, null, 2));
    
    const { 
      problemTitle, 
      difficulty = 'medium', 
      language = 'javascript', 
      answerType = 'code', 
      explanationLanguage = 'english' 
    } = body;

    console.log('Parsed values:', {
      problemTitle,
      difficulty,
      language,
      answerType,
      explanationLanguage
    });

    // Validate required fields
    if (!problemTitle) {
      const error = { error: "Missing required field: problemTitle" };
      console.error('Validation error:', error);
      return NextResponse.json(error, { status: 400 });
    }

    // Validate answer type
    const validAnswerTypes = ['code', 'logical_explanation', 'company_approach'];
    if (!validAnswerTypes.includes(answerType)) {
      return NextResponse.json({
        error: `Invalid answerType. Must be one of: ${validAnswerTypes.join(', ')}`
      }, { status: 400 });
    }

    // Validate language
    const validLanguages = ['english', 'hinglish'];
    if (!validLanguages.includes(explanationLanguage.toLowerCase())) {
      return NextResponse.json({
        error: `Invalid language. Must be one of: ${validLanguages.join(', ')}`
      }, { status: 400 });
    }

    const explanation = await getGeminiExplanation({
      problemTitle,
      difficulty,
      language: language || 'javascript',
      answerType: answerType as 'code' | 'logical_explanation' | 'company_approach',
      explanationLanguage: explanationLanguage.toLowerCase() as 'english' | 'hinglish'
    });

    if (!explanation) {
      return NextResponse.json({ error: "Failed to generate explanation" }, { status: 502 });
    }

    const queryData = {
      userId: dbUser.id,
      problemTitle,
      difficulty,
      language: 'javascript',
      answerType: answerType as 'code' | 'logical_explanation' | 'company_approach',
      explanationLanguage: explanationLanguage as 'english' | 'hinglish',
      explanation,
    };

    console.log('Query data to be saved:', JSON.stringify(queryData, null, 2));

    // Use type assertion to bypass TypeScript type checking temporarily
    const queryRecord = await prisma.query.create({
      data: queryData as any,
    });

    return NextResponse.json({ query: queryRecord });
  } catch (error) {
    console.error("Error in /api/query:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ READ (Get all queries for the logged-in user)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await syncUser(userId);
    
    const queries = await prisma.query.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(queries);
  } catch (error) {
    console.error("Error in GET /api/query:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
