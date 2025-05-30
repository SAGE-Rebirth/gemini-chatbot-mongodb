import os
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from dotenv import load_dotenv
from colorama import Fore, Style, init as colorama_init
import google.generativeai as genai
from pydantic import BaseModel
from typing import List
from fastapi.responses import JSONResponse
from bson import ObjectId
from datetime import datetime

# Initialize colorama
colorama_init(autoreset=True)

class ColorFormatter(logging.Formatter):
    COLORS = {
        logging.DEBUG: Fore.CYAN,
        logging.INFO: Fore.GREEN,
        logging.WARNING: Fore.YELLOW,
        logging.ERROR: Fore.RED,
        logging.CRITICAL: Fore.MAGENTA + Style.BRIGHT,
    }
    def format(self, record):
        color = self.COLORS.get(record.levelno, "")
        message = super().format(record)
        return f"{color}{message}{Style.RESET_ALL}"

handler = logging.StreamHandler()
handler.setFormatter(ColorFormatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s'))
logging.basicConfig(level=logging.INFO, handlers=[handler])
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "chatbot_db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "pdf_chunks")  # Collection for storing PDF chunks and embeddings
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_EMBEDDING_URL = os.getenv("GEMINI_EMBEDDING_URL", "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent")
GEMINI_CHAT_URL = os.getenv("GEMINI_CHAT_URL", "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-latest:generateContent")

# Initialize Gemini SDK
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY is not set. Embedding and chat features will not work.")

# MongoDB client with error handling
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.server_info()  # Force connection on a request as the
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    logger.info(f"Connected to MongoDB at {MONGO_URI}, DB: {DB_NAME}, Collection: {COLLECTION_NAME}")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    raise RuntimeError(f"Failed to connect to MongoDB: {e}")

app = FastAPI()

# CORS setup (allow React frontend to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str

def get_embedding(text: str) -> List[float]:
    """Get embedding vector for a text chunk using Gemini embedding API via google-generativeai SDK."""
    try:
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_document"
        )
        embedding = result.get("embedding")
        if not embedding or not isinstance(embedding, list):
            logger.error(f"No valid embedding returned for text chunk. Result: {result}")
            raise ValueError("No valid embedding returned from Gemini API.")
        return embedding
    except Exception as e:
        logger.error(f"Failed to get embedding: {e}")
        raise

def cosine_similarity(vec1, vec2):
    import numpy as np
    v1, v2 = np.array(vec1), np.array(vec2)
    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))

def serialize_doc(doc):
    return {
        "_id": str(doc.get("_id")),
        "filename": doc.get("filename"),
        "upload_date": doc.get("upload_date")
    }

@app.get("/")
def root():
    return {"message": "Chatbot backend is running."}

@app.get("/pdfs")
def list_pdfs():
    try:
        # Group by filename, get first chunk's _id and upload_date
        pipeline = [
            {"$sort": {"_id": 1}},
            {"$group": {
                "_id": "$filename",
                "first_id": {"$first": "$_id"},
                "upload_date": {"$first": "$upload_date"}
            }}
        ]
        pdfs = list(collection.aggregate(pipeline))
        return [
            {"_id": str(pdf["first_id"]), "filename": pdf["_id"], "upload_date": pdf.get("upload_date")}
            for pdf in pdfs
        ]
    except Exception as e:
        logger.error(f"Error listing PDFs: {e}")
        return JSONResponse(status_code=500, content={"detail": "Failed to list PDFs."})

@app.get("/pdf/{pdf_id}")
def get_pdf_data(pdf_id: str):
    try:
        doc = collection.find_one({"_id": ObjectId(pdf_id)})
        if not doc:
            return JSONResponse(status_code=404, content={"detail": "PDF not found."})
        # Return all chunks for this filename
        chunks = list(collection.find({"filename": doc["filename"]}, {"text": 1, "chunk_index": 1}))
        return {
            "filename": doc["filename"],
            "chunks": sorted([{ "chunk_index": c["chunk_index"], "text": c["text"] } for c in chunks], key=lambda x: x["chunk_index"])
        }
    except Exception as e:
        logger.error(f"Error getting PDF data: {e}")
        return JSONResponse(status_code=500, content={"detail": "Failed to get PDF data."})

@app.delete("/pdf/{pdf_id}")
def delete_pdf(pdf_id: str):
    try:
        doc = collection.find_one({"_id": ObjectId(pdf_id)})
        if not doc:
            return JSONResponse(status_code=404, content={"detail": "PDF not found."})
        result = collection.delete_many({"filename": doc["filename"]})
        return {"status": "success", "deleted_count": result.deleted_count}
    except Exception as e:
        logger.error(f"Error deleting PDF: {e}")
        return JSONResponse(status_code=500, content={"detail": "Failed to delete PDF."})

@app.post("/upload_pdf")
async def upload_pdf(file: UploadFile = File(...)):
    import fitz  # PyMuPDF
    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        if not text.strip():
            logger.warning("No text extracted from PDF.")
            raise HTTPException(status_code=400, detail="No text found in PDF.")
        chunks = [chunk.strip() for chunk in text.split("\n\n") if chunk.strip()]
        if not chunks:
            logger.warning("No valid text chunks found in PDF.")
            raise HTTPException(status_code=400, detail="No valid text chunks found in PDF.")
        inserted = []
        upload_date = datetime.utcnow().isoformat()
        for idx, chunk in enumerate(chunks):
            try:
                embedding = get_embedding(chunk)
            except Exception as e:
                logger.error(f"Skipping chunk {idx} due to embedding error: {e}")
                continue
            doc_id = collection.insert_one({
                "filename": file.filename,
                "chunk_index": idx,
                "text": chunk,
                "embedding": embedding,
                "upload_date": upload_date
            }).inserted_id
            inserted.append(str(doc_id))
        if not inserted:
            logger.error("No chunks were stored due to embedding errors.")
            raise HTTPException(status_code=500, detail="No chunks were stored due to embedding errors.")
        logger.info(f"PDF '{file.filename}' processed: {len(inserted)} chunks stored with embeddings.")
        return {"status": "success", "chunks_stored": len(inserted), "ids": inserted}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to process PDF.")

@app.post("/chat")
async def chat(request: ChatRequest):
    query = request.query.strip()
    if not query:
        logger.warning("Empty query received in chat endpoint.")
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    logger.info(f"Received chat query: {query}")
    try:
        query_embedding = get_embedding(query)
        docs = list(collection.find({}, {"text": 1, "embedding": 1}))
        scored = []
        for doc in docs:
            if "embedding" in doc and isinstance(doc["embedding"], list):
                try:
                    sim = cosine_similarity(query_embedding, doc["embedding"])
                    scored.append((sim, doc["text"]))
                except Exception as e:
                    logger.warning(f"Skipping doc due to similarity error: {e}")
        if not scored:
            logger.warning("No relevant context found for query.")
            raise HTTPException(status_code=404, detail="No relevant context found.")
        scored.sort(reverse=True)
        top_chunks = [text for _, text in scored[:3]]
        context = "\n".join(top_chunks)
        chat_model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"Context:\n{context}\n\nQuestion: {query}\nAnswer:"
        response = chat_model.generate_content(prompt)
        answer = getattr(response, 'text', None) or str(response)
        if not answer or not answer.strip():
            logger.warning("Gemini returned an empty answer.")
            raise HTTPException(status_code=502, detail="Gemini returned an empty answer.")
        logger.info("Chat answer generated successfully.")
        return {"answer": answer.strip()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate answer.")
