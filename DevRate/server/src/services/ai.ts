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
        
        **Recent PR Activity (Sample)**:
        ${prSummaries.slice(0, 3).join('\n---\n')}
        
        **Recent Commit Logs (Sample)**:
        ${commitLogs.slice(0, 20).join('\n')}
        
        **Task**:
        1. Evaluate the "Engineering Quality Multiplier" (0.8 = Amateur/Spam, 1.0 = Average, 1.2 = Exceptional).
        2. Assign a "Persona Title" (e.g., "The Architect", "The Bug Slayer", "The Spammer", "The Full-Stack Weaver").
        3. Write a 2-sentence summary of their style.
        4. **Commit Quality Score (0-15)**: Evaluate the commit messages. 
           - Do they follow standards (Conventional Commits e.g. feat:, fix:)? 
           - Are they atomic and descriptive?
           - Or are they chaotic ("fix", "stuff", "update")?
           - Return an integer from 0 to 15.
        
        **Output JSON only**:
        {
            "multiplier": 1.05,
            "persona": "The Code Craftsperson",
            "summary": "Writes clean, atomic commits but lacks impact in major repos.",
            "commitScore": 12
        }
        `;

        // logger is imported at top
        logger.info("Sending Prompt to AI", { model: "gemini-2.5-flash", username });
        logger.debug("AI Prompt Content", { promptShort: prompt.trim().replace(/\s+/g, ' ').substring(0, 70) });

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
