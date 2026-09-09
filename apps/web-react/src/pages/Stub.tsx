export function Stub({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm opacity-70">
        Ported route placeholder — see REACT-MIGRATION-CHECKLIST.md §3 for the SvelteKit source and
        query/mutation mapping.
      </p>
    </div>
  );
}
