export default function CalendarLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-20 w-full animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
