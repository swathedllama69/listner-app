import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcwgqjsdijogtjpodvlv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd2dxanNkaWpvZ3RqcG9kdmx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM4Nzg0MywiZXhwIjoyMDc4OTYzODQzfQ.CHFZj1RqAxi5aIcHgZxf-Yq_uQNwQ6r22_nLxpmxmRw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadFromUrl() {
    const imageUrl = 'https://www.listner.site/assets/Listner%20Logo.png';
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image');

    const buffer = await response.arrayBuffer();

    // Use the actual bucket name, probably 'resources'
    const { data, error } = await supabase.storage
        .from('resources')  // correct bucket name
        .upload('logos/Listner_Logo.png', Buffer.from(buffer), {
            cacheControl: '3600',
            upsert: true,
            contentType: 'image/png'
        });

    if (error) console.error('Upload failed:', error);
    else {
        console.log('Uploaded:', data);

        // Correct way to get public URL in Supabase JS v2+
        const { data: publicUrlData } = supabase.storage
            .from('resources')
            .getPublicUrl('logos/Listner_Logo.png');

        console.log('Public URL:', publicUrlData.publicUrl);
    }
}

uploadFromUrl();
