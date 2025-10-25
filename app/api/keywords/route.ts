import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Python API サーバーにリクエストを送信
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${pythonApiUrl}/keywords`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Python API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'キーワード抽出に失敗しました' },
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
