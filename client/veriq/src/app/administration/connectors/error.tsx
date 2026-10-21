"use client";

export default function ConnectorRegistryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="cr-page" role="alert">
      <h1>Connector registry unavailable</h1>
      <p>{error.message}</p>
      <button type="button" className="cr-btn" onClick={reset}>
        Retry
      </button>
    </div>
  );
}
