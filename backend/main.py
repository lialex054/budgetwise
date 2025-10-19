# backend / main.py

import csv
import io
from datetime import datetime
from typing import List

from fastapi import FastAPI, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import ValidationError

# Created Components
import models
import schemas
from database import SessionLocal, engine

# Allow CORS for local development
from fastapi.middleware.cors import CORSMiddleware

# Gemini Import
import google.generativeai as genai

# Create the database tables
models.Base.metadata.create_all(bind=engine)

# Initialise FastAPI app
app = FastAPI()

# --- CORS middleware setup ---
origin = [
    "http://localhost",
    "http://localhost:5173", # Default port for Vite development server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origin,
    allow_credentials=True,
    allow_methods=["*"], # allow all methods
    allow_headers=["*"], # allow all headers
)

# --- DEPENDENCY ---
# This function provides a database session to the API endpoints.
# It ensures that the database session is always closed after the request is finished.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- API KEY ---
GEMINI_API_KEY = "AIzaSyCpM_uC_F4MLuObZ85yJRu6Y8DvLazbfrE"
genai.configure(api_key=GEMINI_API_KEY)

# --- API ENDPOINT ---

# Update transcation category
@app.patch("/tansactions/{transaction_id}", response_model = schemas.Transaction)
def update_transaction_category(
    transaction_id: int,
    transaction_update: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
):
    # Find transaction in the DB
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update category and commit change
    db_transaction.category = transaction_update.category
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

# Endpoint for AI Chat
@app.post("/chat/", response_model=schemas.ChatResponse)
async def chat_with_ai(chat_request: schemas.ChatRequest, db: Session = Depends(get_db)):

    question = chat_request.question.lower()

    # SQL Query if known request
    if "spend most" in question or "highest spending" in question:
        try:
            # This query finds the category with the highest total spend
            result = db.query(
                models.Transaction.category,
                func.sum(models.Transaction.amount).label("total_spend")
            ).group_by(
                models.Transaction.category
            ).order_by(
                func.sum(models.Transaction.amount).desc()
            ).first()

            if result:
                category, total_spend = result
                response_text = f"Your highest spending was £{total_spend:.2f} in the '{category}' category."
            else:
                response_text = "I couldn't find any spending data to analyse."

            return {"response": response_text}
        
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing SQL query: {str(e)}")
        

    # 2: LLM Fallback for conversational questions
    else:

        # Fetch recent transaction to provide context
        recent_transactions = db.query(models.Transaction).order_by(models.Transaction.date.desc()).limit(100).all()

        # Format data into simple string for prompt.
        transaction_list_str = "\n".join(
            [f"- Date: {t.date}, Merchant: {t.merchant_name}, Amount: £{t.amount}, Category: {t.category}" for t in recent_transactions]
        )

        # Construct prompt
        prompt = f"""
        You are a friendly and helpful financial assistant called BudgetWise.
        Analyze the following list of transactions to answer the user's question.
        Provide a concise, conversational answer.

        Here are the user's recent transactions:
        {transaction_list_str}

        User's question: "{chat_request.question}"
        """

        # Then, call GEMINI API
        try:
            model = genai.GenerativeModel("gemini-2.5-flash-lite")
            response = await model.generate_content_async(prompt)
            return {"response": response.text}
        
        except HTTPException as e:
            raise HTTPException(status_code=500, detail=f"Error communicating with AI service: {str(e)}")

@app.get("/transactions/", response_model=List[schemas.Transaction])
def get_transactions(db: Session = Depends(get_db)):
    '''
    Retrieve all transactions from the database, ordered by most recent date.
    '''
    transactions = db.query(models.Transaction).order_by(models.Transaction.date.desc()).all()
    return transactions

@app.post("/upload/")
async def upload_csv(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    # Ensure uploaded file is a CSV
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail=
                            "Invalid file type. Please upload a CSV.")
    
    # Read file content directly from memory
    contents = await file.read()
    file_data = io.StringIO(contents.decode("utf-8"))
    csv_reader = csv.DictReader(file_data)

    valid_transactions = []
    skipped_rows = []

    # Iterate through each row of our CSV
    for i, row in enumerate(csv_reader, start=2): # Start at 2 to account for header row
        try:
            # Pydantic automatically handles date parsing from string
            transaction_data = schemas.TransactionCreate(**row)

            # Convert Pydantic schema to SQLAlchemy model
            db_transaction = models.Transaction(**transaction_data.dict())
            valid_transactions.append(db_transaction)

        except ValidationError as e:
            # if row is malformed, log and continue
            skipped_rows.append({"row": i , "errors": e.errors()})

        except Exception as e:
            # catch any other unexpected errors
            skipped_rows.append({"row": i , "errors": str(e)})

    # Add all valid transactions to the database session at once
    if valid_transactions:
        db.add_all(valid_transactions)
        db.commit()

    return {
        "message" : "CSV processed.",
        "imported_count": len(valid_transactions),
        "skipped_rows": skipped_rows,
    }