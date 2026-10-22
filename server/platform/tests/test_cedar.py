from fastapi.testclient import TestClient

from apps.cedar.backend.api import create_app
from shared.contracts import now
from tests.conftest import header


def bank_seed(system):
    result = system["c"].post("/v1/simulator/seed", headers=header())
    assert result.status_code == 200, result.text
    return system["c"]


def request_transfer(c, key="test-1", token="customer1", account="A1", route="R1", amount=1000):
    return c.post(
        "/v1/transfers",
        headers=header(token),
        json={
            "account_id": account,
            "route_id": route,
            "amount_minor": amount,
            "idempotency_key": key,
        },
    )


def test_transfer_debit_is_idempotent_and_insufficient_funds_rejected(system):
    c = bank_seed(system)
    a = request_transfer(c)
    b = request_transfer(c)
    assert a.status_code == b.status_code == 201
    assert a.json()["id"] == b.json()["id"]
    account = c.get("/v1/accounts", headers=header("customer1")).json()[0]["data"]
    assert account["balance_minor"] == 100000000 - 1000
    assert account["reserved_minor"] == 0
    assert request_transfer(c, key="too-large", amount=100000001).status_code == 409
    assert request_transfer(c, amount=2000).status_code == 409


def test_timeout_reserves_and_authorized_reconciliation_settles(system):
    c = bank_seed(system)
    c.post("/v1/simulator/conditions", headers=header(), json={"gateway_id": "G1", "timeout": True})
    tx = request_transfer(c).json()
    assert tx["data"]["status"] == "pending" and tx["data"]["response"] == "timeout"
    account = c.get("/v1/accounts", headers=header("customer1")).json()[0]["data"]
    assert account["reserved_minor"] == 1000 and account["balance_minor"] == 100000000
    request = {
        "outcome": "completed",
        "rationale": "Synthetic bank settlement verified",
        "beneficiary_verified": False,
    }
    assert (
        c.post(
            f"/v1/transactions/{tx['data']['transaction_id']}/reconcile",
            headers=header("customer1"),
            json=request,
        ).status_code
        == 403
    )
    result = c.post(
        f"/v1/transactions/{tx['data']['transaction_id']}/reconcile", headers=header(), json=request
    )
    assert result.status_code == 200 and result.json()["data"]["version"] == 2
    account = c.get("/v1/accounts", headers=header("customer1")).json()[0]["data"]
    assert account["reserved_minor"] == 0 and account["balance_minor"] == 99999000
    assert (
        c.post(
            f"/v1/transactions/{tx['data']['transaction_id']}/reconcile",
            headers=header(),
            json=request,
        ).status_code
        == 409
    )


def test_failed_reconciliation_releases_reservation(system):
    c = bank_seed(system)
    c.post("/v1/simulator/conditions", headers=header(), json={"gateway_id": "G1", "timeout": True})
    txid = request_transfer(c).json()["data"]["transaction_id"]
    result = c.post(
        f"/v1/transactions/{txid}/reconcile",
        headers=header(),
        json={"outcome": "failed", "rationale": "Synthetic decline verified"},
    )
    assert result.status_code == 200
    account = c.get("/v1/accounts", headers=header("customer1")).json()[0]["data"]
    assert account["balance_minor"] == 100000000 and account["reserved_minor"] == 0


def test_customer_ownership_and_simulator_isolation(system):
    c = bank_seed(system)
    assert request_transfer(c, token="customer2").status_code == 404
    assert (
        c.post(
            "/v1/simulator/conditions",
            headers=header("customer1"),
            json={"gateway_id": "G1", "timeout": True},
        ).status_code
        == 403
    )
    a = request_transfer(c).json()
    assert c.get("/v1/transactions", headers=header("customer2")).json() == []
    assert (
        c.post(
            "/v1/interactions",
            headers=header("customer2"),
            json={
                "channel": "email",
                "customer_id": "C2",
                "transaction_id": a["data"]["transaction_id"],
                "text": "My transfer delayed",
            },
        ).status_code
        == 422
    )
    disabled = TestClient(create_app(system["cdb"], system["auth"], simulator=False))
    assert disabled.post("/v1/simulator/seed", headers=header()).status_code == 404


def test_real_cedar_feed_to_veriq_all_three_pillars(system):
    c = bank_seed(system)
    system["connect"]()
    c.post("/v1/simulator/conditions", headers=header(), json={"gateway_id": "G1", "timeout": True})
    txids = []
    for i in range(10):
        tx = request_transfer(c, key=f"batch-{i}")
        assert tx.status_code == 201
        txids.append(tx.json()["data"]["transaction_id"])
    for txid, channel in zip(txids, ["in_app", "email", "contact_centre", "branch"]):
        assert (
            c.post(
                "/v1/interactions",
                headers=header("customer1"),
                json={
                    "customer_id": "C1",
                    "channel": channel,
                    "transaction_id": txid,
                    "text": "Transfer failed; not received",
                },
            ).status_code
            == 201
        )
    system["pull"]()
    v = system["v"]
    assert len(v.get("/v1/incidents", headers=header()).json()) == 1
    assert len(v.get("/v1/interactions", headers=header()).json()) == 4
    assert v.get("/v1/knowledge/context", headers=header()).json()["relationships"]
    assert v.get("/v1/issues", headers=header()).json()[0]["data"]["count"] == 4
    inv = next(
        i
        for i in v.get("/v1/investigations", headers=header()).json()
        if i["data"]["trigger_type"] == "interaction"
    )
    workspace = v.get(f"/v1/investigations/{inv['id']}/workspace", headers=header()).json()
    assert workspace["revisions"][-1]["data"]["correlations"]
    before = len(v.get("/v1/evidence", headers=header()).json())
    system["pull"]()
    assert len(v.get("/v1/evidence", headers=header()).json()) == before
    assert (
        c.post(
            f"/v1/transactions/{txids[0]}/reconcile",
            headers=header(),
            json={"outcome": "completed", "rationale": "Synthetic authoritative reconciliation"},
        ).status_code
        == 200
    )
    system["pull"]()
    workspace = v.get(f"/v1/investigations/{inv['id']}/workspace", headers=header()).json()
    assert any(f["kind"] == "contradiction" for f in workspace["revisions"][-1]["data"]["findings"])


def test_bank_config_change_updates_veriq_without_changing_old_transaction_path(system):
    c = bank_seed(system)
    system["connect"]()
    tx = request_transfer(c).json()["data"]
    system["pull"]()
    configs = c.get("/v1/institutional/configurations", headers=header()).json()
    config = configs[-1]["data"]["knowledge"]
    config["valid_from"] = now()
    config["relationships"][0]["object"] = "G2"
    assert (
        c.post("/v1/institutional/configurations", headers=header(), json=config).status_code == 201
    )
    system["pull"]()
    v = system["v"]
    current = v.get("/v1/knowledge/context", headers=header()).json()
    assert next(e for e in current["relationships"] if e["subject"] == "R1")["object"] == "G2"
    old = v.get("/v1/knowledge/context", headers=header(), params={"at": tx["occurred_at"]}).json()
    assert next(e for e in old["relationships"] if e["subject"] == "R1")["object"] == "G1"
    assert c.get("/v1/transactions", headers=header()).json()[0]["data"]["gateway_id"] == "G1"
    assert request_transfer(c, key="after-change").json()["data"]["gateway_id"] == "G2"


def test_concurrent_transfer_requests_cannot_overspend_balance(system):
    from concurrent.futures import ThreadPoolExecutor

    c = bank_seed(system)
    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(
            executor.map(
                lambda key: request_transfer(c, key=key, amount=70000000),
                ["concurrent-a", "concurrent-b"],
            )
        )
    assert sorted(r.status_code for r in responses) == [201, 409]
    account = c.get("/v1/accounts", headers=header("customer1")).json()[0]["data"]
    assert account["balance_minor"] == 30000000
