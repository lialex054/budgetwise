# backend / main.py

import csv
import io
import json
import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional
import calendar

from fastapi import FastAPI, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, exists
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
        You are a friendly and helpful financial assistant called Felix.
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
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV.")

    # 1. Load the merchant map
    try:
        with open(MERCHANT_MAP_FILE, 'r', encoding='utf-8') as f: # Added encoding
            merchant_map = json.load(f)
    except FileNotFoundError:
        merchant_map = {}
    except json.JSONDecodeError:
        print(f"Warning: Could not decode {MERCHANT_MAP_FILE}. Starting with an empty map.")
        merchant_map = {} # Handle corrupted JSON

    # 2. Initialize variables
    has_map_changed = False
    unknown_merchants_set = set() # Use a set for automatic deduplication
    valid_transactions = [] # Store SQLAlchemy model instances
    skipped_rows = []

    # 3. First Pass - Read CSV and Identify Unknown Merchants
    contents = await file.read()
    try:
        file_data = io.StringIO(contents.decode('utf-8')) # Ensure UTF-8 decoding
        csv_reader = csv.DictReader(file_data)
    except UnicodeDecodeError:
         raise HTTPException(status_code=400, detail="Invalid file encoding. Please upload a UTF-8 encoded CSV.")

    # Store temporary transaction data along with the object for later update
    temp_transaction_data = []

    for i, row in enumerate(csv_reader, start=2):
        try:
            transaction_data = schemas.TransactionCreate(**row)
            merchant_name = transaction_data.merchant_name

            # Check for duplicates before processing
            existing_txn = db.query(models.Transaction).filter(
                models.Transaction.transaction_id == transaction_data.transaction_id
            ).first()
            if existing_txn:
                skipped_rows.append({"row": i, "error": "Duplicate transaction ID found."})
                continue

            # Check known merchants map
            category = merchant_map.get(merchant_name)

            if category is None:
                # Add to set for batch processing later
                unknown_merchants_set.add(merchant_name)
                # Temporarily assign 'Uncategorized'
                current_category = 'Uncategorized'
            else:
                current_category = category

            # Create the DB object with the determined category
            db_transaction = models.Transaction(
                **transaction_data.dict(),
                category=current_category
            )
            valid_transactions.append(db_transaction)
            # Store reference if category might need update later
            if current_category == 'Uncategorized':
                temp_transaction_data.append({"merchant": merchant_name, "transaction_obj": db_transaction})


        except ValidationError as e:
            skipped_rows.append({"row": i, "error": f"Validation Error: {e.errors()}"})
        except Exception as e:
            # Catch unexpected errors during row processing
            skipped_rows.append({"row": i, "error": f"Unexpected Error: {str(e)}"})
            print(f"Error processing row {i}: {e}") # Log unexpected error

    # 4. Batch LLM Call (if unknowns were found)
    unknown_merchants_list = list(unknown_merchants_set)
    newly_categorized = {} # Store results from LLM

    if unknown_merchants_list:
        print(f"Found {len(unknown_merchants_list)} unknown merchants. Querying LLM...")
        prompt = f"""
        You are a categorization assistant. You MUST choose one category for each merchant
        from the following list: {CATEGORY_OPTIONS}.

        Categorize these merchants: {', '.join(unknown_merchants_list)}

        Respond ONLY with a valid JSON object mapping each merchant name (string)
        to its chosen category (string). Example: {{"Merchant A": "Shopping", "Merchant B": "Groceries"}}
        Ensure the entire output is ONLY the JSON object, nothing before or after.
        """
        try:
            model = genai.GenerativeModel("gemini-2.5-flash-lite") # Or your chosen model
            response = await model.generate_content_async(prompt)

            # Attempt to parse the LLM response as JSON
            try:
                # Clean potential markdown fences (```json ... ```)
                cleaned_response = response.text.strip().replace('```json', '').replace('```', '').strip()
                llm_results = json.loads(cleaned_response)
                if isinstance(llm_results, dict):
                    newly_categorized = llm_results
                    print("LLM categorization successful.")
                else:
                    print("LLM response was not a JSON object.")

            except json.JSONDecodeError as json_err:
                print(f"Error decoding LLM JSON response: {json_err}")
                print(f"LLM Raw Response: {response.text}")
            except Exception as parse_err:
                 print(f"Unexpected error parsing LLM response: {parse_err}")
                 print(f"LLM Raw Response: {response.text}")


        except Exception as e:
            print(f"Error calling Generative AI: {e}")
            # If LLM fails, unknowns remain 'Uncategorized'

        # Update the main merchant map with validated results
        for merchant, llm_category in newly_categorized.items():
            if merchant in unknown_merchants_set and isinstance(llm_category, str):
                cleaned_category = llm_category.strip().capitalize() # Basic cleaning
                if cleaned_category in CATEGORY_OPTIONS:
                    if merchant_map.get(merchant) != cleaned_category:
                        merchant_map[merchant] = cleaned_category
                        has_map_changed = True
                        print(f"Mapped '{merchant}' to '{cleaned_category}'")
                else:
                     print(f"Warning: LLM returned invalid category '{llm_category}' for '{merchant}'. Keeping Uncategorized.")
            else:
                print(f"Warning: LLM returned unexpected data for '{merchant}': {llm_category}")


    # 5. Update Transaction Categories in Session (if needed)
    print("Updating categories for transactions in session...")
    for item in temp_transaction_data:
        merchant = item["merchant"]
        transaction_obj = item["transaction_obj"]
        # Check if the merchant was newly categorized OR if it was already in the map initially but marked Uncategorized temporarily
        if merchant in merchant_map and transaction_obj.category == 'Uncategorized':
             updated_category = merchant_map[merchant]
             if updated_category != 'Uncategorized':
                transaction_obj.category = updated_category
                print(f"Updated transaction {transaction_obj.transaction_id} category to '{updated_category}'")


    # 6. Add valid transactions to the session and commit
    if valid_transactions:
        try:
            db.add_all(valid_transactions)
            db.commit()
            print("Transactions committed to database.")
        except Exception as e:
            db.rollback()
            print(f"Error committing transactions: {e}. Rolling back.")
            # Clear valid_transactions as they failed commit
            valid_transactions = []
            # Add a general error message (optional)
            # skipped_rows.append({"row": "N/A", "error": f"Database commit failed: {e}"})
            # Re-raise or handle as appropriate, maybe return 500
            raise HTTPException(status_code=500, detail=f"Database commit failed: {e}")

    # 7. Save the updated merchant map if changes were made
    if has_map_changed:
        print(f"Saving updated {MERCHANT_MAP_FILE}...")
        try:
            with open(MERCHANT_MAP_FILE, 'w', encoding='utf-8') as f:
                json.dump(merchant_map, f, indent=2, ensure_ascii=False) # Added encoding and ensure_ascii=False
        except IOError as e:
            print(f"Error saving merchant map file: {e}") # Log error but don't crash upload

    # 8. Return final response
    return {
        "message": "CSV processed.",
        "imported_count": len(valid_transactions), # Count successful commits
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
            print(f"Attempting to commit budget: {settings.monthly_budget}")
        
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
    ).order_by(models.Transaction.date.asc())

    # Fetch all transactions now for trend calculation
    all_transactions_for_month = transactions_in_month_query.all()

    # 3a. Calculate Total Spend for the target month
    total_spend = sum(t.amount for t in all_transactions_for_month if t.amount is not None) # Safer sum
    print(f"Total spend for {start_of_month.strftime('%Y-%m')}: {total_spend}")

    # 3b. Get Spending Breakdown
    # Need to recalculate grouping from the fetched list or re-query
    # Using a dictionary for aggregation:
    category_totals = {}
    for t in all_transactions_for_month:
        category_totals[t.category] = category_totals.get(t.category, 0) + (t.amount or 0)

    spending_breakdown = [{"category": cat, "total": tot} for cat, tot in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)]
    print(f"Spending breakdown: {spending_breakdown}")

    # 3c. Get Top Spending Category
    top_category = spending_breakdown[0] if spending_breakdown else {"category": "N/A", "total": 0}
    print(f"Top category: {top_category}")

    # 3d. Get ALL Transactions for the month (already fetched, just format)
    transactions = [
        {"id": t.id, "merchant_name": t.merchant_name, "amount": t.amount, "date": t.date.isoformat(), "category": t.category, "transaction_id": t.transaction_id}
        for t in sorted(all_transactions_for_month, key=lambda t: t.date, reverse=True) # Sort descending for display
    ]
    print(f"Fetched {len(transactions)} transactions for the month.")

    # --- NEW: 3e. Check for Previous/Next Month Data ---
    # Previous Month Boundaries
    prev_month_end = start_of_month - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    # Next Month Boundaries
    next_month_start = end_of_month + timedelta(days=1)
    next_num_days = calendar.monthrange(next_month_start.year, next_month_start.month)[1]
    next_month_end = next_month_start.replace(day=next_num_days)

    # Check existence using exists() for efficiency
    has_previous_month_data = db.query(
        exists().where(
            models.Transaction.date >= prev_month_start,
            models.Transaction.date <= prev_month_end
        )
    ).scalar()

    has_next_month_data = db.query(
        exists().where(
            models.Transaction.date >= next_month_start,
            models.Transaction.date <= next_month_end
        )
    ).scalar()

    print(f"Prev month data: {has_previous_month_data}, Next month data: {has_next_month_data}")
    # --- END: Check ---

    # --- 4. CALCULATE METRICS ---
    # target_daily_spend calculation remains the same
    target_daily_spend_per_day = (monthly_budget / num_days_in_month) if monthly_budget > 0 and num_days_in_month > 0 else 0.0

    # avg_daily_spend calculation remains the same
    if target_date.year == today_date.year and target_date.month == today_date.month: days_so_far = today_day_num
    elif target_date < today_date.replace(day=1): days_so_far = num_days_in_month
    else: days_so_far = 1
    avg_daily_spend = (total_spend / days_so_far) if days_so_far > 0 else 0.0
    print(f"Target daily spend per day: {target_daily_spend_per_day}, Avg daily spend: {avg_daily_spend}") # Renamed target for clarity

    # --- NEW: 4c. Calculate Spending Trend Data ---
    spending_trend_data = []
    cumulative_spend = 0.0
    transaction_idx = 0
    daily_target = 0.0

    for day_num in range(1, num_days_in_month + 1):
        current_day_date = start_of_month + timedelta(days=day_num - 1)
        daily_target += target_daily_spend_per_day # Accumulate target linearly

        # Sum transactions up to the end of the current day
        while transaction_idx < len(all_transactions_for_month) and all_transactions_for_month[transaction_idx].date <= current_day_date:
            cumulative_spend += all_transactions_for_month[transaction_idx].amount or 0
            transaction_idx += 1

        spending_trend_data.append({
            "day": day_num,
            "actual": round(cumulative_spend, 2), # Actual cumulative spend
            "target": round(daily_target, 2)     # Target cumulative spend
        })
    print(f"Spending trend data calculated for {len(spending_trend_data)} days.")

    # --- 5. RETURN THE FULL JSON PAYLOAD ---
    return {
        "selectedMonth": start_of_month.strftime('%Y-%m'),
        "monthlyBudget": monthly_budget,
        "totalSpend": total_spend,
        "avgDailySpend": avg_daily_spend,
        "targetDailySpendPerDay": target_daily_spend_per_day,
        "topCategory": top_category,
        "spendingBreakdown": spending_breakdown,
        "transactions": transactions,
        "spendingTrendData": spending_trend_data,
        "hasPreviousMonthData": has_previous_month_data,
        "hasNextMonthData": has_next_month_data
    }

@app.post("/transactions/", response_model=schemas.Transaction, status_code=201) # Use 201 Created status
def create_transaction(
    transaction_data: schemas.TransactionManualCreate, # Use the new schema
    db: Session = Depends(get_db)
):
    # Generate a unique transaction ID
    # Convert UUID to string if needed, or ensure DB/model handles UUID type
    generated_id = f"MANUAL_{uuid.uuid4()}" # Example: Prefix manual entries
    print(f"Creating manual transaction with ID: {generated_id}")

    # Create the SQLAlchemy model instance
    db_transaction = models.Transaction(
        merchant_name=transaction_data.merchant_name,
        amount=transaction_data.amount,
        date=transaction_data.date,
        category=transaction_data.category,
        transaction_id=generated_id # Use the generated ID
    )

    try:
        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction) # Refresh to get DB-generated ID etc.
        print("Manual transaction committed successfully.")
        return db_transaction
    except Exception as e:
        db.rollback()
        print(f"ERROR committing manual transaction: {e}")
        # Consider specific error checks (like IntegrityError if generated_id wasn't unique)
        raise HTTPException(status_code=500, detail=f"Failed to save transaction: {e}")

@app.delete("/transactions/{transaction_id}/", status_code=204) # 204 No Content for successful delete
def delete_transaction(
    transaction_id: int, # Use the primary key 'id'
    db: Session = Depends(get_db)
):
    print(f"Attempting to delete transaction with ID: {transaction_id}")

    # Find the transaction by its primary key (id)
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()

    # If transaction doesn't exist, return 404
    if db_transaction is None:
        print(f"Transaction ID {transaction_id} not found.")
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Delete the transaction
    try:
        db.delete(db_transaction)
        db.commit()
        print(f"Transaction ID {transaction_id} deleted successfully.")
        # No body should be returned with a 204 status code
        return None # Or return Response(status_code=204)
    except Exception as e:
        db.rollback()
        print(f"ERROR deleting transaction ID {transaction_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete transaction: {e}")