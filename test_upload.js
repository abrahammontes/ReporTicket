import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUpload() {
  const formData = new FormData();
  
  // Create a dummy pdf using Blob
  const blob = new Blob(['Dummy PDF content'], { type: 'application/pdf' });
  formData.append('file', blob, 'test.pdf');
  
  try {
    const response = await fetch('http://127.0.0.1:3001/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('Upload result:', result);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testUpload();
