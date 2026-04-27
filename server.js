import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Critical startup check: Ensure Gemini API key is available
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('FATAL ERROR: GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing (CORS) and JSON body parsing
app.use(cors());
app.use(express.json());

/**
 * POST /generate-plan
 * Receives user nutrition profile and returns a structured AI-generated diet plan.
 */
app.post('/generate-plan', async (req, res) => {
    try {
        // 1. INPUT HANDLING: Extract user metrics and lifestyle context from request body
        const { age, weight, height, goal, diet, budget, mood, time, habit, language } = req.body;

        // Validation: Ensure all core fields are provided
        if (!age || !weight || !height || !goal || !diet || !budget || !language) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // 2. PROMPT CONSTRUCTION: Build the structured prompt for Gemini
        const promptText = `You are an intelligent Indian nutrition assistant.
Respond in ${language}. Keep it natural and simple.

User Inputs:
- Age: ${age}, Weight: ${weight}, Height: ${height}
- Goal: ${goal}, Diet: ${diet}, Budget: ₹${budget}
- Mood: ${mood}, Time: ${time}m, Habit: ${habit}

Output format:
CALORIES: ...
SMART MEAL PLAN: ...
TOTAL NUTRITION: ...
TOTAL COST: ...
BEHAVIOR IMPROVEMENTS: ...
SMART SWAPS: ...`;

        // 3. GEMINI API CALL: Communicate with Google's Generative AI
        // Using stable v1 endpoint for reliability
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        // 4. RESPONSE HANDLING: Parse and validate AI output
        const data = await response.json();
        
        // Handle API-level errors (invalid keys, quota exceeded, etc.)
        if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini API Error');
        }

        // Successfully return the generated text to the frontend
        res.json({
            success: true,
            generatedPlan: data.candidates[0].content.parts[0].text
        });

    } catch (error) {
        // Detailed error logging for backend debugging
        console.error('Plan Generation Error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to generate diet plan' });
    }
});

// Basic health check for cloud platform monitoring
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Start the server on all interfaces (0.0.0.0) for Docker compatibility
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening at http://0.0.0.0:${PORT}`);
});
