#!/bin/bash
API_KEY=$GEMINI_API_KEY
MODEL="gemini-1.5-flash"

echo "Testing curl for $MODEL..."

curl -H 'Content-Type: application/json' \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/$MODEL:generateContent?key=$API_KEY"
