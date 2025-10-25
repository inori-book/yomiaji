#!/usr/bin/env python3
"""
Python API Server for YOMIAJI
Provides search and keyword extraction functionality via HTTP API
"""

import sys
import os
import json
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import our existing Python scripts
try:
    from search_engine import search_books
    from extract_keywords import extract_keywords
except ImportError as e:
    print(f"Import error: {e}")
    print(f"Python executable: {sys.executable}")
    print(f"Python path: {sys.path}")
    sys.exit(1)

app = FastAPI(title="YOMIAJI Python API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "python_executable": sys.executable}

@app.post("/search")
async def search_endpoint(request: dict):
    """Search books endpoint"""
    try:
        query = request.get("query")
        if not query:
            raise HTTPException(status_code=400, detail="Query parameter is required")
        
        result = search_books(query)
        return result
    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/keywords")
async def keywords_endpoint():
    """Extract keywords endpoint"""
    try:
        result = extract_keywords()
        return result
    except Exception as e:
        print(f"Keywords error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print(f"Starting Python API server...")
    print(f"Python executable: {sys.executable}")
    print(f"Python path: {sys.path}")
    
    uvicorn.run(
        "python_api:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info"
    )
