"""Opt-in actual HTTP/PostgreSQL/local model acceptance, never a model double."""

import os

import pytest

pytestmark = [
    pytest.mark.full_stack,
    pytest.mark.skipif(
        os.getenv("VERIQ_FULL_STACK") != "1",
        reason="Requires fresh isolated Ticket 004 Compose stack",
    ),
]


def test_t004_16_complete_real_cedar_veriq_pipeline():
    from scripts.ticket004_demo import execute

    report = execute(project=os.getenv("VERIQ_STACK_PROJECT", "veriq-ticket004"))
    assert report["completed"], report.get("error")
    assert all(report["checks"].values())
    assert report["model_qualified"] is False
