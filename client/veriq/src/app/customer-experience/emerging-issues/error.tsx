"use client";

export default function ErrorView({ reset }: { reset: () => void }) {
  return <section className="ei-page" role="alert"><h1>Could not load emerging issues</h1><button className="ei-button" type="button" onClick={reset}>Try again</button></section>;
}

