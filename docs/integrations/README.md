# Integration notes

The applications select `mock` or `api` through `NEXT_PUBLIC_DATA_SOURCE` and use `NEXT_PUBLIC_API_BASE_URL` for the API adapter. Service interfaces remain stable so UI code does not import mock records directly. Backend contracts must be agreed before adding endpoint-specific types.
