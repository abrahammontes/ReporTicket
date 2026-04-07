import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_KEY_PATH = path.join(__dirname, 'config.key');
const SETTINGS_PATH = path.join(__dirname, 'data', 'settings.json');

const masterKey = fs.readFileSync(CONFIG_KEY_PATH);

const decrypt = (text) => {
  if (!text || !text.includes(':')) return text;
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', masterKey, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
const url = settings.supabaseConfig.supabaseUrl;
const key = decrypt(settings.supabaseConfig.supabaseKey);

const supabase = createClient(url, key);

async function checkBuckets() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error fetching buckets:', error);
    return;
  }
  console.log('Available buckets before:', buckets.map(b => b.name));

  if (!buckets.some(b => b.name === 'ticket-attachments')) {
    console.log('Bucket not found. Recreating as PRIVATE...');
    const { data, error: createError } = await supabase.storage.createBucket('ticket-attachments', {
      public: false, // PRIVATE
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/tiff', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      fileSizeLimit: 10485760 // 10MB
    });
    
    if (createError) {
      console.error('FAILED to create:', createError.message);
    } else {
      console.log('Bucket created successfully:', data.name);
    }
  } else {
    console.log('Bucket already exists.');
  }
}

checkBuckets();
