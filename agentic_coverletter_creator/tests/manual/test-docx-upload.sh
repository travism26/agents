#!/bin/bash

# Test script for DOCX file upload
# Usage: ./test-docx-upload.sh <path-to-docx-file>

if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-docx-file>"
  exit 1
fi

DOCX_FILE=$1

# Check if file exists
if [ ! -f "$DOCX_FILE" ]; then
  echo "Error: File $DOCX_FILE does not exist"
  exit 1
fi

# Check if file is a DOCX file
if [[ "$DOCX_FILE" != *.docx ]]; then
  echo "Warning: File $DOCX_FILE does not have a .docx extension"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "Testing DOCX file upload with $DOCX_FILE..."
echo "Sending request to http://localhost:3000/api/generate-cover-letter..."

# Send request with curl
curl -X POST http://localhost:3000/api/generate-cover-letter \
  -F "resume=@$DOCX_FILE" \
  -F "companyName=TestCompany" \
  -F "jobTitle=Senior Developer" \
  -F "jobDescription=We are looking for a senior developer with experience in TypeScript and Node.js." \
  -F "tonePreference=PROFESSIONAL" \
  -v

echo
echo "Test completed."
