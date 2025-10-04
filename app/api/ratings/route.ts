import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const RATINGS_FILE = path.join(process.cwd(), 'data', 'ratings.csv');

interface Rating {
  id: string;
  isbn: string;
  userId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

// CSVファイルから評価データを読み込み
function readRatings(): Rating[] {
  try {
    if (!fs.existsSync(RATINGS_FILE)) {
      return [];
    }
    
    const data = fs.readFileSync(RATINGS_FILE, 'utf-8');
    const lines = data.trim().split('\n');
    
    
    // 空行をフィルタリング
    const validLines = lines.slice(1).filter(line => line.trim() !== "");
    if (validLines.length === 0) return [];
    
    if (lines.length <= 1) return [];
    
    return validLines.map(line => {
      const [id, isbn, userId, rating, createdAt, updatedAt] = line.split(',');
      return {
        id,
        isbn,
        userId,
        rating: parseInt(rating),
        createdAt,
        updatedAt
      };
    });
  } catch (error) {
    console.error('評価データの読み込みエラー:', error);
    return [];
  }
}

// CSVファイルに評価データを書き込み
function writeRatings(ratings: Rating[]): void {
  try {
    const csvContent = 'id,isbn,userId,rating,createdAt,updatedAt\n' +
      ratings.map(rating => 
        `${rating.id},${rating.isbn},${rating.userId},${rating.rating},${rating.createdAt},${rating.updatedAt}`
      ).join('\n');
    
    fs.writeFileSync(RATINGS_FILE, csvContent, 'utf-8');
  } catch (error) {
    console.error('評価データの書き込みエラー:', error);
    throw error;
  }
}

// ユーザーIDを生成（セッションIDまたはIPアドレスベース）
function generateUserId(request: NextRequest): string {
  // セッションIDがあれば使用、なければIPアドレスを使用
  const sessionId = request.headers.get('x-session-id');
  if (sessionId) {
    return sessionId;
  }
  
  // IPアドレスを取得
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             '127.0.0.1';
  
  return `ip_${ip}`;
}

// GET: 特定のISBNの評価を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get('isbn');
    
    if (!isbn) {
      return NextResponse.json({ error: 'ISBNが必要です' }, { status: 400 });
    }
    
    const ratings = readRatings();
    const bookRatings = ratings.filter(rating => rating.isbn === isbn);
    
    // 平均評価を計算
    const averageRating = bookRatings.length > 0 
      ? bookRatings.reduce((sum, rating) => sum + rating.rating, 0) / bookRatings.length
      : 0;
    
    return NextResponse.json({
      ratings: bookRatings,
      averageRating: Math.round(averageRating * 10) / 10, // 小数点第1位まで
      totalRatings: bookRatings.length
    });
    
  } catch (error) {
    console.error('評価取得エラー:', error);
    return NextResponse.json({ error: '評価の取得に失敗しました' }, { status: 500 });
  }
}

// POST: 評価を投稿・更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isbn, rating } = body;
    
    if (!isbn || !rating) {
      return NextResponse.json({ error: 'ISBNと評価が必要です' }, { status: 400 });
    }
    
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: '評価は1〜5の整数である必要があります' }, { status: 400 });
    }
    
    const userId = generateUserId(request);
    const ratings = readRatings();
    
    // 既存の評価をチェック
    const existingRatingIndex = ratings.findIndex(r => r.isbn === isbn && r.userId === userId);
    const now = new Date().toISOString();
    
    if (existingRatingIndex >= 0) {
      // 既存の評価を更新
      ratings[existingRatingIndex].rating = rating;
      ratings[existingRatingIndex].updatedAt = now;
    } else {
      // 新しい評価を追加
      const newRating: Rating = {
        id: uuidv4(),
        isbn,
        userId,
        rating,
        createdAt: now,
        updatedAt: now
      };
      ratings.push(newRating);
    }
    
    writeRatings(ratings);
    
    // 更新された平均評価を計算
    const bookRatings = ratings.filter(r => r.isbn === isbn);
    const averageRating = bookRatings.reduce((sum, r) => sum + r.rating, 0) / bookRatings.length;
    
    return NextResponse.json({
      success: true,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: bookRatings.length,
      userRating: rating
    });
    
  } catch (error) {
    console.error('評価投稿エラー:', error);
    return NextResponse.json({ error: '評価の投稿に失敗しました' }, { status: 500 });
  }
}
