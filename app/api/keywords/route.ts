import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function GET(request: NextRequest) {
  try {
    // Pythonスクリプトを実行してキーワードを抽出
    const pythonProcess = spawn('python3', ['extract_keywords.py']);
    
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
          console.error('キーワード抽出エラー:', error);
          resolve(
            NextResponse.json(
              { error: 'キーワード抽出に失敗しました' },
              { status: 500 }
            )
          );
          return;
        }

        try {
          const keywords = JSON.parse(result);
          resolve(NextResponse.json(keywords));
        } catch (parseError) {
          console.error('JSON解析エラー:', parseError);
          resolve(
            NextResponse.json(
              { error: 'キーワードデータの解析に失敗しました' },
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
