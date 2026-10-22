"use client";

import Link from "next/link";

export default function ConnectorDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="cd-page" role="alert">
      <p className="cd-overline">ADMINISTRATION / CONNECTOR DETAIL</p>
      <h1>Connector evidence could not be loaded</h1>
      <p>
        The detail view is unavailable. No connection or source-health result
        can be inferred.
      </p>
      <p className="cd-error-message">{error.message}</p>
      <div className="cd-button-row">
        <button
          type="button"
          className="cd-button cd-button-primary"
          onClick={reset}
        >
          Retry loading
        </button>
        <Link className="cd-button" href="/administration/connectors">
          Back to registry
        </Link>
      </div>
    </section>
  );
}
