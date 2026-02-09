import Link from "next/link";

export type HeaderProps = {
  homeLink?: boolean;
  rightText?: string;
};

export default function Header({ homeLink = true, rightText = "Beta v0.1" }: HeaderProps) {
  const logo = (
    <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-900">
      <img src="/icon.svg" alt="Inflow" className="h-6 w-6" />
      Inflow
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
        {homeLink ? (
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-900 hover:text-blue-700 transition-colors"
          >
            <img src="/icon.svg" alt="Inflow" className="h-6 w-6" />
            Inflow
          </Link>
        ) : (
          logo
        )}
        <nav className="text-sm text-gray-500 font-medium">
          <span>{rightText}</span>
        </nav>
      </div>
    </header>
  );
}
