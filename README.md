# Chatbot Backend (FastAPI) & React Frontend

This project is a robust, production-ready chatbot system with:
- FastAPI backend for PDF upload, chunking, embedding (Google Gemini 2.0 Flash), vector search, and chat
- MongoDB for vector storage and retrieval
- React frontend with chat UI and admin panel (Netligent branding)
- Environment variable support for all secrets/config
- CORS enabled for frontend integration

## Backend Setup
1. Clone this repo and navigate to the project directory.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up a `.env` file with your MongoDB URI, database name, and Gemini API key:
   ```env
   MONGO_URI=your_mongodb_uri
   DB_NAME=chatbot_db
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

## Endpoints
- `POST /upload_pdf` — Upload a PDF to update chatbot knowledge
- `POST /chat` — Ask a question about the course content
- `GET /pdfs` — List all uploaded PDFs (admin)
- `GET /pdf/{id}` — View PDF details and chunks (admin)
- `DELETE /pdf/{id}` — Delete a PDF and its data (admin)

## Frontend Setup
1. Navigate to the `frontend` directory:
   ```cmd
   cd frontend
   ```
2. Install dependencies:
   ```cmd
   npm install
   ```
3. Set the backend API base URL in `frontend/.env`:
   ```env
   REACT_APP_API_BASE_URL=http://localhost:8000
   ```
4. Start the React app:
   ```cmd
   npm start
   ```

## Features
- Chat UI with Netligent branding and logo
- Admin panel: upload, view, and delete PDFs; view PDF chunks
- Robust error handling and logging
- All secrets/configuration via environment variables

---

For workspace-specific Copilot instructions, see `.github/copilot-instructions.md`.
