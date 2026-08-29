/**
 * AI Service - Unified abstraction for OpenAI, Gemini, and Anthropic
 * Uses raw fetch() — no SDK dependencies required.
 */

// ─── Provider API Callers ───────────────────────────────────────────

async function callOpenAI(apiKey, model, systemPrompt, userPrompt) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 4096
        })
    });
    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        let errMsg;
        try { errMsg = JSON.parse(errBody).error?.message; } catch {}
        throw new Error(errMsg || `OpenAI API error: ${res.status}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
}

async function callGemini(apiKey, model, systemPrompt, userPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096
            }
        })
    });
    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        let errMsg;
        try { errMsg = JSON.parse(errBody).error?.message; } catch {}
        throw new Error(errMsg || `Gemini API error: ${res.status}`);
    }
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
}

async function callAnthropic(apiKey, model, systemPrompt, userPrompt) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        })
    });
    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        let errMsg;
        try { errMsg = JSON.parse(errBody).error?.message; } catch {}
        throw new Error(errMsg || `Anthropic API error: ${res.status}`);
    }
    const data = await res.json();
    return data.content[0].text;
}

// ─── Dispatcher ─────────────────────────────────────────────────────

async function callProvider(provider, apiKey, model, systemPrompt, userPrompt) {
    switch (provider) {
        case 'openai':    return callOpenAI(apiKey, model, systemPrompt, userPrompt);
        case 'gemini':    return callGemini(apiKey, model, systemPrompt, userPrompt);
        case 'anthropic': return callAnthropic(apiKey, model, systemPrompt, userPrompt);
        default: throw new Error(`Unsupported provider: ${provider}`);
    }
}

// ─── Quiz Generation ────────────────────────────────────────────────

function buildQuizPrompt({ topic, numQuestions, questionTypes, difficulty, courseContext }) {
    const types = questionTypes.join(', ');
    return {
        system: `You are an expert quiz generator for educational courses. You MUST respond with valid JSON only — no markdown, no explanation, no wrapping.

Output format: a JSON array of question objects. Each object must have:
- "questionText": string
- "questionType": one of "mcq", "true-false", "short-answer"
- "options": array of 4 strings (for mcq), ["True","False"] (for true-false), or [] (for short-answer)
- "correctAnswer": index number for mcq (0-3), index for true-false (0 or 1), or answer string for short-answer
- "points": number (default 1)

Return ONLY the JSON array. No other text.`,

        user: `Generate ${numQuestions} quiz questions about "${topic}".
Difficulty: ${difficulty}
Question types to include: ${types}
${courseContext ? `Course context: ${courseContext}` : ''}

Remember: respond with ONLY a valid JSON array.`
    };
}

async function generateQuiz(apiKey, provider, model, options) {
    const { system, user } = buildQuizPrompt(options);
    const raw = await callProvider(provider, apiKey, model, system, user);

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = raw.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    // Also try to find array pattern if wrapped in text
    if (!jsonStr.startsWith('[')) {
        const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (arrMatch) jsonStr = arrMatch[0];
    }

    const questions = JSON.parse(jsonStr);

    if (!Array.isArray(questions)) {
        throw new Error('AI did not return a valid questions array');
    }

    // Validate and normalize each question
    return questions.map(q => ({
        questionText: q.questionText || q.question || '',
        questionType: ['mcq', 'true-false', 'short-answer'].includes(q.questionType) ? q.questionType : 'mcq',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer ?? 0,
        points: q.points || 1
    }));
}

// ─── Notes Generation ───────────────────────────────────────────────

function buildNotesPrompt({ topic, style, courseContext }) {
    const styleGuide = {
        'detailed': 'Write comprehensive, well-structured notes with explanations, examples, and key takeaways.',
        'summary': 'Write a concise summary hitting only the most important points.',
        'bullet-points': 'Write organized bullet-point notes with clear headers and sub-points.'
    };

    return {
        system: `You are an expert educational content creator. Generate high-quality study notes in Markdown format. Use proper headings (##, ###), bold key terms, and include examples where relevant.`,
        user: `Create ${style} notes about "${topic}".
${styleGuide[style] || styleGuide['detailed']}
${courseContext ? `Course context: ${courseContext}` : ''}

Write the notes in Markdown format.`
    };
}

async function generateNotes(apiKey, provider, model, options) {
    const { system, user } = buildNotesPrompt(options);
    return callProvider(provider, apiKey, model, system, user);
}

// ─── Chat with Vision Support ──────────────────────────────────────

async function callChat(provider, apiKey, model, systemPrompt, userText, imageData) {
    // imageData: { base64: string, mimeType: string } or null
    if (!imageData) {
        return callProvider(provider, apiKey, model, systemPrompt, userText);
    }

    // Vision path — provider-specific formatting
    switch (provider) {
        case 'openai': {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: [
                            { type: 'text', text: userText },
                            { type: 'image_url', image_url: { url: `data:${imageData.mimeType};base64,${imageData.base64}` } }
                        ]}
                    ],
                    temperature: 0.7,
                    max_tokens: 4096
                })
            });
            if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                let errMsg;
                try { errMsg = JSON.parse(errBody).error?.message; } catch {}
                throw new Error(errMsg || `OpenAI API error: ${res.status}`);
            }
            const data = await res.json();
            return data.choices[0].message.content;
        }
        case 'gemini': {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ parts: [
                        { text: userText },
                        { inlineData: { mimeType: imageData.mimeType, data: imageData.base64 } }
                    ]}],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
                })
            });
            if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                let errMsg;
                try { errMsg = JSON.parse(errBody).error?.message; } catch {}
                throw new Error(errMsg || `Gemini API error: ${res.status}`);
            }
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        }
        case 'anthropic': {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: [
                        { type: 'image', source: { type: 'base64', media_type: imageData.mimeType, data: imageData.base64 } },
                        { type: 'text', text: userText }
                    ]}]
                })
            });
            if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                let errMsg;
                try { errMsg = JSON.parse(errBody).error?.message; } catch {}
                throw new Error(errMsg || `Anthropic API error: ${res.status}`);
            }
            const data = await res.json();
            return data.content[0].text;
        }
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

// ─── Test Connection ────────────────────────────────────────────────

async function testConnection(apiKey, provider, model) {
    const raw = await callProvider(provider, apiKey, model, 'You are a helpful assistant.', 'Say "OK" and nothing else.');
    return raw.trim().toLowerCase().includes('ok');
}

module.exports = { generateQuiz, generateNotes, testConnection, callChat };
