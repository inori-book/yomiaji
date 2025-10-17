import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { spawn } from 'child_process';

// CSVレコードの型定義
interface BookRecord {
  title: string;
  author: string;
  review: string;
  genre: string;
  erotic: string;
  grotesque: string;
  insane: string;
  paranomal: string;
  esthetic: string;
  action: string;
  painful: string;
  mystery: string;
  date: string;
  ISBN: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get('isbn');

    if (!isbn) {
      return NextResponse.json({ error: 'ISBN is required' }, { status: 400 });
    }

    // ファイルパスを取得
    const databasePath = path.join(process.cwd(), 'public', 'database.csv');
    const abstractWordsPath = path.join(process.cwd(), 'public', 'abstractwords.txt');
    const stopWordsPath = path.join(process.cwd(), 'public', 'stopwords.txt');

    // ファイルを読み込み
    const databaseData = fs.readFileSync(databasePath, 'utf-8');
    const abstractWordsData = fs.readFileSync(abstractWordsPath, 'utf-8');
    const stopWordsData = fs.readFileSync(stopWordsPath, 'utf-8');

    // CSVを解析
    const records = parse(databaseData, { 
      columns: true, 
      skip_empty_lines: true,
      quote: '"',
      escape: '"'
    }) as BookRecord[];

    // 指定されたISBNのレビューを取得
    const bookRecord = records.find(record => record.ISBN === isbn);
    if (!bookRecord || !bookRecord.review) {
      return NextResponse.json({ words: [] });
    }

    const review = bookRecord.review;

    // 抽象語とストップワードを配列に変換
    const abstractWords = abstractWordsData.split('\n').filter(word => word.trim());
    const stopWords = stopWordsData.split('\n').filter(word => word.trim());

    // 全レビューからキーワードを抽出して頻度をカウント
    const allKeywords: string[] = [];
    
    // 指定されたISBNのレビューからキーワードを抽出
    const words = await new Promise<string[]>((resolve, reject) => {
      const python = spawn('python3', ['search_engine.py', review]);

      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            // 検索結果からキーワードを抽出
            const keywords: string[] = [];
            if (result.results && result.results.length > 0) {
              result.results.forEach((book: any) => {
                if (book.keywords) {
                  keywords.push(...book.keywords);
                }
              });
            }
            resolve(keywords);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            reject(new Error('Failed to parse search results'));
          }
        } else {
          console.error('Python script error:', error);
          reject(new Error('Keyword extraction failed'));
        }
      });
    });

    // 同じジャンルの他のレビューからもキーワードを抽出して頻度を増やす
    const genre = bookRecord.genre;
    const sameGenreBooks = records.filter(record => record.genre === genre && record.ISBN !== isbn);
    
    for (const book of sameGenreBooks.slice(0, 5)) { // 最大5冊まで
      if (book.review) {
        try {
          const genreWords = await new Promise<string[]>((resolve, reject) => {
            const python = spawn('python3', ['search_engine.py', book.review]);

            let output = '';
            let error = '';

            python.stdout.on('data', (data) => {
              output += data.toString();
            });

            python.stderr.on('data', (data) => {
              error += data.toString();
            });

            python.on('close', (code) => {
              if (code === 0) {
                try {
                  const result = JSON.parse(output);
                  const keywords: string[] = [];
                  if (result.results && result.results.length > 0) {
                    result.results.forEach((book: any) => {
                      if (book.keywords) {
                        keywords.push(...book.keywords);
                      }
                    });
                  }
                  resolve(keywords);
                } catch (parseError) {
                  resolve([]);
                }
              } else {
                resolve([]);
              }
            });
          });
          
          allKeywords.push(...genreWords);
        } catch (error) {
          // エラーが発生しても続行
          continue;
        }
      }
    }

    // 元のレビューのキーワードも追加
    allKeywords.push(...words);

    // 単語の出現頻度をカウント
    const wordCount: { [key: string]: number } = {};
    allKeywords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // 頻度順にソートして上位20語を取得
    const sortedWords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    return NextResponse.json({ words: sortedWords });

  } catch (error) {
    console.error('Word cloud generation error:', error);
    return NextResponse.json({ error: 'Failed to generate word cloud' }, { status: 500 });
  }
}
