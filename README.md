# Chatbot Backend (FastAPI)

This project is a scalable, robust backend for a chatbot that:
- Accepts PDF uploads (admin panel)
- Extracts and stores course content as vector embeddings in MongoDB
- Answers user queries using Gemini 2.0 Flash (Google AI Studio) based on uploaded PDF content
- Designed for integration with a React frontend

## Features
- FastAPI for high-performance APIs
- MongoDB for vector storage and retrieval
- PDF text extraction
- Environment variable support for secrets/config
- CORS enabled for frontend integration

## Setup
1. Clone this repo and navigate to the project directory.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up a `.env` file with your MongoDB URI and database name:
   ```env
   MONGO_URI=your_mongodb_uri
   DB_NAME=chatbot_db
   ```
4. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

## Endpoints
- `POST /upload_pdf` — Upload a PDF to update chatbot knowledge
- `POST /chat` — Ask a question about the course content

## Next Steps
- Implement PDF extraction, embedding, and Gemini 2.0 Flash integration
- Build the React frontend for chat and admin panel

---

For workspace-specific Copilot instructions, see `.github/copilot-instructions.md`.
