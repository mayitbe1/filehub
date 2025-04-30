from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
import PyPDF2
import docx
from dotenv import load_dotenv

load_dotenv()

print("OPENAI_API_KEY loaded:", os.getenv("OPENAI_API_KEY")[:8], "...")

app = FastAPI()
client = OpenAI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextRequest(BaseModel):
    text: str
    mode: str = "summary"  # optional: "summary", "qa"

def extract_text_from_file(file: UploadFile):
    """Extract text content from different file formats"""
    if file.filename.endswith(".txt"):
        return file.file.read().decode("utf-8")
    elif file.filename.endswith(".pdf"):
        reader = PyPDF2.PdfReader(file.file)
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    elif file.filename.endswith(".docx"):
        doc = docx.Document(file.file)
        return "\n".join(p.text for p in doc.paragraphs)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

@app.post("/analyze-file")
def analyze_file(file: UploadFile = File(...)):
    try:
        content = extract_text_from_file(file)

        if not content.strip():
            raise HTTPException(status_code=400, detail="The uploaded file contains no text.")

        print(f"\n📄 Processing file: {file.filename}")
        print("📝 First 300 characters to be sent to OpenAI:\n", content[:300])

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant specialized in summarizing documents."},
                {"role": "user", "content": f"Please summarize the following content:\n{content[:4000]}"}
            ]
        )

        return {"summary": response.choices[0].message.content}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-text")
def analyze_text(req: TextRequest):
    """Analyze raw text by summarizing or QA mode"""
    if req.mode == "summary":
        prompt = f"Please summarize the following content:\n{req.text[:4000]}"
    elif req.mode == "qa":
        prompt = f"Please answer questions based on the following content:\n{req.text[:4000]}"
    else:
        prompt = req.text[:4000]

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
    )

    return {"result": response.choices[0].message.content}
