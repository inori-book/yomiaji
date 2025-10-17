import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

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
    const isbn = searchParams.get("isbn");

    if (!isbn) {
      return NextResponse.json({ error: 'ISBNが必要です' }, { status: 400 });
    }

    // database.csvを読み込み
    const csvPath = path.join(process.cwd(), 'public', 'database.csv');
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
    }) as BookRecord[];
    
    if (records.length === 0) {
      return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
    }

    // 該当するISBNの行を検索
    const book = records.find(record => record.ISBN === isbn);
    
    if (book) {
      // レーダーチャート用のデータを抽出
      const data = {
        erotic: parseInt(book.erotic || '0'),
        grotesque: parseInt(book.grotesque || '0'),
        insane: parseInt(book.insane || '0'),
        paranomal: parseInt(book.paranomal || '0'),
        esthetic: parseInt(book.esthetic || '0'),
        action: parseInt(book.action || '0'),
        painful: parseInt(book.painful || '0'),
        mystery: parseInt(book.mystery || '0'),
      };
      
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: '該当する書籍が見つかりません' }, { status: 404 });

  } catch (error) {
    console.error('書籍データ取得エラー:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
