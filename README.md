EMERGENCY DISPATCH SYSTEM
ENVIRONMENTAL ALERT DASHBOARD

Developer:
 Chaitanya Pandey
 Himanshu Yadav
 Aryan Sahu
 Harsh Shukla


Status: B.Tech CS, Semester 4
Institution: UIT Naini (AKTU)

---

PROJECT OVERVIEW
This is a professional React application.
It provides automated safety alerts.
The system analyzes real-time data.
It monitors AQI and weather hazards.
It assists campus security and residents.

CORE FEATURES

1. SMART ALERT ENGINE
The system uses priority logic.
It drafts messages automatically.
AQI Level 4 triggers pollution warnings.
Heat is flagged above 40 degrees Celsius.
Rain triggers logistics precautions.

2. GITHUB DATABASE SYNC
This project uses the GitHub REST API.
It functions as a cloud database.
The app fetches a contacts JSON file.
It updates the file using Base64 encoding.
This ensures data remains persistent.

3. EDITABLE VARIABLES
Dispatchers can edit all messages.
Users can override AI suggestions.
They can change threat levels manually.
The advice text is fully customizable.
This allows for personalized alerts.

TECHNICAL ARCHITECTURE

FRONTEND TOOLS
React.js with Vite.
Functional components and Hooks.
Glassmorphism UI design.

API INTEGRATIONS
OpenWeatherMap for weather data.
OpenWeatherMap for air pollution.
GitHub API for data storage.
EmailJS for client-side dispatch.

SYSTEM WORKFLOW

DATA COLLECTION
App fetches Prayagraj data by default.
It calculates specific threat levels.

USER VERIFICATION
The dispatcher reviews the variables.
Changes are made to the message text.

DATABASE UPDATE
New contacts are added to the list.
User clicks Push to sync with GitHub.

ALERT DISPATCH
Recipients are selected from the list.
Final alerts are sent via EmailJS.


FUTURE SCOPE AND SCALABILITY
LOCAL AI INTEGRATION
The next phase involves moving away from APIs.
The system will use local open-source models.
Target models include DeepSeek or Qwen-2.5.
This ensures 100 percent data privacy.
No sensitive information will leave the server.

ZERO HALLUCINATION ARCHITECTURE
The goal is to reach 99 percent accuracy.
We will replace guessing with grounding.
The system will use a RAG architecture.
RAG stands for Retrieval-Augmented Generation.
This forces the AI to check facts first.

KNOWLEDGE-REFINED DATA
The model will be fine-tuned on local data.
It will learn specific UIT Naini protocols.
It will understand local Prayagraj geography.
Refined data acts as the primary knowledge source.
This eliminates the risk of AI hallucinations.

TECHNICAL RELIABILITY FORMULA
The system follows a strict mathematical logic.
Reliability equals Base Model plus Fine-Tuning.
This sum is then multiplied by RAG Grounding.
If data is missing, the AI says I do not know.
This prevents the AI from creating false advice.

ADVANCED PERSONALIZATION
Future updates will include academic schedules.
Alerts will sync with student lecture timings.
The AI will use CS-specific coding metaphors.
This makes the safety alerts highly engaging.
It turns a utility into a smart campus assistant.

---

SETUP INSTRUCTIONS

1. Clone the repository from GitHub.
2. Run npm install for dependencies.
3. Configure your .env file locally.
4. Use VITE prefix for all API keys.
5. Run npm run dev to start the app.