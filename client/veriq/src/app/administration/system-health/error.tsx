"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="sh-page" role="alert">
      <h1>System health unavailable</h1>
      <p>
        No health or readiness result could be retrieved. The interface does not
        infer that the deployment is healthy.
      </p>
      <p className="sh-error-explanation">
        If the selected source is API mode, its authenticated response contract
        must be supplied by the backend team. No healthy state is inferred.
      </p>
      <button className="sh-primary-link" type="button" onClick={reset}>
        Retry loading
      </button>
    </div>
  );
}
