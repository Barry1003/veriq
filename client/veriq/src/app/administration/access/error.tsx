"use client";

export default function AccessPoliciesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="ap-page" role="alert">
      <h1>Access policy reference unavailable</h1>
      <p>
        Unable to load the illustrative role and policy data. No permission
        changes have been made.
      </p>
      <button
        className="ap-action ap-action-secondary"
        type="button"
        onClick={reset}
      >
        Retry loading
      </button>
    </div>
  );
}
