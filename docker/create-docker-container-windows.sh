#!/bin/bash
set -euo pipefail

IMAGE_NAME="chess"
CONTAINER_NAME="chess"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CONTAINER_IDS=$(docker.exe ps -aq --filter "name=^/${CONTAINER_NAME}$")

if [ -n "$CONTAINER_IDS" ]; then
    echo "Stopping and removing container $CONTAINER_NAME..."
    docker.exe stop $CONTAINER_IDS
    docker.exe rm $CONTAINER_IDS
else
    echo "No container found with the name $CONTAINER_NAME."
fi

IMAGE_IDS=$(docker.exe images -q "$IMAGE_NAME")

if [ -n "$IMAGE_IDS" ]; then
    echo "Removing Docker image $IMAGE_NAME..."
    docker.exe rmi $IMAGE_IDS
else
    echo "No Docker image found with the name $IMAGE_NAME."
fi

echo "Building Docker image $IMAGE_NAME without cache..."
docker.exe build --no-cache -f "$PROJECT_ROOT/docker/Dockerfile" -t "$IMAGE_NAME" "$PROJECT_ROOT"

echo "Starting container $CONTAINER_NAME..."
docker.exe run -d -p 80:80 -p 443:443 --name "$CONTAINER_NAME" "$IMAGE_NAME"

echo "The container was successfully created and started."
echo "Access through https://localhost/"
