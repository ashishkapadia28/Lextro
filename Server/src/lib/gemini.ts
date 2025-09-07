// src/lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface GeminiParams {
  problemTitle: string;
  difficulty?: string;
  language: string;
  answerType: 'code' | 'logical_explanation' | 'company_approach';
  explanationLanguage: 'english' | 'hinglish';
}

export async function getGeminiExplanation({
  problemTitle,
  difficulty,
  language,
  answerType,
  explanationLanguage,
}: GeminiParams): Promise<string> {
  try {
    // ✅ Correct model name
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
Please provide a detailed explanation in ${explanationLanguage} for the problem titled "${problemTitle}".
- Programming Language: ${language}
- Difficulty: ${difficulty || "not specified"}
- Answer Type: ${answerType}

Important Instructions:
1. The entire response must be in ${explanationLanguage} (${explanationLanguage === 'hinglish' ? 'Hinglish (a mix of Hindi and English)' : 'English'})
2. For code examples, use ${language} syntax
3. Explain the approach step by step
4. No need to provide full code, just the logic and approach
5. Use simple and clear language
6. If the answer type is 'code', explain the algorithm in detail
7. If the answer type is 'logical_explanation', break down the problem-solving process
8. If the answer type is 'company_approach', explain how this problem might be approached in a technical interview
`;

    const result = await model.generateContent(prompt);
    return result.response.text();  // Gemini v2 style
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Sorry, I couldn't generate an explanation right now. Please try again.";
  }
}
