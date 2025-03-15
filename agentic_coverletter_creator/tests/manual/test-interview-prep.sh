#!/bin/bash

# Test script for the interview preparation feature
# This script tests both the standalone interview preparation endpoint
# and the integration with the cover letter generation endpoint

# Set the API base URL
API_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing Interview Preparation Feature ===${NC}"
echo -e "${BLUE}Make sure the server is running on $API_URL${NC}"
echo ""

# Test 1: Standalone interview preparation endpoint
echo -e "${BLUE}Test 1: Standalone interview preparation endpoint${NC}"
echo "Sending request to $API_URL/api/interview-prep"

curl -s -X POST \
  "$API_URL/api/interview-prep" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Corporation",
    "jobDescription": "We are looking for a senior software engineer with experience in React, Node.js, and AWS. The ideal candidate will have 5+ years of experience in full-stack development and a strong understanding of cloud architecture. Responsibilities include designing and implementing new features, optimizing application performance, and collaborating with cross-functional teams.",
    "options": {
      "questionCount": 5,
      "includeSuggestedAnswers": true,
      "difficultyLevel": "intermediate",
      "focusAreas": ["technical", "cultural", "company-specific"]
    }
  }' | jq '.' || echo -e "${RED}Failed to parse JSON response${NC}"

echo ""
echo -e "${GREEN}Test 1 completed${NC}"
echo ""

# Test 2: Interview preparation with cover letter generation
echo -e "${BLUE}Test 2: Interview preparation with cover letter generation${NC}"
echo "Sending request to $API_URL/api/cover-letter"

curl -s -X POST \
  "$API_URL/api/cover-letter" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Corporation",
    "jobTitle": "Senior Software Engineer",
    "jobDescription": "We are looking for a senior software engineer with experience in React, Node.js, and AWS. The ideal candidate will have 5+ years of experience in full-stack development and a strong understanding of cloud architecture. Responsibilities include designing and implementing new features, optimizing application performance, and collaborating with cross-functional teams.",
    "resume": {
      "personalInfo": {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "123-456-7890",
        "location": "San Francisco, CA"
      },
      "experience": [
        {
          "title": "Software Engineer",
          "company": "Tech Company",
          "duration": "2020-2023",
          "description": "Developed and maintained web applications using React and Node.js. Implemented CI/CD pipelines and deployed applications to AWS."
        },
        {
          "title": "Junior Developer",
          "company": "Startup Inc",
          "duration": "2018-2020",
          "description": "Worked on front-end development using React and Redux. Collaborated with designers to implement UI/UX improvements."
        }
      ],
      "education": [
        {
          "degree": "Bachelor of Science in Computer Science",
          "institution": "University of Technology",
          "year": "2018"
        }
      ],
      "skills": [
        "JavaScript",
        "TypeScript",
        "React",
        "Node.js",
        "AWS",
        "Docker",
        "CI/CD",
        "Git"
      ]
    },
    "tonePreference": "PROFESSIONAL",
    "includeInterviewPrep": true,
    "interviewPrepOptions": {
      "questionCount": 3,
      "includeSuggestedAnswers": true
    }
  }' | jq '.' || echo -e "${RED}Failed to parse JSON response${NC}"

echo ""
echo -e "${GREEN}Test 2 completed${NC}"
echo ""

# Test 3: Clear interview preparation cache
echo -e "${BLUE}Test 3: Clear interview preparation cache${NC}"
echo "Sending request to $API_URL/api/interview-prep/cache/clear"

curl -s -X POST \
  "$API_URL/api/interview-prep/cache/clear" \
  -H "Content-Type: application/json" | jq '.' || echo -e "${RED}Failed to parse JSON response${NC}"

echo ""
echo -e "${GREEN}Test 3 completed${NC}"
echo ""

echo -e "${BLUE}=== All tests completed ===${NC}"
