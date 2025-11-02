import { notFound } from 'next/navigation';
import BookDetailClient from './BookDetailClient';

// 静的生成用: すべてのISBNをビルド時に生成
export async function generateStaticParams() {
  // database.csvからすべてのISBNを取得
  const fs = await import('fs');
  const path = await import('path');
  const { parse } = await import('csv-parse/sync');
  
  const databasePath = path.join(process.cwd(), 'public', 'database.csv');
  const databaseData = fs.readFileSync(databasePath, 'utf-8');
  
  const records = parse(databaseData, {
    columns: true,
    skip_empty_lines: true,
    quote: '"',
    escape: '"'
  });
  
  // すべてのISBNを返す
  return records
    .filter((record: any) => record.ISBN)
    .map((record: any) => ({
      isbn: record.ISBN
    }));
}

interface PageProps {
  params: Promise<{ isbn: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function BookDetailPage({ params, searchParams }: PageProps) {
  const { isbn } = await params;
  const { q: query } = await searchParams;
  
  return <BookDetailClient isbn={isbn} query={query || ''} />;
}
