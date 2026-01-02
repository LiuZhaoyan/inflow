import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { detectLanguageHint, LanguageCode, normalizeLanguageCode } from '@/lib/language';

const client = new OpenAI({
    baseURL: process.env.BASE_URL,
    apiKey: process.env.API_KEY, 
});

interface RequestBody {
  text: string;
  context: string; // 上下文（前几句话），这对AI理解语境至关重要
  difficulty: "beginner" | "intermediate" | "advanced";
  // Optional: force output language (debug / deterministic behavior)
  targetLanguage?: LanguageCode | string;
  // Optional: include extra debug info in response (dev-only recommended)
  debug?: boolean;
}

export async function POST(request: Request) {
  try {
    const { text, context, difficulty, targetLanguage, debug } = await request.json() as RequestBody;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const forced = normalizeLanguageCode(targetLanguage);
    const detected = detectLanguageHint(text);
    const language = forced !== 'auto' ? forced : detected.code;

    // --- Prompt 工程核心 ---
    // 根据难度调整系统指令 (Comprehensible Input: i+1)
    let systemInstruction = `# Role:You are an expert Language teacher applying Stephen Krashen's Comprehensible Input theory. 
    
    Your goal: Explain the selected text to the student using the desired output language.
    Rules:
    1. Use the provided language requirement; do not "guess" a different language.
    2. Provide the explanation entirely in the required language.
    3. Use vocabulary that is slightly simpler than the selected text (i+1 concept).
    4. Focus on the meaning in the specific context provided.
    5. Keep the explanation concise (under 50 words).`;

    if (language && language !== 'auto') {
      systemInstruction += `

      CRITICAL OUTPUT LANGUAGE: Write the explanation ONLY in "${language}".`;
    } else {
      systemInstruction += `

      CRITICAL OUTPUT LANGUAGE: If no language is provided, detect the target text language and reply in that same language.`;
    }

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

    const userPrompt = `
    Context (for understanding only, ignore its language): "...${context}..."
    
    Target Text to explain: "${text}"
    
    TASK: Explain the Target Text based on the context.
    ${language && language !== 'auto'
      ? `CRITICAL: Write the explanation ONLY in "${language}".`
      : `CRITICAL: Detect the language of the Target Text and write your explanation ONLY in that language.`}
    `;

    // High-signal logging for debugging language mismatches.
    // (Avoid logging huge text; keep it short.)
    console.log('[ai-explain] input', {
      difficulty,
      forcedLanguage: forced,
      heuristicLanguage: detected.code,
      heuristicReason: detected.reason,
      textPreview: String(text).slice(0, 160),
      contextPreview: String(context || '').slice(0, 160),
    });

    const completion = await client.chat.completions.create({
      model: "deepseek/deepseek-v3.2",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7, // 稍微有点创造性，但不要太发散
      max_tokens: 150,  // 限制回复长度，保持精简
    });

    const explanation = completion.choices[0]?.message?.content || "Could not generate explanation.";
    console.log('[ai-explain] outputPreview', String(explanation).slice(0, 200));

    const payload: any = { explanation };
    if (debug) {
      payload.debug = {
        forcedLanguage: forced,
        heuristicLanguage: detected.code,
        heuristicReason: detected.reason,
        appliedLanguage: language,
      };
    }

    return NextResponse.json(payload, {
      headers: {
        // Make any caching hypotheses falsifiable.
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });

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