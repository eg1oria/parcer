export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  align?: "center" | "left";
  description: string;
  eyebrow: string;
  title: string;
}) {
  const alignment = align === "center" ? "mx-auto text-center" : "text-left";

  return (
    <div className={`max-w-3xl ${alignment}`}>
      <p className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-[#7ee0ff]">
        {eyebrow}
      </p>
      <h2 className="font-brand text-3xl leading-tight text-white sm:text-4xl lg:text-[3.2rem]">
        {title}
      </h2>
      <p className="mt-5 text-base leading-7 text-[#8fa5c2] sm:text-lg">{description}</p>
    </div>
  );
}
