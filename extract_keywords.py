import pandas as pd
import MeCab
from collections import Counter
import json

class KeywordExtractor:
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
    
    def extract_keywords_from_text(self, text):
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
        
        return keywords
    
    def extract_all_keywords(self):
        """全レビューからキーワードを抽出し、検索結果が1つ以上あるもののみを返す"""
        all_keywords = []
        
        # 全レビューから形容詞・形容動詞を抽出
        for index, row in self.books_df.iterrows():
            review = str(row['review']) if pd.notna(row['review']) else ""
            keywords = self.extract_keywords_from_text(review)
            all_keywords.extend(keywords)
        
        # 抽象語も追加
        all_keywords.extend(list(self.abstract_words))
        
        # キーワードの出現回数をカウント
        keyword_counts = Counter(all_keywords)
        
        # 検索結果が1つ以上あるキーワードのみを抽出
        valid_keywords = []
        for keyword in keyword_counts.keys():
            # このキーワードで検索した場合の結果数を確認
            result_count = self.count_search_results(keyword)
            if result_count > 0:
                valid_keywords.append({
                    'keyword': keyword,
                    'count': keyword_counts[keyword],
                    'result_count': result_count
                })
        
        # 50音順でソート
        valid_keywords.sort(key=lambda x: x["keyword"])
        
        return valid_keywords
    
    def count_search_results(self, keyword):
        """指定されたキーワードで検索した場合の結果数を返す"""
        count = 0
        keyword_lower = keyword.lower()
        
        for index, row in self.books_df.iterrows():
            review = str(row['review']) if pd.notna(row['review']) else ""
            review_lower = review.lower()
            
            # キーワードがreviewに登場する回数をカウント
            if keyword_lower in review_lower:
                count += 1
        
        return count

def main():
    """メイン関数 - キーワードを抽出してJSON形式で出力"""
    extractor = KeywordExtractor()
    
    if not extractor.load_data():
        print(json.dumps({"error": "データの読み込みに失敗しました"}))
        return
    
    keywords = extractor.extract_all_keywords()
    
    # 結果をJSON形式で出力
    output = {
        "keywords": [item['keyword'] for item in keywords[:50]],  # 上位50個まで
        "total_count": len(keywords)
    }
    
    print(json.dumps(output, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
