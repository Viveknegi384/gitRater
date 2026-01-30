import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIResult } from '../types';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const analyzeProfile = async (
    username: string, 
    prSummaries: string[], 
    commitLogs: string[]
): Promise<AIResult> => {
    logger.info(`Starting AI Analysis`, { username, prCount: prSummaries.length, commitCount: commitLogs.length });
    
    if (!process.env.GEMINI_API_KEY) {
        console.warn("No GEMINI_API_KEY found. Returning default neutral score.");
        return { multiplier: 1.0, persona: "The Unknown Dev", summary: "AI Analysis unavailable.", commitScore: 10 };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const prompt = `
        You are a Senior Engineering Manager evaluating a developer profile.
        
        **Developer**: ${username}
        
        **Pull Request Quality Analysis**:
        ${prSummaries.join('\n\n---\n\n')}
        
        **Commit Message Quality**:
        ${commitLogs.slice(0, 20).join('\n')}
        
        **Evaluation Criteria**:
        
        1. **Engineering Quality Multiplier (0.8 - 1.2)**:
           - 1.2 = Exceptional: Large PRs with thorough reviews, addresses complex problems, significant impact
           - 1.1 = Above Average: Well-reviewed PRs, clean code, good practices
           - 1.0 = Average: Standard contributions, some reviews
           - 0.9 = Below Average: Small changes, minimal review engagement
           - 0.8 = Amateur: Trivial changes, poor quality
        
        2. **Commit Quality Score (0-15)**:
           - 13-15: Excellent - Follows conventions (feat:, fix:), atomic, descriptive
           - 10-12: Good - Mostly clear, some conventions
           - 7-9: Average - Basic descriptions, inconsistent
           - 4-6: Poor - Vague messages ("fix", "update")
           - 0-3: Very Poor - Meaningless or spam
        
        3. **Persona**: Choose from:
           - "The Architect" (designs systems)
           - "The Bug Slayer" (fixes critical issues)
           - "The Performance Wizard" (optimization expert)
           - "The Full-Stack Virtuoso" (versatile contributor)
           - "The Open Source Champion" (community builder)
           - "The Code Reviewer" (thorough reviews)
           - "The Feature Builder" (ships new features)
           - "The Pragmatist" (gets things done)
        
        4. **Summary**: 2 sentences about coding style, PR quality, and impact.
        
        **Output JSON only**:
        {
            "multiplier": 1.05,
            "persona": "The Code Craftsperson",
            "summary": "Writes clean, well-reviewed PRs with thoughtful changes. Commits follow conventions and show attention to detail.",
            "commitScore": 12
        }
        `;

        // logger is imported at top
        logger.info("Sending Prompt to AI", { model: "gemini-2.5-flash", username });
        logger.debug("AI Prompt Content", { promptShort: prompt.trim().replace(/\s+/g, ' ').substring(0, 70) });
        
        // Debug: Log what we're sending to AI
        console.log("\n=== AI ANALYSIS DEBUG ===");
        console.log(`\n📝 PRs with reviews (${prSummaries.length}):`);
        if (prSummaries.length === 0) {
            console.log("  ⚠️  NO PRS FOUND");
        } else {
            prSummaries.forEach((pr, i) => {
                console.log(`\n--- PR ${i+1} ---`);
                console.log(pr);
            });
        }
        
        console.log(`\n💬 Commit logs (${commitLogs.length}):`);
        if (commitLogs.length === 0) {
            console.log("  ⚠️  NO COMMITS FOUND");
        } else {
            commitLogs.forEach((commit, i) => {
                console.log(`  ${i+1}. ${commit}`);
            });
        }
        console.log("\n========================\n");

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        logger.info("Received AI Response", { length: text.length });
        
        // Clean JSON formatting (Gemini sometimes adds backticks)
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(cleanText) as AIResult;

    } catch (error: any) {
        if (error?.message?.includes('API_KEY')) {
            console.warn("⚠️  AI Service Warning: Invalid or Suspended API Key. Using Default Score.");
        } else if (error?.status === 403) {
            console.warn("⚠️  AI Service Warning: Access Denied (403). Using Default Score.");
        } else {
            console.warn("⚠️  AI Service Warning: Failed to generate content. Using Default Score.");
            console.error("DEBUG ERROR DETAILS:", error); // Uncommented for debugging
        }
        
        return { 
            multiplier: 1.0, 
            persona: "The Pragmatist", 
            summary: "AI Analysis unavailable (Service Offline).", 
            commitScore: 10 // Neutral score
        };
    }
};
