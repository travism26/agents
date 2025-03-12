#!/bin/bash

# Test script for multiple cover letter generation with form data
# This tests the fixed boolean parameter handling in the API

echo "Testing multiple cover letter generation with form data..."

curl -X POST http://localhost:3000/api/generate-cover-letter \
  -F "resume=@$(dirname "$0")/../fixtures/sample_resume.json" \
  -F "companyName=TEKSystems" \
  -F "jobTitle=Java Developer" \
  -F "jobDescription=Looking for a hands-on JAVA Developer with 3+ years of experience in Java/J2EE development, Spring MVC framework, and WebServices (SOAP/REST)." \
  -F "tonePreference=PROFESSIONAL" \
  -F "generateMultiple=true" \
  -F "approaches[]=REQUIREMENTS_TABLE" \
  -F "approaches[]=ACHIEVEMENT_FOCUSED"

echo -e "\n\nTest completed."
