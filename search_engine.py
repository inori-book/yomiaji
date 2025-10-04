import pandas as pd
import MeCab
import re
from collections import Counter
import json
import sys

class BookSearchEngine:
    def __init__(self):
        # unidic-liteはchasen形式をサポートしていないため、デフォルト形式を使用
        self.mecab = MeCab.Tagger()
        self.books_df = None
        self.abstract_words = set()
        self.stop_words = set()
        self.load_data()
    
    def load_data(self):
        """データファイルを読み込む"""
        try:
            # CSVファイルを読み込み
            self.books_df = pd.read_csv('public/database.csv')
            
            # 抽象語を読み込み
            with open('public/abstractwords.txt', 'r', encoding='utf-8') as f:
                self.abstract_words = set(line.strip() for line in f if line.strip())
            
            # ストップワードを読み込み
            with open('public/stopwords.txt', 'r', encoding='utf-8') as f:
                self.stop_words = set(line.strip() for line in f if line.strip())
                
        except Exception as e:
            print(f"データ読み込みエラー: {e}", file=sys.stderr)
            return False
        return True
    
    def extract_keywords(self, text):
        """テキストから形容詞と形容動詞を抽出"""
        if not text or pd.isna(text):
            return []
        
        # 形態素解析
        parsed = self.mecab.parse(text)
        keywords = []
        
        for line in parsed.split('\n'):
            if line == 'EOS':
                break
            
            parts = line.split('\t')
            if len(parts) >= 2:
                word = parts[0]
                pos_info = parts[1] if len(parts) > 1 else ""
                
                # 形容詞（形容詞,自立）と形容動詞（形容動詞語幹）を抽出
                if '形容詞' in pos_info or '形容動詞' in pos_info:
                    if word and word not in self.stop_words:
                        keywords.append(word)
        
        # 抽象語も追加
        for word in self.abstract_words:
            if word in text and word not in self.stop_words:
                keywords.append(word)
        
        return keywords
    
    def search_books(self, query):
        """検索クエリに基づいて本を検索"""
        if not query or not query.strip():
            return []
        
        query = query.strip()
        results = []
        
        for index, row in self.books_df.iterrows():
            review = str(row['review']) if pd.notna(row['review']) else ""
            
            # 検索キーワードがreviewに直接登場する回数をカウント
            query_lower = query.lower()
            review_lower = review.lower()
            
            # 直接的な文字列マッチングで登場回数をカウント
            keyword_count = review_lower.count(query_lower)
            
            # 1語以上登場する場合のみ結果に含める
            if keyword_count > 0:
                # 形態素解析したキーワードも取得（表示用）
                keywords = self.extract_keywords(review)
                
                results.append({
                    'index': index,
                    'title': row['title'],
                    'author': row['author'],
                    'genre': row['genre'],
                    'review': review,
                    'isbn': str(int(float(row['ISBN']))) if pd.notna(row['ISBN']) and str(row['ISBN']).replace('.', '').isdigit() else '',
                    'keyword_count': keyword_count,
                    'keywords': keywords
                })
        
        # キーワード登場回数でソート（降順）
        results.sort(key=lambda x: x['keyword_count'], reverse=True)
        
        return results

def main():
    """メイン関数 - コマンドライン引数から検索クエリを受け取る"""
    if len(sys.argv) < 2:
        print("使用方法: python3 search_engine.py <検索クエリ>")
        sys.exit(1)
    
    query = sys.argv[1]
    search_engine = BookSearchEngine()
    
    if not search_engine.load_data():
        print(json.dumps({"error": "データの読み込みに失敗しました"}))
        sys.exit(1)
    
    results = search_engine.search_books(query)
    
    # 結果をJSON形式で出力
    output = {
        "query": query,
        "results": results[:20],  # 上位20件まで
        "total_count": len(results)
    }
    
    print(json.dumps(output, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
