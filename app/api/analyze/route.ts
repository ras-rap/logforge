import { getLog, updateLogAiAnalysis } from "@/lib/db";
import { generateText } from "@/lib/ai/client";
import { 
  MINECRAFT_ANALYSIS_SYSTEM, 
  getAnalysisPrompt, 
  MINECRAFT_CHAT_SYSTEM, 
  getChatPrompt 
} from "@/lib/ai/prompts/minecraft";

export async function POST(req: Request) {
  try {
    const { id, type, question } = await req.json();

    if (!id) {
      return Response.json({ error: "Missing log ID" }, { status: 400 });
    }

    const log = getLog(id);
    if (!log) {
      return Response.json({ error: "Log not found" }, { status: 404 });
    }

    if (type === "chat") {
      if (!question) {
        return Response.json({ error: "Missing question" }, { status: 400 });
      }
      const answer = await generateText(getChatPrompt(log.content, question), MINECRAFT_CHAT_SYSTEM);
      return Response.json({ answer });
    }

    // Check if we already have it in DB
    if (log.ai_analysis) {
        try {
            return Response.json({ analysis: JSON.parse(log.ai_analysis) });
        } catch (e) {
            // If corrupt, re-generate
        }
    }

    // Default to analysis
    let metadata = {};
    if (log.parsed) {
        try {
            metadata = JSON.parse(log.parsed);
        } catch (e) {}
    }

    const analysisText = await generateText(getAnalysisPrompt(log.content, metadata), MINECRAFT_ANALYSIS_SYSTEM);
    
    // Attempt to extract JSON if AI wrapped it in markdown
    let cleanJson = analysisText;
    if (analysisText.includes("```json")) {
        cleanJson = analysisText.split("```json")[1].split("```")[0].trim();
    } else if (analysisText.includes("```")) {
        cleanJson = analysisText.split("```")[1].split("```")[0].trim();
    }

    const analysis = JSON.parse(cleanJson);
    
    // Save to DB
    updateLogAiAnalysis(id, JSON.stringify(analysis));

    return Response.json({ analysis });
  } catch (error: any) {
    console.error("AI error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
