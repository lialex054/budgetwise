# backend / main.py

import csv
import io
import json
from datetime import datetime, date
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



# --- DB Setup ---

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

# --- API KEY ---
GEMINI_API_KEY = "AIzaSyCpM_uC_F4MLuObZ85yJRu6Y8DvLazbfrE"
genai.configure(api_key=GEMINI_API_KEY)

# Path for our merchant map
MERCHANT_MAP_FILE = "merchant_map.json"

# Fixed list of categories
CATEGORY_OPTIONS = [
    "Uncategorized", "Groceries", "Transport", "Utilitiies", "Rent", 
    "Entertainment", "Dining Out", "Shopping", "Healthcare"
]

# --- DEPENDENCY ---
# This function provides a database session to the API endpoints.
# It ensures that the database session is always closed after the request is finished.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API ENDPOINT ---

# Update transcation category
@app.patch("/transactions/{transaction_id}/", response_model = schemas.Transaction)
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
    
    # 1. Load merchant map from disk
    try:
        with open(MERCHANT_MAP_FILE, "r") as f:
            merchant_map = json.load(f)
    except FileNotFoundError:
        merchant_map = {} # start with empty map if file doesn't exist

    # 2. Initialise flag
    has_map_changed = False

    # Read file content directly from memory
    contents = await file.read()
    file_data = io.StringIO(contents.decode("utf-8"))
    csv_reader = csv.DictReader(file_data)

    valid_transactions = []
    skipped_rows = []

    # Iterate through each row of our CSV
    for i, row in enumerate(csv_reader, start=2): # Start at 2 to account for header
        try:
            # pydantic handles data parsing from string
            transaction_data = schemas.TransactionCreate(**row)
            merchant_name = transaction_data.merchant_name

            # 3. check if merchant exists in map
            category = merchant_map.get(merchant_name)

            # 4. If not in map, call the LLM
            if category is None:

                # 4a. Construct a strict prompt
                prompt = f"""
                You are a categorization assistant. You MUST choose one category
                from the following list: {CATEGORY_OPTIONS}.

                What is the best category for the merchant: "{merchant_name}"?

                Respond with ONLY the category name.
                """

                # 4b. Call the LLM
                model = genai.GenerativeModel("gemini-2.5-flash-lite")
                response = await model.generate_content_async(prompt)

                # 4c. Clean and validate response
                llm_category = response.text.strip()

                # Check if response is valid
                if llm_category in CATEGORY_OPTIONS:
                    category = llm_category
                else:
                    #Fallback if LLM gives invalid response
                    category = "Uncategorized"


                # 4d. Update merchant map
                merchant_map[merchant_name] = category
                has_map_changed = True

            # 5. Create the transaction in DB with new category
            # Pass new category in, overriding the model's default
            db_transaction = models.Transaction(
                **transaction_data.dict(), 
                category=category
            )
            valid_transactions.append(db_transaction)

        except ValidationError as e:
            # if row is malformed, log and continue
            skipped_rows.append({"row": i , "errors": e.errors()})
        except Exception as e:
            # catch any other unexpected errors
            skipped_rows.append({"row": i , "errors": str(e)})

    # Add all valid transaction to the DB
    if valid_transactions:
        db.add_all(valid_transactions)
        db.commit()

    # 6. Save the updated map back to disk
    if has_map_changed:
        with open(MERCHANT_MAP_FILE, "w") as f:
            json.dump(merchant_map, f, indent=2)

    return {
        "message" : "CSV processed.",
        "imported_count": len(valid_transactions),
        "skipped_rows": skipped_rows,
    }

# POST endpoint to set monthly budget
@app.post("/budget/", status_code=200)
def set_budget(budget_update: schemas.BudgetUpdate, db: Session = Depends(get_db)):
    # Find the first settings object, or create one if it doesn't exist
    settings = db.query(models.UserSettings).first()
    if not settings:
        settings = models.UserSettings(monthly_budget=budget_update.amount)
        db.add(settings)
    else:
        settings.monthly_budget = budget_update.amount

    db.commit()
    return {"message": "Budget updated successfully."}


@app.get("/dashboard-data/")
def get_dashboard_data(db: Session = Depends(get_db)):
    # 1. Get user's budget
    settings = db.query(models.UserSettings).first()
    monthly_budget = settings.monthly_budget if settings else 0.0

    # 2. Get the start and end of the current month
    today = date.today()
    start_of_month = today.replace(day=1)

    # 3. Calculate total spend for current month
    total_spend_result = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.date >= start_of_month
    ).scalar()
    total_spend = total_spend_result or 0.0

    # 4. Get spending breakdown by category
    category_spend_result = db.query(
        models.Transaction.category,
        func.sum(models.Transaction.amount).label("total")
    ).filter(
        models.Transaction.date >= start_of_month
    ).group_by(
        models.Transaction.category
    ).order_by(
        func.sum(models.Transaction.amount).desc()
    ).all()

    return{
        "monthly_budget": monthly_budget,
        "total_spend_current_month": total_spend,
        "category_spend_current_month": category_spend_result
    }

