import { getBookById } from '@/lib/db';
import ReaderInterface from '@/components/ReaderInterface';

// 注意 1: 将 params 的类型定义为 Promise
interface PageProps {
  params: Promise<{ id: string }>;
}

// 注意 2: 组件必须是 async 的
export default async function ReadPage({ params }: PageProps) {
  // 注意 3: 先 await params
  const { id } = await params;

  // 现在使用解析出来的 id
  const book = await getBookById(id);

  if (!book) return (
    <div className="flex h-screen items-center justify-center text-gray-500">
      Book not found
    </div>
  );

  return (
    <div className="p-6">
      <div className="mt-6">
        <ReaderInterface 
          bookId={book.id} 
          content={book.content} 
        />
      </div>
    </div>
  );
}
