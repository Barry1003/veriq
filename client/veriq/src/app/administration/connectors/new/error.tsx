"use client";

export default function NewConnectorError({ reset }: { reset: () => void }) {
  return (
    <section className="cw-page">
      <h1>Connector setup unavailable</h1>
      <p>The connector setup form could not be displayed.</p>
      <button type="button" className="cw-button cw-button-secondary" onClick={reset}>Try again</button>
    </section>
  );
}

