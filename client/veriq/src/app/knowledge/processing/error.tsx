"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="kp-page" role="alert">
      <h1>Knowledge processing unavailable</h1>
      <p>Could not display the review queue.</p>
      <button className="kp-button kp-button-secondary" type="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
