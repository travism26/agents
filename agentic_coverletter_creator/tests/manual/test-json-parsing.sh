#!/bin/bash

# Test script to verify JSON parsing fixes
# This script tests the cover letter generation with a focus on the evaluation steps
# that were previously failing with JSON parsing errors

echo "Testing JSON parsing fixes in cover letter generation..."

# Set API endpoint
API_URL="http://localhost:3000/api/cover-letter"

# Path to sample resume
RESUME_PATH="./tests/fixtures/sample_resume.json"

# Job details
JOB_TITLE="Software Engineer"
COMPANY_NAME="TechCorp"
JOB_DESCRIPTION="We are looking for a skilled Software Engineer with experience in TypeScript, Node.js, and API development."

# Create form data for the request
echo "Sending request to generate cover letter..."
curl -X POST $API_URL \
  -F "resume=@$RESUME_PATH" \
  -F "jobTitle=$JOB_TITLE" \
  -F "companyName=$COMPANY_NAME" \
  -F "jobDescription=$JOB_DESCRIPTION" \
  -F "approach=SKILLS_HIGHLIGHT" \
  -F "tonePreference=PROFESSIONAL" \
  -F "enableEvaluation=true" \
  -F "maxIterations=1" \
  -o response.json

echo "Response saved to response.json"
echo "Check server logs for any JSON parsing errors"
echo "If no 'Unexpected token' errors appear, the fix was successful"
