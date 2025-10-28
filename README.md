# BudgetWise

A full-stack personal finance application that helps you track spending, manage budgets, and gain insights into your financial habits through AI-powered categorization and an intelligent chatbot assistant.

## Features

### Transaction Management
- **CSV Upload**: Import transactions from your bank statements
- **AI Categorization**: Automatically categorizes merchants using Google's Gemini AI
- **Manual Entry**: Add transactions manually when needed
- **Edit & Delete**: Full control over your transaction data

### Dashboard & Analytics
- **Monthly Overview**: Visual breakdown of your spending patterns
- **Budget Tracking**: Set monthly targets and track progress
- **Category Insights**: See where your money goes with interactive charts
- **Spending Trends**: Daily spending analysis with target comparisons
- **Historical Data**: Navigate through previous months

### AI Chatbot (Felix)
- **Natural Language Queries**: Ask questions about your spending in plain English
- **Smart Insights**: Get personalized financial insights and recommendations
- **Transaction Analysis**: Query specific spending patterns and merchants
- **Context-Aware**: Understands your financial history for better responses

## Tech Stack

### Frontend
- **React 19** with **Vite** for fast development
- **Tailwind CSS** for responsive styling
- **Shadcn/ui** component library (built on Radix UI)
- **Recharts** for data visualization
- **TanStack Table** for transaction tables
- **React Hook Form** + **Zod** for form validation

### Backend
- **FastAPI** (Python web framework)
- **SQLAlchemy** ORM with SQLite/LibSQL database
- **Google Generative AI** (Gemini) for AI features
- **Pydantic** for data validation
- **Uvicorn** ASGI server

## Project Structure

```
budgetwise/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # Utility functions
│   │   ├── App.jsx        # Main app component
│   │   ├── Chat.jsx       # AI chatbot interface
│   │   ├── Dashboard.jsx  # Dashboard view
│   │   ├── Budget.jsx     # Budget management
│   │   └── api.js         # API client configuration
│   └── package.json
├── backend/               # FastAPI application
│   ├── main.py            # API endpoints
│   ├── models.py          # Database models
│   ├── database.py        # Database configuration
│   ├── schemas.py         # Request/response schemas
│   └── requirements.txt
└── README.md
```

## How It Works

### 1. Transaction Upload & Categorization
- Users upload a CSV file containing transaction data (merchant, amount, date)
- The backend processes each transaction and checks if the merchant is known
- Unknown merchants are sent to Google's Gemini AI for categorization
- Categories are cached in `merchant_map.json` for future transactions
- Transactions are stored in the SQLite database

### 2. Dashboard Analytics
- Backend calculates monthly metrics: total spend, daily average, top category
- Compares actual spending against budget targets
- Generates daily spending trends
- Frontend renders interactive charts and progress indicators using Recharts

### 3. AI Chatbot
- User asks questions in natural language (e.g., "Where did I spend the most?")
- Backend detects specific query patterns for direct SQL queries
- Falls back to Gemini AI for conversational analysis
- Returns context-aware responses based on transaction history
- Chat UI renders responses with markdown support

### 4. Budget Management
- Users set monthly budget targets
- System calculates daily spending limits
- Progress tracking shows percentage of budget used
- Visual indicators alert when approaching or exceeding budget

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload/` | Upload CSV file with transactions |
| GET | `/transactions/` | Get all transactions |
| POST | `/transactions/` | Create manual transaction |
| PATCH | `/transactions/{id}/` | Update transaction category |
| DELETE | `/transactions/{id}/` | Delete transaction |
| POST | `/chat/` | AI chatbot interaction |
| POST | `/budget/` | Set monthly budget |
| GET | `/dashboard-data/` | Get dashboard metrics for specific month |

## Database Schema

### Transaction
- `id`: Primary key
- `merchant_name`: Name of the merchant
- `amount`: Transaction amount (float)
- `date`: Transaction date
- `category`: Spending category (default: "Uncategorized")
- `transaction_id`: Unique identifier from CSV

### UserSettings
- `id`: Primary key
- `monthly_budget`: Target monthly budget (nullable)

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.10+
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd budgetwise
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt

   # Create .env file with your API key
   echo "GEMINI_API_KEY=your_api_key_here" > .env

   # Start the server
   uvicorn main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:8000`
   - API Docs: `http://localhost:8000/docs`

## CSV Upload Format

To import your transactions, create a CSV file with the following format:

### Required Columns
- `id`: Unique row identifier
- `merchant_name`: Name of the merchant/store
- `amount`: Transaction amount (positive number)
- `date`: Transaction date (YYYY-MM-DD format)
- `category`: Category (can be "Uncategorized" - AI will categorize)
- `transaction_id`: Unique transaction identifier

### Example CSV

```csv
id,merchant_name,amount,date,category,transaction_id
1,Tesco,45.67,2025-10-26,Uncategorized,TXN002001
2,Pret A Manger,8.95,2025-10-25,Uncategorized,TXN002002
3,Netflix,15.99,2025-10-24,Uncategorized,TXN002003
4,Costa Coffee,4.25,2025-10-23,Uncategorized,TXN002004
5,Sainsbury's,62.34,2025-10-22,Uncategorized,TXN002005
6,Transport for London,40.00,2025-10-21,Uncategorized,TXN002006
7,Zara,89.99,2025-10-20,Uncategorized,TXN002007
8,Spotify,10.99,2025-10-19,Uncategorized,TXN002008
9,Boots,23.50,2025-10-18,Uncategorized,TXN002009
10,Amazon Prime,8.99,2025-10-17,Uncategorized,TXN002010
```

### AI Prompt to Generate Sample CSV

Use this prompt with any AI assistant (ChatGPT, Claude, etc.) to generate your own sample transaction data:

```
Generate a CSV file with 200 realistic UK consumer transactions spanning 4 months (June-October 2025).

Required columns:
- id: Sequential numbers 1-200
- merchant_name: Mix of UK supermarkets (Tesco, Sainsbury's, Waitrose, M&S), coffee shops (Costa, Starbucks, Pret), restaurants (Nando's, Wagamama, Pizza Express), retail stores (Zara, H&M, Boots), transport (Transport for London), and subscription services (Netflix, Spotify, Amazon Prime)
- amount: Realistic prices in GBP (groceries £20-150, coffee £3-8, restaurants £15-50, retail £20-200, subscriptions £5-30, transport £40 weekly passes)
- date: Dates in YYYY-MM-DD format, distributed across June 1 - October 26, 2025
- category: Set all to "Uncategorized" (the app will auto-categorize)
- transaction_id: Unique IDs in format TXN002001, TXN002002, etc.

Requirements:
- Include recurring subscriptions (monthly Netflix, Spotify, etc.)
- Add weekly Transport for London payments (£40)
- Mix of everyday purchases and occasional larger items
- Realistic spending patterns (more groceries, fewer expensive items)
- Variety of merchants to showcase categorization

Format as CSV with headers. Ensure dates are chronologically recent-to-old (newest first).
```

Built using React, FastAPI, and Google Gemini AI
