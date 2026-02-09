interface SectionTitleProps {
  eyebrow: string;
  title: string;
  highlight?: string;
  description: string;
}

export default function SectionTitle({
  eyebrow,
  title,
  highlight,
  description,
}: SectionTitleProps) {
  return (
    <section className="py-10">
      <p className="text-sm font-semibold uppercase text-blue-600 tracking-wider mb-2">{eyebrow}</p>
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 leading-tight">
        {title}
        {highlight ? (
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            {highlight}
          </span>
        ) : null}
      </h1>
      <p className="text-base text-gray-600 max-w-2xl">{description}</p>
    </section>
  );
}
