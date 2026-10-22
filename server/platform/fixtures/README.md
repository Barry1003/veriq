# Synthetic fixtures

The bank seed is `apps/cedar/backend/service.py::seed`, invoked only through the development simulator permission. It creates two synthetic accounts and a source-backed institution inventory. It does not seed Veriq conclusions.

`python -m scripts.demo` uses ordinary Cedar banking/customer APIs plus explicitly restricted gateway conditions, then pulls the resulting evidence through Veriq connectors. `contracts/examples/*.synthetic.json` are captured responses from that actual HTTP execution. Automated adversarial fixtures are in `tests/conftest.py`; model fixtures exist only in `tests/test_inference.py` and are labelled test doubles.

All identifiers, accounts, balances, reports, statuses and inventory data in these fixtures are synthetic. No real customer data or real bank credentials are included.
