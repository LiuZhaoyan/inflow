// app/api/ai-explain/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// 初始化 OpenAI 客户端，指向 PPInfra 的兼容接口
const client = new OpenAI({
    baseURL: process.env.BASE_URL,
    apiKey: process.env.API_KEY, 
});

// 定义请求体结构
interface RequestBody {
  text: string;
  context: string; // 上下文（前几句话），这对AI理解语境至关重要
  difficulty: "beginner" | "intermediate" | "advanced";
}

export async function POST(request: Request) {
  try {
    const { text, context, difficulty } = await request.json() as RequestBody;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // --- Prompt 工程核心 ---
    // 根据难度调整系统指令 (Comprehensible Input: i+1)
    let systemInstruction = `# Role:You are an expert Language teacher applying Stephen Krashen's Comprehensible Input theory. 
    
    CRITICAL INSTRUCTION: Your explanation MUST be in the SAME LANGUAGE as the target text. 
    - If the text is Korean, explain in Korean.
    - If the text is Japanese, explain in Japanese.
    - If the text is French, explain in French.
    - Do NOT use English unless the target text itself is English.

    Your goal: Explain the selected text to the student using the text's original language.
    Rules:
    1. Detect the language of the target text.
    2. Provide the explanation entirely in that detected language.
    3. Use vocabulary that is slightly simpler than the selected text (i+1 concept).
    4. Focus on the meaning in the specific context provided.
    5. Keep the explanation concise (under 50 words).`;

    if (difficulty === 'beginner') {
      systemInstruction += `
      - Specific Style: Use very simple words (CEFR A1/A2 level). 
      - Use analogies from daily life.
      - Explain it like you are talking to a 10-year-old native speaker of that language.`;
    } else if (difficulty === 'intermediate') {
      systemInstruction += `
      - Specific Style: Use standard language (CEFR B1/B2 level).
      - Focus on synonyms and simple paraphrasing in the target language.`;
    } else if (difficulty === 'advanced') {
      systemInstruction += `
      - Specific Style: You can discuss nuance, tone, or etymology.
      - Treat the user as a near-native speaker of that language.`;
    }

    // 构造用户消息，包含上下文以提高准确度
    const userPrompt = `
    Context (previous sentences): "...${context}..."
    Target Sentence to explain: "${text}"
    
    Please explain the Target Sentence based on the context. 
    IMPORTANT: Write the explanation in the same language as the Target Sentence.
    `;

    // 调用 API
    const completion = await client.chat.completions.create({
      model: "deepseek/deepseek-v3.2", // 或者您平台支持的其他模型名称，如 "gpt-3.5-turbo"
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7, // 稍微有点创造性，但不要太发散
      max_tokens: 150,  // 限制回复长度，保持精简
    });

    const explanation = completion.choices[0]?.message?.content || "Could not generate explanation.";

    return NextResponse.json({ explanation });

  } catch (error: any) {
    console.error('AI API Error:', error);

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'AI Service is busy (Rate Limit). Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch explanation from AI' }, 
      { status: 500 }
    );
  }
}