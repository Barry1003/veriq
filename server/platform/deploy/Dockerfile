FROM docker.io/library/python:3.12-slim
RUN pip install --no-cache-dir uv==0.12.19
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY apps ./apps
COPY shared ./shared
COPY scripts ./scripts
COPY migrations ./migrations
COPY alembic.ini ./
RUN useradd --create-home --uid 10001 veriq
USER veriq
ENV PATH="/app/.venv/bin:$PATH"
CMD ["python", "-m", "scripts.run", "veriq", "--container", "--host", "0.0.0.0"]
