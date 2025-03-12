# Form Data API Usage Guide

## Overview

This document provides guidance on using the Cover Letter Generator API with form data (`multipart/form-data`), particularly focusing on proper parameter formatting for boolean values and arrays.

## Boolean Parameters in Form Data

When using form data with the Cover Letter Generator API, boolean parameters (like `generateMultiple`) need special handling because form data always sends values as strings.

### Correct Usage

```bash
# Correct way to send boolean values in form data
curl -X POST http://localhost:3000/api/generate-cover-letter \
  -F "resume=@path/to/resume.json" \
  -F "companyName=Example Inc" \
  -F "generateMultiple=true"  # Will be converted to boolean true
```

The API will automatically convert the string "true" to a boolean `true` value. Similarly, "false" will be converted to boolean `false`.

### Incorrect Usage

```bash
# This would cause an error
curl -X POST http://localhost:3000/api/generate-cover-letter \
  -F "resume=@path/to/resume.json" \
  -F "companyName=Example Inc" \
  -F 'generateMultiple=1'  # Error: Not a valid boolean string
```

## Array Parameters in Form Data

For array parameters like `approaches`, use the `[]` notation in the parameter name:

```bash
curl -X POST http://localhost:3000/api/generate-cover-letter \
  -F "resume=@path/to/resume.json" \
  -F "companyName=Example Inc" \
  -F "generateMultiple=true" \
  -F "approaches[]=REQUIREMENTS_TABLE" \
  -F "approaches[]=ACHIEVEMENT_FOCUSED"
```

## Complete Example

Here's a complete example of using the API with form data to generate multiple cover letters:

```bash
curl -X POST http://localhost:3000/api/generate-cover-letter \
  -F "resume=@path/to/resume.json" \
  -F "companyName=TEKSystems" \
  -F "jobTitle=Java Developer" \
  -F "jobDescription=Looking for a hands-on JAVA Developer with 3+ years of experience..." \
  -F "tonePreference=PROFESSIONAL" \
  -F "generateMultiple=true" \
  -F "approaches[]=REQUIREMENTS_TABLE" \
  -F "approaches[]=ACHIEVEMENT_FOCUSED"
```

## Technical Implementation

The API uses Zod schema validation with type transformation to handle string boolean values:

```typescript
generateMultiple: z
  .union([
    z.boolean(),
    z.string().transform((val) => val.toLowerCase() === 'true'),
  ])
  .optional(),
```

This allows the API to accept both native boolean values (when using JSON) and string representations (when using form data).

## Testing

A test script is available to verify the form data handling:

```bash
# Run the test script
./tests/manual/test-multiple-cover-letters.sh
```

This script sends a form data request with a boolean parameter and array parameter to test the API's handling of these values.
