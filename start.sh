#!/bin/bash

# BrandonNet Netstack Launcher
# Usage: ./start.sh <stack-folder>
# Example: ./start.sh npm

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGES_DIR="$SCRIPT_DIR/images"
STACK="$1"

if [ -z "$STACK" ]; then
  echo "Usage: ./start.sh <stack-folder>"
  echo "Available stacks:"
  ls -d "$SCRIPT_DIR"/*/  | xargs -n1 basename | grep -v images
  exit 1
fi

COMPOSE_FILE="$SCRIPT_DIR/$STACK/docker-compose.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ No docker-compose.yml found in $STACK/"
  exit 1
fi

echo "🔍 Checking images for stack: $STACK"

# Extract image names from compose file
IMAGES=$(grep '^\s*image:' "$COMPOSE_FILE" | awk '{print $2}')

for IMAGE in $IMAGES; do
  # Sanitize image name for use as filename
  IMAGE_FILE="$IMAGES_DIR/$(echo "$IMAGE" | sed 's|[/:]|_|g').tar"
  IMAGE_TAG="${IMAGE}"

  # Check if image already loaded in Docker
  if docker image inspect "$IMAGE_TAG" > /dev/null 2>&1; then
    echo "✅ Already loaded: $IMAGE"
    continue
  fi

  # Check local images folder
  if [ -f "$IMAGE_FILE" ]; then
    echo "📦 Loading from local cache: $IMAGE_FILE"
    docker load -i "$IMAGE_FILE"
  else
    echo "⬇️  Pulling from registry: $IMAGE"
    docker pull "$IMAGE"
    echo "💾 Saving to local cache: $IMAGE_FILE"
    docker save -o "$IMAGE_FILE" "$IMAGE"
    echo "✅ Saved: $IMAGE_FILE"
  fi
done

echo ""
echo "🚀 Starting stack: $STACK"
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "✅ Stack '$STACK' is up!"
docker compose -f "$COMPOSE_FILE" ps
