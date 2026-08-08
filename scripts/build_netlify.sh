#!/bin/sh
set -eu

mkdir -p dist
cp index.html portfolio.html stylesheet.css java.js events.json dist/
cp -R images documents dist/
