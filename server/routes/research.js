const express = require('express');
const router = express.Router();

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

router.post('/', async (req, res) => {
    try {
        const { message, context, openRouterApiKey, openRouterModel } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Process.env mapping fallback
        const apiKey = openRouterApiKey || process.env.OPENROUTER_API_KEY;
        const model = openRouterModel || process.env.OPENROUTER_MODEL || 'stepfun/step-3.5-flash:free';

        if (!apiKey) {
            return res.status(500).json({ error: 'OpenRouter API Key must be configured in settings or environment' });
        }

        let contextStr = JSON.stringify(context || {});
        const maxChars = 20000;
        if (contextStr.length > maxChars) {
            contextStr = contextStr.substring(0, maxChars) + '... [truncated]';
        }

        const systemPrompt = `Analyze the given information and answer the user.
Don't Start with "Based on the provided research context, here is a synthesized answer to your question about" Or anything similar to that.`;

        const payload = {
            model: model,
            stream: true,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'system', content: 'Here is the research context (Google + YouTube + transcripts): ' + contextStr },
                { role: 'user', content: message }
            ],
        };

        // Use native fetch (available in Node 18+)
        const response = await fetch(OPENROUTER_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[openrouter] HTTP ${response.status}: ${errorText}`);
            return res.status(response.status).json({ error: errorText });
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;

                const dataStr = trimmed.slice(5).trim();
                if (dataStr === '[DONE]') {
                    res.end();
                    return;
                }

                try {
                    const parsed = JSON.parse(dataStr);
                    const choices = parsed.choices || [];
                    if (choices.length === 0) continue;

                    const delta = choices[0].delta || {};
                    const content = delta.content;
                    if (content) {
                        res.write(content);
                    }
                } catch (err) {
                    // Skip invalid JSON
                }
            }
        }
        res.end();
    } catch (error) {
        console.error('Research error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Research failed' });
        } else {
            res.end();
        }
    }
});

module.exports = router;
