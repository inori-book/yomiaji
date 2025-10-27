from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sys, socket
import numpy as np
import pandas as pd
import subprocess
import json
import os

app = FastAPI()

class SearchRequest(BaseModel):
    query: str

class KeywordsRequest(BaseModel):
    text: str

@app.get("/health")
def health():
    return {
        "ok": True,
        "py": sys.executable,
        "host": socket.gethostname(),
        "numpy": np.__version__,
        "pandas": pd.__version__
    }

@app.post("/search")
def search(request: SearchRequest):
    try:
        # search_engine.py を実行
        result = subprocess.run(
            ["python3", "search_engine.py", request.query],
            capture_output=True,
            text=True,
            cwd="/app"
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Search failed: {result.stderr}")
        
        return json.loads(result.stdout)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/keywords")
def keywords(request: KeywordsRequest):
    try:
        # extract_keywords.py を実行
        result = subprocess.run(
            ["python3", "extract_keywords.py"],
            input=request.text,
            capture_output=True,
            text=True,
            cwd="/app"
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Keywords extraction failed: {result.stderr}")
        
        return json.loads(result.stdout)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
