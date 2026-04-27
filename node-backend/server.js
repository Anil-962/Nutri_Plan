import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('FATAL ERROR: GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

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
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        // Call Gemini using native fetch
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: promptText }]
                }]
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            let errorMsg = 'Unknown Gemini API error';
            try {
                const errorData = await response.json();
                errorMsg = JSON.stringify(errorData);
            } catch (e) {
                errorMsg = await response.text();
            }
            throw new Error(`Gemini API error: ${errorMsg}`);
        }

        const data = await response.json();
        
        // Return exactly what the client expects to parse
        res.json({
            success: true,
            generatedPlan: data.candidates[0].content.parts[0].text
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
