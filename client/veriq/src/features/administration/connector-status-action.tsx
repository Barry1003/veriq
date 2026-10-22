"use client";

import { useState } from "react";

export function ConnectorStatusAction() {
  const [showLimitation, setShowLimitation] = useState(false);

  return (
    <div className="cd-status-action">
      <button
        type="button"
        className="cd-button cd-button-secondary"
        aria-expanded={showLimitation}
        aria-controls="cd-check-limitation"
        onClick={() => setShowLimitation((current) => !current)}
      >
        Check source status
      </button>
      {showLimitation && (
        <p
          id="cd-check-limitation"
          className="cd-check-limitation"
          role="status"
        >
          No live check was sent. The authenticated connector-health endpoint is
          not integrated. Current source authorization, connectivity,
          processing, and freshness remain unverified.
        </p>
      )}
    </div>
  );
}
