"use client";
export default function CustomerInteractionsError({ reset }: { reset: () => void }) {
  return (
    <section className="cx-page" role="alert">
      <h1>Unable to load customer interactions</h1>
      <p>Something went wrong while opening this page.</p>
      <button className="cx-button" type="button" onClick={reset}>Try again</button>
    </section>
  );
}

