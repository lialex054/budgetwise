# backend / main.py

import csv
import io
import json
from datetime import datetime, date
from typing import List, Optional
import calendar

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

print("All tables created:", models.Base.metadata.tables.keys())

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

            existing_txn = db.query(models.Transaction).filter(
                models.Transaction.transaction_id == transaction_data.transaction_id
            ).first()

            if existing_txn:
                # Skip this row if the transaction ID already exists
                skipped_rows.append({"row": i, "error": "Duplicate transaction ID found."})
                continue # Move to the next row in the CSV

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
    try:
        # Find the first settings object
        settings = db.query(models.UserSettings).first()
        
        if not settings:
            # If no settings exist, create a new one
            print("No settings found, creating new one...") # Debug line
            settings = models.UserSettings(monthly_budget=budget_update.amount)
            db.add(settings)
        else:
            # If settings exist, update them
            print("Settings found, updating budget...") # Debug line
            settings.monthly_budget = budget_update.amount
        
        # This is the crucial part
        db.commit()  # Try to save the changes
        db.refresh(settings) # Get the newly saved data
        
        print(f"Successfully committed budget: {settings.monthly_budget}") # Debug line
        return {"message": "Budget updated successfully."}

    except Exception as e:
        # If anything goes wrong, roll back
        db.rollback()
        print(f"ERROR: Could not commit budget. Rolling back. Error: {e}") # Debug line
        raise HTTPException(status_code=500, detail="Failed to save budget to database.")

# backend/main.py - DEBUGGING VERSION
@app.get("/dashboard-data/")
def get_dashboard_data(
    month: Optional[str] = None,  # Accepts YYYY-MM format
    db: Session = Depends(get_db)
):
    print(f"--- GET /dashboard-data/ CALLED for month: {month} ---") # Updated debug

    # --- 1. DETERMINE THE TARGET MONTH ---
    target_date = None
    if month:
        try:
            target_date = datetime.strptime(month, '%Y-%m').date()
            print(f"Using provided month: {target_date.strftime('%Y-%m')}")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM.")
    else:
        latest_transaction = db.query(models.Transaction).order_by(models.Transaction.date.desc()).first()
        if latest_transaction:
            target_date = latest_transaction.date
            print(f"Found latest transaction month: {target_date.strftime('%Y-%m')}")
        else:
            target_date = date.today()
            print("No transactions found, using current month.")

    start_of_month = target_date.replace(day=1)
    num_days_in_month = calendar.monthrange(target_date.year, target_date.month)[1]
    end_of_month = target_date.replace(day=num_days_in_month)
    today_date = date.today() # Get today's date once
    today_day_num = today_date.day

    # --- 2. GET USER BUDGET ---
    settings = db.query(models.UserSettings).first()
    monthly_budget = settings.monthly_budget if settings and settings.monthly_budget is not None else 0.0
    print(f"Monthly budget: {monthly_budget}")

    # --- 3. RUN DATABASE QUERIES ---
    # Base query for transactions in the target month
    transactions_in_month_query = db.query(models.Transaction).filter(
        models.Transaction.date >= start_of_month,
        models.Transaction.date <= end_of_month
    )

    # 3a. Calculate Total Spend for the target month
    total_spend = transactions_in_month_query.with_entities(func.sum(models.Transaction.amount)).scalar() or 0.0
    print(f"Total spend for {start_of_month.strftime('%Y-%m')}: {total_spend}")

    # 3b. Get Spending Breakdown for the target month
    category_spend_result = transactions_in_month_query.with_entities(
        models.Transaction.category,
        func.sum(models.Transaction.amount).label("total")
    ).group_by(models.Transaction.category).order_by(func.sum(models.Transaction.amount).desc()).all()

    spending_breakdown = [{"category": category, "total": total} for category, total in category_spend_result]
    print(f"Spending breakdown: {spending_breakdown}")

    # 3c. Get Top Spending Category
    top_category = spending_breakdown[0] if spending_breakdown else {"category": "N/A", "total": 0}
    print(f"Top category: {top_category}")

    # 3d. Get Recent Transactions (limit 5 for the target month)
    recent_transactions_result = transactions_in_month_query.order_by(models.Transaction.date.desc()).limit(5).all()
    # Convert recent transactions for JSON compatibility (FastAPI might handle this, but explicit is safer)
    recent_transactions = [
        {"id": t.id, "merchant_name": t.merchant_name, "amount": t.amount, "date": t.date.isoformat(), "category": t.category, "transaction_id": t.transaction_id}
        for t in recent_transactions_result
    ]
    print(f"Recent transactions: {recent_transactions}")


    # --- 4. CALCULATE METRICS ---
    target_daily_spend = (monthly_budget / num_days_in_month) if monthly_budget > 0 and num_days_in_month > 0 else 0.0

    # Determine days passed in the target month relative to today
    if target_date.year == today_date.year and target_date.month == today_date.month:
        # If target month is the current month, use today's day number
        days_so_far = today_day_num
    elif target_date < today_date.replace(day=1):
        # If target month is in the past, use the total days in that month
        days_so_far = num_days_in_month
    else:
        # If target month is in the future (unlikely but possible), use 0 or 1? Let's use 1 to avoid division by zero.
        days_so_far = 1

    avg_daily_spend = (total_spend / days_so_far) if days_so_far > 0 else 0.0
    print(f"Target daily spend: {target_daily_spend}, Avg daily spend: {avg_daily_spend}")

    # --- 5. RETURN THE FULL JSON PAYLOAD ---
    # Use camelCase keys to match frontend expectations
    return {
        "selectedMonth": start_of_month.strftime('%Y-%m'),
        "monthlyBudget": monthly_budget,
        "totalSpend": total_spend,
        "avgDailySpend": avg_daily_spend,
        "targetDailySpend": target_daily_spend,
        "topCategory": top_category,
        "spendingBreakdown": spending_breakdown,
        "recentTransactions": recent_transactions # Return the converted list
    }

