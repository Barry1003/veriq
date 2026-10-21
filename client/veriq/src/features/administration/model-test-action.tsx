"use client";

import { useState } from "react";

export function ModelTestAction() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="lai-test-action">
      <button
        className="lai-action-primary"
        type="button"
        onClick={() =>
          setMessage(
            "No authorized inference-test endpoint is connected. No model request was sent, and no runtime status was changed. The backend and AI owners must supply the approved test contract.",
          )
        }
        aria-describedby="lai-test-explanation"
      >
        Run approved model test
      </button>
      <p id="lai-test-explanation" className="lai-supporting">
        Run an authorized synthetic test; never use production customer evidence
        as a health probe.
      </p>
      {message && (
        <p className="lai-action-message" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
