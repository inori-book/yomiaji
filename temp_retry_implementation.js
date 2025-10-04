        // 楽天ブックスAPIから情報を取得（リトライ機能付き）
        const rakutenData: { [isbn: string]: RakutenBookInfo } = {};
        
        // リトライ機能付きの楽天API呼び出し関数
        const fetchRakutenWithRetry = async (isbn: string, maxRetries: number = 3): Promise<RakutenBookInfo> => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const response = await fetch(`/api/rakuten?isbn=${isbn}`);
              if (response.ok) {
                return await response.json();
              } else if (response.status === 429 && attempt < maxRetries) {
                // レート制限の場合は待機してリトライ
                const waitTime = Math.pow(2, attempt) * 1000; // 指数バックオフ
                console.log(`楽天API レート制限 (ISBN: ${isbn}), ${waitTime}ms待機してリトライ (${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              } else {
                throw new Error(`HTTP ${response.status}`);
              }
            } catch (error) {
              if (attempt === maxRetries) {
                console.error(`楽天API取得失敗 (ISBN: ${isbn}):`, error);
                return {
                  title: null,
                  author: null,
                  publisher: null,
                  publicationDate: null,
                  price: null,
                  imageUrl: null,
                  description: null
                };
              }
              const waitTime = Math.pow(2, attempt) * 1000;
              console.log(`楽天API エラー (ISBN: ${isbn}), ${waitTime}ms待機してリトライ (${attempt}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
          return {
            title: null,
            author: null,
            publisher: null,
            publicationDate: null,
            price: null,
            imageUrl: null,
            description: null
          };
        };

        for (const result of data.results) {
          rakutenData[result.isbn] = await fetchRakutenWithRetry(result.isbn);
          // レート制限回避のため少し待機
          await new Promise(resolve => setTimeout(resolve, 100));
        }
