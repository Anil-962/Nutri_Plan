# NutriPlan

NutriPlan is a personalized, AI-powered 7-day meal planner. It calculates your daily calorie targets using the Mifflin-St Jeor equation and leverages the Gemini AI to generate custom, macro-balanced diets tailored to your specific constraints. 

It also features a built-in **Smart Coach**, an AI dietitian that can answer your questions about your generated plan in real-time.

## Features
- **Personalized Nutrition**: Calculates precise BMR and TDEE based on your profile.
- **AI Diet Generation**: Generates full 7-day plans respecting your dietary preferences and restrictions.
- **Smart Coach Chat**: A context-aware chat panel to ask questions and get advice on your specific meal plan.
- **Visual Macros**: Interactive progress bars showing daily calories and protein against targets.
- **PDF Export**: Easily save your diet plan to your device with one click.
- **Clean Architecture**: Built on React + Vite for the frontend and FastAPI for the backend.

## Quick Start (Docker)

You can easily deploy NutriPlan using the included multi-stage Dockerfile.

1. Create a `.env` file in the `backend/` directory with your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   ```

2. Build the Docker image from the root directory:
   ```bash
   docker build -t nutriplan .
   ```

3. Run the container:
   ```bash
   docker run -p 8000:8000 --env-file backend/.env nutriplan
   ```

4. Open `http://localhost:8000` in your browser.

## Local Development Setup

If you prefer to run the components separately for development:

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
# Ensure you have .env with GEMINI_API_KEY
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Health
To check the server status, visit `/health`.
