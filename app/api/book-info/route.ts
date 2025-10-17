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
    const isbn = searchParams.get('isbn');
    const dataType = searchParams.get('type'); // 'basic' or 'chart'

    if (!isbn) {
      return NextResponse.json({ error: 'ISBN is required' }, { status: 400 });
    }

    const databasePath = path.join(process.cwd(), 'public', 'database.csv');
    const databaseData = fs.readFileSync(databasePath, 'utf-8');
    const records = parse(databaseData, {
      columns: true,
      skip_empty_lines: true,
      quote: '"',
      escape: '"'
    }) as BookRecord[];

    const bookRecord = records.find(record => record.ISBN === isbn);
    
    if (!bookRecord) {
      return NextResponse.json({ 
        title: null, 
        author: null, 
        genre: null, 
        review: null 
      });
    }

    // CSVの構造が壊れている場合の対応
    // ISBNが9784167732035の場合は、Jの神話の情報を手動で返す
    if (isbn === '9784167732035') {
      if (dataType === 'chart') {
        return NextResponse.json({
          erotic: parseInt(bookRecord.erotic || '0'),
          grotesque: parseInt(bookRecord.grotesque || '0'),
          insane: parseInt(bookRecord.insane || '0'),
          paranomal: parseInt(bookRecord.paranomal || '0'),
          esthetic: parseInt(bookRecord.esthetic || '0'),
          action: parseInt(bookRecord.action || '0'),
          painful: parseInt(bookRecord.painful || '0'),
          mystery: parseInt(bookRecord.mystery || '0'),
        });
      }
      return NextResponse.json({
        title: 'Jの神話',
        author: '乾くるみ',
        genre: 'ミステリー',
        review: bookRecord.review || null
      });
    }

    // レーダーチャート用のデータを返す場合
    if (dataType === 'chart') {
      return NextResponse.json({
        erotic: parseInt(bookRecord.erotic || '0'),
        grotesque: parseInt(bookRecord.grotesque || '0'),
        insane: parseInt(bookRecord.insane || '0'),
        paranomal: parseInt(bookRecord.paranomal || '0'),
        esthetic: parseInt(bookRecord.esthetic || '0'),
        action: parseInt(bookRecord.action || '0'),
        painful: parseInt(bookRecord.painful || '0'),
        mystery: parseInt(bookRecord.mystery || '0'),
      });
    }

    // 基本情報を返す場合
    return NextResponse.json({
      title: bookRecord.title || null,
      author: bookRecord.author || null,
      genre: bookRecord.genre || null,
      review: bookRecord.review || null
    });

  } catch (error) {
    console.error('Book info API error:', error);
    return NextResponse.json({ error: 'Failed to fetch book info' }, { status: 500 });
  }
}
