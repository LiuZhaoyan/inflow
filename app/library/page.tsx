import Link from "next/link";
import { Brain, ArrowRight, BarChart } from "lucide-react";
import { getBooks } from "@/lib/db";
import Header from "@/components/Header";
import BooksManager from "@/components/user/BooksManager";

export default async function UserPage() {
  const books = await getBooks();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100">
      <Header />

      <main className="max-w-5xl mx-auto px-6 pb-20">
        <section className="py-10">
          <p className="text-sm font-semibold uppercase text-blue-600 tracking-wider mb-2">Your space</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 leading-tight">
            Manage everything you read in one place.
          </h1>
          <p className="text-base text-gray-600 max-w-2xl">
            Browse your collection, open a story, or upload fresh input. This is where you’ll spend most of your time inside
            Inflow.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="text-gray-400" size={24} />
              Your Library
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/read/${book.id}`}
                className="group relative bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:border-blue-100 transition-all duration-300 flex flex-col items-start"
              >
                <span
                  className={`
                  mb-4 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide
                  ${book.level === "Beginner" ? "bg-green-100 text-green-700" : ""}
                  ${book.level === "Intermediate" ? "bg-yellow-100 text-yellow-700" : ""}
                  ${book.level === "Advanced" ? "bg-red-100 text-red-700" : ""}
                  ${!["Beginner", "Intermediate", "Advanced"].includes(book.level) ? "bg-gray-100 text-gray-700" : ""}
                `}
                >
                  {book.level}
                </span>

                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {book.title}
                </h3>

                <div className="mt-auto w-full flex items-center justify-between border-t border-gray-50 pt-4">
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                    <BarChart size={12} />
                    {book.metadata?.sentenceCount ?? 0} Sentences
                  </span>
                  <span className="text-blue-600 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read Now <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}

            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 gap-2 min-h-[200px]">
              <span className="text-sm font-medium">More books coming soon</span>
            </div>
          </div>

          <BooksManager books={books} />
        </section>
      </main>
    </div>
  );
}


