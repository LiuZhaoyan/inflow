interface VocabularyLayoutProps {
  children: React.ReactNode;
}

export default function VocabularyLayout({ children }: VocabularyLayoutProps) {
  return <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans selection:bg-blue-100">{children}</div>;
}
