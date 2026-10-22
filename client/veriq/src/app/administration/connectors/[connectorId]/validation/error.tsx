"use client";

export default function ConnectorTestError({ reset }: { reset: () => void }) {
  return (
    <section className="cw-page">
      <h1>Connector validation unavailable</h1>
      <p>Validation information could not be retrieved.</p>
      <button type="button" className="cw-button cw-button-secondary" onClick={reset}>Try again</button>
    </section>
  );
}

