import { NextResponse } from 'next/server';
import { chatCompletion, ChatMessage } from '@/lib/aiClient';
import { getProgress, saveMasteredSentence } from '@/lib/db';
import { generateTTS } from '@/lib/ttsService';

export async function POST(req: Request) {
  try {
    const { action, currentSentence, history = [] } = await req.json();
    const progress = await getProgress();

    const systemPrompt = `You are a personalized language tutor. 
Target Language Code: ${progress.targetLanguage}
User Level: ${progress.userLevel}

Your goal is to help the user learn by providing ONE sentence at a time.
Verify user understanding. Adjust difficulty based on feedback.

PROTOCOL:
1. If action is 'init': Output a simple greeting and the first practice sentence in the target language.
2. If action is 'explain': Provide a brief explanation of key vocabulary or grammar in the 'currentSentence' using the target language (simplified).
3. If action is 'translate': Provide the translation of 'currentSentence' in the user's native language (assume English or inference from context).
4. If action is 'understand': The user understood 'currentSentence'. Output a NEW sentence. It can be a variation or a logical follow-up.

RESPONSE FORMAT:
You MUST return a valid JSON object. Do not include markdown formatting (like \`\`\`json).
Structure:
{
  "response": "The content to display to the user (the explanation, translation, or the NEW sentence)",
  "type": "sentence" | "explanation" | "translation",
  "original": "If type is explanation/translation, keep the original sentence here. If type is sentence, put the new sentence here."
}
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      // Filter history to keep context manageable
      ...history.slice(-10).map((h: any) => ({ role: h.role === 'ai' ? 'assistant' : h.role, content: h.content })),
    ];

    let userContent = '';
    if (action === 'init') {
        userContent = 'Start the session.';
    } else if (action === 'explain') {
        userContent = `Explain this sentence: "${currentSentence}"`;
    } else if (action === 'translate') {
        userContent = `Translate this sentence: "${currentSentence}"`;
    } else if (action === 'understand') {
        userContent = `I understand this sentence: "${currentSentence}". Give me the next one.`;
        if (currentSentence) {
            let audioPath: string | undefined;
            try {
                // Determine target language voice based on progress (simple heuristic for now)
                // Defaulting to Korean female for now as per context of "ko". 
                // In a real app, map progress.targetLanguage to specific voiceIds.
                audioPath = await generateTTS(currentSentence, {
                    voiceId: 'audiobook_female_1', // Adjust if needed based on lang
                    speed: 1.0
                });
            } catch (err) {
                console.error("Auto-TTS failed for mastered sentence:", err);
            }

            await saveMasteredSentence({
                id: Date.now().toString(),
                content: currentSentence,
                masteredAt: Date.now(),
                difficultyLevel: 1,
                audioPath
            });
        }
    }

    messages.push({ role: 'user', content: userContent });

    const aiRes = await chatCompletion(messages, {
        temperature: 0.7
    });

    let data;
    try {
        const cleaned = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
        data = JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON parse error", aiRes);
        data = {
            response: aiRes,
            type: 'explanation',
            original: currentSentence
        };
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Learn Chat Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
