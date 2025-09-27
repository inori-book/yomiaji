import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: '検索クエリが必要です' },
        { status: 400 }
      );
    }

    // Pythonスクリプトを実行
    const pythonProcess = spawn('python3', ['search_engine.py', query]);
    
    let result = '';
    let error = '';

    // 標準出力を取得
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    // エラー出力を取得
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    // プロセス完了を待機
    return new Promise<Response>((resolve) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Pythonスクリプトエラー:', error);
          resolve(
            NextResponse.json(
              { error: '検索処理中にエラーが発生しました' },
              { status: 500 }
            )
          );
          return;
        }

        try {
          const searchResults = JSON.parse(result);
          resolve(NextResponse.json(searchResults));
        } catch (parseError) {
          console.error('JSON解析エラー:', parseError);
          resolve(
            NextResponse.json(
              { error: '検索結果の解析に失敗しました' },
              { status: 500 }
            )
          );
        }
      });
    });

  } catch (error) {
    console.error('APIエラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
