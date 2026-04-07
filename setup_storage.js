import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_KEY_PATH = path.join(__dirname, 'config.key');
const SETTINGS_PATH = path.join(__dirname, 'data', 'settings.json');

let masterKey = fs.readFileSync(CONFIG_KEY_PATH);

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

async function setupStorage() {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets.some(b => b.name === 'ticket-attachments')) {
        console.log('Bucket already exists.');
        return;
    }

    const { data, error } = await supabase.storage.createBucket('ticket-attachments', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/tiff', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (error) {
      console.error('FAILED:', error.message);
    } else {
      console.log('Bucket created:', data.name);
    }
  } catch (e) {
    console.error('EXCEPTION:', e.message);
  }
}

setupStorage();
