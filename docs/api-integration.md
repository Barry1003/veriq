# API integration

The frontend services expose stable functions to screens while adapters hide whether data comes from local fixtures or an API. Replace an adapter only after the backend contract is agreed; do not treat the placeholder paths in the services as finalized API contracts.

Environment configuration:

```env
NEXT_PUBLIC_DATA_SOURCE=mock
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Mock mode is the default and is clearly marked in the service layer. API mode validates HTTP responses before returning typed data. Authentication, retries, caching, and mutations should be added with the backend contract rather than invented in this foundation task.
