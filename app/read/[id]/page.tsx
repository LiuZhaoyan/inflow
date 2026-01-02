import { getBookById } from '@/lib/db';
import ReaderInterface from '@/components/ReaderInterface';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadPage({ params }: PageProps) {
  const { id } = await params;

  const book = await getBookById(id);
  if (!book) return (
    <div className="flex h-screen items-center justify-center text-gray-500">
      Book not found
    </div>
  );

  return (
    <ReaderInterface 
      bookId={book.id} 
      chapters={book.chapters || []}
      initialLanguage={book.language || book.metadata?.language}
    />
  );
}
