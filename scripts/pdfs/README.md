# PDF Upload Directory

Place your PDF files in this directory to be processed and uploaded to Firebase Storage.

## How to use

1. Copy your PDF files into this directory
2. Run the upload script: `node ../uploadPdfs.js`
3. The script will:
   - Extract text from each PDF
   - Split the text into chunks
   - Generate embeddings using OpenAI
   - Upload the PDF to Firebase Storage
   - Store the chunks and embeddings in Firestore

## Important Notes

- PDFs should be text-based (not scanned images) for best results
- Large PDFs will take longer to process
- Make sure your OpenAI API key is set in the .env file
- The Firebase Storage bucket is configured to: `safehmo-demo.firebasestorage.app`
