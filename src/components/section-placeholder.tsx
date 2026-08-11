export function SectionPlaceholder({
  badge,
  title,
  description,
  planned,
}: {
  badge: string;
  title: string;
  description: string;
  planned: readonly string[];
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6">
      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
        {badge}
      </span>
      <h2 className="mt-3 text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      <p className="mt-5 text-xs font-medium tracking-wide text-gray-500 uppercase">
        Planned for later milestones
      </p>
      <ul className="mt-2 space-y-1 text-sm text-gray-700">
        {planned.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span aria-hidden className="size-1.5 rounded-full bg-indigo-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
