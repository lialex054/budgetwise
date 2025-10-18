# backend / main.py

import csv
import io
from datetime import datetime
from typing import List

from fastapi import FastAPI, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from pydantic import ValidationError

# Created Components
import models
import schemas
from database import SessionLocal, engine

# Allow CORS for local development
from fastapi.middleware.cors import CORSMiddleware

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

# --- API ENDPOINT ---

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