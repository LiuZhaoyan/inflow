import { NextResponse } from 'next/server';
import { chatCompletion, ChatMessage } from '@/lib/aiClient';
import { getProgress, getUserProfile, saveMasteredSentence } from '@/lib/db';
import { generateTTS } from '@/lib/ttsService';

function buildContextMessages(systemPrompt: string, history: any[], limit = 10): ChatMessage[] {
    const safeHistory = Array.isArray(history) ? history : [];
    const filtered: any[] = [];

    for (let i = 0; i < safeHistory.length - 1; i += 1) {
        const current = safeHistory[i];
        const next = safeHistory[i + 1];
        if (current?.content === 'I got it!' && next?.content) {
            filtered.push(next);
        }
    }

    return [
        { role: 'system', content: systemPrompt },
        ...filtered.slice(-limit).map((h: any) => ({
            role: h.role === 'ai' ? 'assistant' : h.role,
            content: h.content
        }))
    ];
}

export async function POST(req: Request) {
  try {
        const { action, currentSentence, history = [], context, messageId } = await req.json();
    const progress = await getProgress();
    const userProfile = await getUserProfile();
    const targetLanguage = userProfile?.targetLanguage || progress.targetLanguage;
    const nativeLanguage = userProfile?.nativeLanguage || 'en';

    const systemPrompt = `You are a personalized language tutor. 
Target Language Code: ${targetLanguage}
User Native Language Code: ${nativeLanguage}
User Level: ${progress.userLevel}
Selected Context: ${context || 'None'}

Your goal is to help the user learn by providing ONE sentence at a time.
Verify user understanding. Adjust difficulty based on feedback.

CONTEXT RULES:
- If Selected Context is not 'None', all sentences and explanations must stay strictly within that context.
- Do not drift to unrelated topics. If unsure, keep it generic but still within the selected context.

PROTOCOL:
1. If action is 'init': Output a simple greeting and the first practice sentence in the target language.
2. If action is 'explain': Provide a brief explanation of key vocabulary or grammar in the 'currentSentence' using the native language.
3. If action is 'translate': Provide the translation of 'currentSentence' in the user's native language.
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

        // Filter history to keep context manageable
        const messages: ChatMessage[] = buildContextMessages(systemPrompt, history, 10);

    let userContent = '';
    if (action === 'init') {
        userContent = context 
            ? `Start the session. The user chose the context: "${context}". Generate a sentence relevant to this context.` 
            : 'Start the session.';
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
                audioPath,
                context,
                messageId
            });
        }
    }

    messages.push({ role: 'user', content: userContent });
    console.log("Learn Chat Messages:", messages);

    const aiRes = await chatCompletion(messages, {
        temperature: 0.7
    });
    console.log("Learn Chat AI Response:", aiRes);

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
