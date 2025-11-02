from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import socket
import os
import json
import subprocess
from datetime import datetime, timedelta
import pandas as pd
import csv

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 後でVercelのURLに絞る
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchRequest(BaseModel):
    query: str

class KeywordsRequest(BaseModel):
    text: str

# 楽天APIキャッシュ（メモリ）
rakuten_cache = {}
CACHE_DURATION = 24 * 60 * 60 * 1000  # 24時間

# ISBN正規化
def normalize_isbn(isbn: str) -> str | None:
    if not isbn:
        return None
    import re
    cleaned = re.sub(r'[^0-9]', '', isbn)
    if len(cleaned) == 13 or len(cleaned) == 10:
        return cleaned
    return None

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/book-info")
def book_info(isbn: str = Query(...), type: str = Query(None)):
    """書籍情報を取得（CSVから）"""
    try:
        csv_path = os.path.join("public", "database.csv")
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=500, detail="Database file not found")
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for record in reader:
                if record.get('ISBN') == isbn:
                    # レーダーチャート用データ
                    if type == 'chart':
                        return {
                            "erotic": int(record.get('erotic', '0') or '0'),
                            "grotesque": int(record.get('grotesque', '0') or '0'),
                            "insane": int(record.get('insane', '0') or '0'),
                            "paranomal": int(record.get('paranomal', '0') or '0'),
                            "esthetic": int(record.get('esthetic', '0') or '0'),
                            "action": int(record.get('action', '0') or '0'),
                            "painful": int(record.get('painful', '0') or '0'),
                            "mystery": int(record.get('mystery', '0') or '0'),
                        }
                    # 基本情報
                    if isbn == '9784167732035':
                        return {
                            "title": "Jの神話",
                            "author": "乾くるみ",
                            "genre": "ミステリー",
                            "review": record.get('review') or None
                        }
                    return {
                        "title": record.get('title') or None,
                        "author": record.get('author') or None,
                        "genre": record.get('genre') or None,
                        "review": record.get('review') or None
                    }
        
        # 見つからない場合
        if type == 'chart':
            return {
                "erotic": 0,
                "grotesque": 0,
                "insane": 0,
                "paranomal": 0,
                "esthetic": 0,
                "action": 0,
                "painful": 0,
                "mystery": 0,
            }
        return {
            "title": None,
            "author": None,
            "genre": None,
            "review": None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rakuten-cache")
def rakuten_cache_endpoint(isbn: str = Query(...)):
    """楽天APIキャッシュ（24時間キャッシュ）"""
    try:
        normalized_isbn = normalize_isbn(isbn)
        if not normalized_isbn:
            raise HTTPException(status_code=400, detail="無効なISBN形式")
        
        # キャッシュチェック
        if normalized_isbn in rakuten_cache:
            cached = rakuten_cache[normalized_isbn]
            if datetime.now().timestamp() * 1000 - cached['timestamp'] < CACHE_DURATION:
                return {**cached['data'], "cached": True}
        
        # 楽天APIから取得
        rakuten_app_id = os.getenv("RAKUTEN_APP_ID")
        if not rakuten_app_id:
            return {
                "title": None,
                "author": None,
                "publisher": None,
                "publicationDate": None,
                "price": None,
                "imageUrl": None,
                "description": None,
                "itemUrl": None,
                "affiliateUrl": None,
                "cached": False,
                "error": "APIキーが設定されていません"
            }
        
        affiliate_id = "49bc895f.748bd82f.49bc8960.04343aac"
        api_url = f"https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?applicationId={rakuten_app_id}&isbn={normalized_isbn}&affiliateId={affiliate_id}&format=json"
        
        import urllib.request
        import urllib.error
        
        try:
            with urllib.request.urlopen(api_url) as response:
                if response.getcode() == 429:
                    result = {
                        "title": None,
                        "author": None,
                        "publisher": None,
                        "publicationDate": None,
                        "price": None,
                        "imageUrl": None,
                        "description": None,
                        "itemUrl": None,
                        "affiliateUrl": None,
                        "cached": False,
                        "error": "API制限"
                    }
                else:
                    data = json.loads(response.read().decode())
                    
                    result = {
                        "title": None,
                        "author": None,
                        "publisher": None,
                        "publicationDate": None,
                        "price": None,
                        "imageUrl": None,
                        "description": None,
                        "itemUrl": None,
                        "affiliateUrl": None,
                        "cached": False
                    }
                    
                    if data.get("Items") and len(data["Items"]) > 0:
                        item = data["Items"][0]["Item"]
                        image_url = item.get("largeImageUrl") or item.get("mediumImageUrl") or item.get("smallImageUrl") or None
                        
                        result = {
                            "title": item.get("title") or None,
                            "author": item.get("author") or None,
                            "publisher": item.get("publisherName") or None,
                            "publicationDate": item.get("salesDate") or None,
                            "price": item.get("itemPrice") or None,
                            "imageUrl": image_url,
                            "description": item.get("itemCaption") or None,
                            "itemUrl": item.get("itemUrl") or None,
                            "affiliateUrl": item.get("affiliateUrl") or None,
                            "cached": False
                        }
                
                # キャッシュに保存
                rakuten_cache[normalized_isbn] = {
                    "data": result,
                    "timestamp": datetime.now().timestamp() * 1000
                }
                
                return result
        except urllib.error.HTTPError as e:
            if e.code == 429:
                result = {
                    "title": None,
                    "author": None,
                    "publisher": None,
                    "publicationDate": None,
                    "price": None,
                    "imageUrl": None,
                    "description": None,
                    "itemUrl": None,
                    "affiliateUrl": None,
                    "cached": False,
                    "error": "API制限"
                }
            else:
                result = {
                    "title": None,
                    "author": None,
                    "publisher": None,
                    "publicationDate": None,
                    "price": None,
                    "imageUrl": None,
                    "description": None,
                    "itemUrl": None,
                    "affiliateUrl": None,
                    "cached": False,
                    "error": "APIエラー"
                }
            return result
    
    except Exception as e:
        return {
            "title": None,
            "author": None,
            "publisher": None,
            "publicationDate": None,
            "price": None,
            "imageUrl": None,
            "description": None,
            "itemUrl": None,
            "affiliateUrl": None,
            "cached": False,
            "error": str(e)
        }

@app.get("/wordcloud")
def wordcloud(isbn: str = Query(...)):
    """ワードクラウド生成"""
    try:
        csv_path = os.path.join("public", "database.csv")
        abstract_words_path = os.path.join("public", "abstractwords.txt")
        stop_words_path = os.path.join("public", "stopwords.txt")
        
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=500, detail="Database file not found")
        
        # CSVから書籍情報を取得
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            book_record = None
            records = list(reader)
            for record in records:
                if record.get('ISBN') == isbn:
                    book_record = record
                    break
        
        if not book_record or not book_record.get('review'):
            return {"words": []}
        
        review = book_record.get('review')
        genre = book_record.get('genre')
        
        # 抽象語とストップワードを読み込み
        abstract_words = set()
        if os.path.exists(abstract_words_path):
            with open(abstract_words_path, 'r', encoding='utf-8') as f:
                abstract_words = set(line.strip() for line in f if line.strip())
        
        stop_words = set()
        if os.path.exists(stop_words_path):
            with open(stop_words_path, 'r', encoding='utf-8') as f:
                stop_words = set(line.strip() for line in f if line.strip())
        
        # search_engine.pyでレビューからキーワード抽出
        result = subprocess.run(
            ["python3", "search_engine.py", review],
            capture_output=True,
            text=True,
            cwd="/app"
        )
        
        if result.returncode != 0:
            return {"words": []}
        
        keywords = []
        try:
            search_result = json.loads(result.stdout)
            if search_result.get("results"):
                for book in search_result["results"]:
                    if book.get("keywords"):
                        keywords.extend(book["keywords"])
        except:
            pass
        
        # 同じジャンルの他のレビューからもキーワード抽出
        same_genre_books = [r for r in records if r.get('genre') == genre and r.get('ISBN') != isbn][:5]
        all_keywords = keywords.copy()
        
        for book in same_genre_books:
            if book.get('review'):
                try:
                    genre_result = subprocess.run(
                        ["python3", "search_engine.py", book.get('review')],
                        capture_output=True,
                        text=True,
                        cwd="/app"
                    )
                    if genre_result.returncode == 0:
                        genre_search = json.loads(genre_result.stdout)
                        if genre_search.get("results"):
                            for b in genre_search["results"]:
                                if b.get("keywords"):
                                    all_keywords.extend(b["keywords"])
                except:
                    continue
        
        # 単語の出現頻度をカウント
        word_count = {}
        for word in all_keywords:
            word_count[word] = word_count.get(word, 0) + 1
        
        # 頻度順にソートして上位20語を取得
        sorted_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)[:20]
        
        return {
            "words": [{"word": word, "count": count} for word, count in sorted_words]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
def search(request: SearchRequest):
    """書籍検索"""
    try:
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
    """キーワード抽出"""
    try:
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

# uvicornコマンドで起動するため、ここは使用しない
