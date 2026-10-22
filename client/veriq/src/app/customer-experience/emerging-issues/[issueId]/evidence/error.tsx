"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="ep-page" role="alert">
      <h1>Evidence could not be displayed</h1>
      <p>Try loading this view again.</p>
      <button className="ep-button" type="button" onClick={reset}>Retry</button>
    </section>
  );
}

