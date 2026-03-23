
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  async polishMarkdown(content: string) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key 未配置，请在 GitHub Secrets 中设置 API_KEY");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你是一个专业的文案编辑。请润色以下 Markdown 文本，使其逻辑更清晰、表达更专业，但保留原有的格式。请直接返回修改后的 Markdown，不要包含任何额外的解释：\n\n${content}`,
      });
      return response.text || content;
    } catch (error) {
      console.error("AI 润色失败:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
