/** Squelette générique de page dashboard — feedback instantané pendant le chargement. */
export function PageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-5 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-lg bg-[--card]" />
        <div className="h-4 w-72 rounded bg-[--card]/70" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-[--card] border border-[--border]" />
        ))}
      </div>
      <div className="rounded-xl border border-[--border] bg-[--card] p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-[--background-subtle]" />
        ))}
      </div>
    </div>
  );
}

export default function PageSkeletonDefault() {
  return <PageSkeleton />;
}
