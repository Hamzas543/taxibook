#!/bin/bash

# Build script for Ionic Appflow

echo "Installing dependencies..."
pnpm install

echo "Building web app..."
pnpm build

echo "Syncing Capacitor..."
pnpm exec cap sync

echo "Build completed successfully!"
