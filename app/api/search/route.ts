import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: '検索クエリが必要です' },
        { status: 400 }
      );
    }

    // Python API サーバーにリクエストを送信
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${pythonApiUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error('Python API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: '検索処理中にエラーが発生しました' },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('APIエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
