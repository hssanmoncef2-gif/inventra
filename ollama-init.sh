#!/bin/sh
# Robust Ollama model puller — retries until server is ready

MODEL="${OLLAMA_MODEL:-llama3.2}"
OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"

echo "=========================================="
echo "  Ollama Init — pulling model: $MODEL"
echo "=========================================="

# Wait for Ollama server to be reachable (up to 120 seconds)
MAX_WAIT=120
WAITED=0
echo "Waiting for Ollama server at $OLLAMA_HOST ..."

until curl -sf "$OLLAMA_HOST/api/tags" > /dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "ERROR: Ollama server did not respond after ${MAX_WAIT}s. Giving up."
    exit 1
  fi
  echo "  ... not ready yet (${WAITED}s elapsed), retrying in 5s"
  sleep 5
  WAITED=$((WAITED + 5))
done

echo "Ollama is up! Checking if model '$MODEL' is already downloaded..."

# Check if model already exists
if curl -sf "$OLLAMA_HOST/api/tags" | grep -q "\"$MODEL\""; then
  echo "Model '$MODEL' already exists. Skipping download."
  exit 0
fi

echo "Pulling model '$MODEL' (this may take a few minutes on first run)..."

# Pull via Ollama API (more reliable than CLI in containers)
curl -sf "$OLLAMA_HOST/api/pull" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$MODEL\", \"stream\": false}"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "Model '$MODEL' is ready!"
else
  echo "ERROR: Failed to pull model '$MODEL' (exit code $EXIT_CODE)"
  exit 1
fi
