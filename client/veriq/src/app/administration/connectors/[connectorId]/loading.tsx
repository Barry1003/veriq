export default function LoadingConnectorDetail() {
  return (
    <section className="cd-page" aria-busy="true" aria-live="polite">
      <p className="cd-overline">ADMINISTRATION / CONNECTOR DETAIL</p>
      <h1>Loading connector evidence…</h1>
      <p>
        Retrieving the selected connector view. No health state is inferred
        while loading.
      </p>
    </section>
  );
}
