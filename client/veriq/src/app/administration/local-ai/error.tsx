"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="lai-error" role="alert">
      <h1>Local AI runtime information unavailable</h1>
      <p>
        No authenticated runtime status could be retrieved. Model readiness is
        unknown, not healthy.
      </p>
      <p>
        When using API mode, a verified contract must be supplied by the backend
        and AI owners.
      </p>
      <button type="button" className="lai-action-primary" onClick={reset}>
        Retry loading
      </button>
    </div>
  );
}
