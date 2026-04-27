import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1';
const REQUEST_TIMEOUT_MS = 30000;
if (!API_KEY) {
    console.error('FATAL ERROR: GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
}

const DEFAULT_MODEL_CANDIDATES = [
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
].filter(Boolean);

let cachedModelName = null;

function normalizeModelName(name) {
    return (name || '').replace(/^models\//, '');
}

async function readGeminiError(response) {
    try {
        const errorData = await response.json();
        return { message: JSON.stringify(errorData), errorData };
    } catch (jsonError) {
        try {
            const errorText = await response.text();
            return { message: errorText, errorData: null };
        } catch (textError) {
            return { message: 'Unknown Gemini API error', errorData: null };
        }
    }
}

async function listGenerateContentModels() {
    const response = await fetch(`${API_BASE_URL}/models?key=${API_KEY}`);
    if (!response.ok) {
        const { message } = await readGeminiError(response);
        throw new Error(`Unable to list Gemini models: ${message}`);
    }

    const data = await response.json();
    return (data.models || [])
        .filter((model) =>
            Array.isArray(model.supportedGenerationMethods) &&
            model.supportedGenerationMethods.includes('generateContent')
        )
        .map((model) => normalizeModelName(model.name))
        .filter(Boolean);
}

async function resolveModelName() {
    if (cachedModelName) {
        return cachedModelName;
    }

    try {
        const availableModels = await listGenerateContentModels();
        const preferredModels = DEFAULT_MODEL_CANDIDATES.map(normalizeModelName);

        for (const preferredModel of preferredModels) {
            if (availableModels.includes(preferredModel)) {
                cachedModelName = preferredModel;
                return cachedModelName;
            }
        }

        // Prefer a "flash" model when no preferred model exists.
        const firstFlashModel = availableModels.find((model) => model.includes('flash'));
        cachedModelName = firstFlashModel || availableModels[0] || normalizeModelName(DEFAULT_MODEL_CANDIDATES[0]);
        return cachedModelName;
    } catch (error) {
        console.warn(`Gemini model discovery failed, using fallback model: ${error.message}`);
        cachedModelName = normalizeModelName(DEFAULT_MODEL_CANDIDATES[0]);
        return cachedModelName;
    }
}

async function generateWithModel(modelName, promptText, signal) {
    return fetch(`${API_BASE_URL}/models/${modelName}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: promptText }]
            }]
        }),
        signal
    });
}

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Main Endpoint
app.post('/generate-plan', async (req, res) => {
    try {
        const { age, weight, height, goal, diet, budget, mood, time, habit, language } = req.body;

        // Basic validation for required fields
        if (!age || !weight || !height || !goal || !diet || !budget || !language) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Reconstruct the exact prompt we built for the frontend
        const promptText = `You are an intelligent Indian nutrition assistant.

Generate a smart, practical, budget-conscious diet plan.

IMPORTANT:
- Respond in ${language}
- Keep language simple and natural
- Use Indian food context

User Inputs:
- Age: ${age}
- Weight: ${weight}
- Height: ${height}
- Goal: ${goal}
- Diet: ${diet}
- Budget: ₹${budget}
- Mood: ${mood}
- Time: ${time} minutes
- Habit: ${habit}

Tasks:
1. Calories calculation
2. Smart meal plan
3. Context-based adaptation
4. Cost + nutrition
5. Stay within budget
6. Behavior improvements
7. Smart swaps

Constraints:
- Only Indian foods
- Realistic pricing
- Simple meals

Format clearly with sections.

Output format:

CALORIES:
...

SMART MEAL PLAN:
...

TOTAL NUTRITION:
...

TOTAL COST:
...

BEHAVIOR IMPROVEMENTS:
...

SMART SWAPS:
...`;

        // Setup AbortController for API reliability (timeout after 30s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        let modelName = await resolveModelName();
        let response;

        try {
            // Call Gemini using native fetch (v1 stable endpoint)
            response = await generateWithModel(modelName, promptText, controller.signal);

            // If configured model is unavailable, clear cache and retry once.
            if (!response.ok && response.status === 404) {
                const firstError = await readGeminiError(response);
                const isModelNotFound = firstError.errorData?.error?.status === 'NOT_FOUND';

                if (isModelNotFound) {
                    cachedModelName = null;
                    const fallbackModel = await resolveModelName();
                    if (fallbackModel && fallbackModel !== modelName) {
                        console.warn(`Gemini model "${modelName}" unavailable, retrying with "${fallbackModel}".`);
                        modelName = fallbackModel;
                        response = await generateWithModel(modelName, promptText, controller.signal);
                    } else {
                        throw new Error(`Gemini API error: ${firstError.message}`);
                    }
                } else {
                    throw new Error(`Gemini API error: ${firstError.message}`);
                }
            }
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            const { message } = await readGeminiError(response);
            throw new Error(`Gemini API error: ${message}`);
        }

        const data = await response.json();
        const generatedPlan = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedPlan) {
            throw new Error('Gemini API returned an unexpected response shape.');
        }
        
        // Return exactly what the client expects to parse
        res.json({
            success: true,
            generatedPlan
        });

    } catch (error) {
        console.error('Error generating plan:', error);
        
        // Handle timeout errors specifically
        if (error.name === 'AbortError') {
            return res.status(504).json({ success: false, error: 'Request to Gemini API timed out after 30 seconds' });
        }
        
        res.status(500).json({ success: false, error: 'Failed to generate diet plan' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
});
