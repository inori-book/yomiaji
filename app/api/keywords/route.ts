import { NextRequest, NextResponse } from 'next/server';
import { pyKeywords } from '@/lib/py';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'テキストが必要です' },
        { status: 400 }
      );
    }

    const result = await pyKeywords(text);
    return NextResponse.json(result);

  } catch (error) {
    console.error('APIエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
