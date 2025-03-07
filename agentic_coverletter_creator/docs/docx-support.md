# DOCX File Support Documentation

## Overview

This document provides information about the DOCX file support in the Cover Letter Generator API.

## Changes Made

The following changes were made to improve DOCX file support:

1. Enhanced file format detection in `coverLetterController.ts`:

   - Added support for alternative DOCX MIME types:
     - `application/msword` (older Word formats)
     - `application/vnd.ms-word.document.macroEnabled.12` (macro-enabled DOCX)
   - Implemented fallback detection for DOCX files with incorrect MIME types:
     - Checks if the file name ends with `.docx`
     - Checks if the MIME type is `application/octet-stream` (generic binary)
     - Checks if the MIME type includes 'word' (partial match)
   - Added detailed logging for file upload processing to aid debugging
   - Improved error messages for unsupported file formats

2. Added a test script to verify DOCX file uploads:
   - Located at `tests/manual/test-docx-upload.sh`
   - Allows testing DOCX file uploads with a simple command

## Testing DOCX File Support

To test DOCX file support, you can use the provided test script:

```bash
# Make sure the server is running
npm run dev

# In another terminal, run the test script
./tests/manual/test-docx-upload.sh /path/to/your/resume.docx
```

The script will send a request to the API endpoint with the specified DOCX file and display the response.

## Troubleshooting

If you encounter issues with DOCX file uploads, check the server logs for detailed information about the file processing. The logs will include:

- File name
- Detected MIME type
- File size
- Processing steps

Common issues:

1. **Incorrect MIME type detection**: Some systems may detect DOCX files with non-standard MIME types. The enhanced detection should handle most cases, but if you encounter issues, check the logs to see what MIME type is being detected.

2. **File size limitations**: The API has a 10MB file size limit. If your file is larger, you'll need to reduce its size or increase the limit in `src/index.ts`.

3. **File corruption**: Ensure the DOCX file is not corrupted by opening it in a word processor before uploading.

## Implementation Details

The DOCX file parsing is handled by the `mammoth` library, which extracts text content from DOCX files. The extracted text is then processed by the `ResumeParser` class to extract structured data.

The file upload is handled by the `multer` middleware, which processes multipart/form-data requests and makes the uploaded file available in the `req.file` object.
