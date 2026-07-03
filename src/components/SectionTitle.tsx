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
      <p className="paper-chip mb-3">{eyebrow}</p>
      <h1 className="paper-title text-3xl md:text-4xl mb-3 leading-tight">
        {title}
        {highlight ? (
          <span className="ml-1 text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#a855f7]">
            {highlight}
          </span>
        ) : null}
      </h1>
      <p className="paper-subtitle text-base max-w-2xl">{description}</p>
    </section>
  );
}
