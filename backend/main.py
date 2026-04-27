import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="NutriPlan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY", "AIzaSyD8ZWtA7iRHpLAejgz19MyQ2_2yyX9NcH8")
if api_key:
    genai.configure(api_key=api_key)

class UserProfile(BaseModel):
    name: str
    age: int
    gender: str # "Male", "Female"
    weight: float # kg
    height: float # cm
    activity_level: str # "Sedentary", "Moderate", "Active"
    dietary_goal: str # "Lose Weight", "Maintain", "Gain Muscle"
    dietary_type: str # "Omnivore", "Vegetarian", "Vegan", "Keto"
    dietary_restrictions: str = "" # e.g. "no dairy, gluten-free"

def calculate_nutrition(profile: UserProfile):
    # Mifflin-St Jeor Equation
    if profile.gender.lower() == 'male':
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
    else:
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
        
    # Activity Multiplier
    activity_multipliers = {
        "sedentary": 1.2,
        "moderate": 1.55,
        "active": 1.725
    }
    tdee = bmr * activity_multipliers.get(profile.activity_level.lower(), 1.2)
    
    # Goal Multiplier
    if profile.dietary_goal.lower() == "lose weight":
        target_calories = tdee - 500
    elif profile.dietary_goal.lower() == "gain muscle":
        target_calories = tdee + 300
    else:
        target_calories = tdee
        
    # Macros
    # Protein: 2g/kg roughly, or percent based. Let's do percent based depending on goal.
    protein_calories = target_calories * 0.3
    if profile.dietary_goal.lower() == "gain muscle":
        protein_calories = target_calories * 0.35
    
    fat_calories = target_calories * 0.25
    if profile.dietary_type.lower() == "keto":
        fat_calories = target_calories * 0.70
        protein_calories = target_calories * 0.20
        
    carb_calories = target_calories - protein_calories - fat_calories
    
    return {
        "target_calories": round(target_calories),
        "macros": {
            "protein_g": round(protein_calories / 4),
            "carbs_g": round(carb_calories / 4),
            "fat_g": round(fat_calories / 9)
        }
    }

@app.post("/api/generate_plan")
async def generate_plan(profile: UserProfile):
    nutrition = calculate_nutrition(profile)
    
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")
        
    prompt = f"""
    You are an expert nutritionist. Generate a 7-day meal plan for the following profile:
    - Diet: {profile.dietary_type}
    - Goal: {profile.dietary_goal}
    - Dietary Restrictions: {profile.dietary_restrictions if profile.dietary_restrictions else 'None'}
    - Daily Target Calories: {nutrition['target_calories']} kcal
    - Macros: Protein {nutrition['macros']['protein_g']}g, Carbs {nutrition['macros']['carbs_g']}g, Fat {nutrition['macros']['fat_g']}g
    
    Respond STRICTLY with valid JSON matching this schema:
    [
      {{
        "day": 1,
        "meals": [
          {{"type": "Breakfast", "name": "...", "calories": 400, "prep": "..."}},
          {{"type": "Lunch", "name": "...", "calories": 500, "prep": "..."}},
          {{"type": "Dinner", "name": "...", "calories": 600, "prep": "..."}},
          {{"type": "Snack", "name": "...", "calories": 200, "prep": "..."}}
        ],
        "total_calories": 1700,
        "daily_macros": {{"protein_g": 120, "carbs_g": 150, "fat_g": 60}}
      }},
      ... (for 7 days)
    ]
    Do not include markdown blocks like ```json.
    """
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        meal_plan = json.loads(text)
        return {
            "nutrition": nutrition,
            "meal_plan": meal_plan
        }
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

class ChatMessage(BaseModel):
    role: str # "user" or "model"
    text: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: str

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")
        
    system_prompt = f"""You are a certified dietitian. Give precise, practical, and empathetic nutrition advice based on the user's diet plan.
    
    Context about the user and their plan:
    {req.context}
    """
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=system_prompt)
        
        # Convert messages to Gemini format
        history = []
        for msg in req.messages[:-1]: # All but the last one
            history.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [msg.text]
            })
            
        chat = model.start_chat(history=history)
        
        last_msg = req.messages[-1].text
        response = chat.send_message(last_msg)
        
        return {"response": response.text}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "OK"}

# Serve frontend static files
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_path, "assets")), name="assets")
    
    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        file_path = os.path.join(static_path, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_path, "index.html"))
