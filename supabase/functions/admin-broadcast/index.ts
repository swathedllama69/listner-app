import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.9.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// --- HELPER: GOOGLE AUTH FOR FCM ---
async function getAccessToken({ clientEmail, privateKey }: { clientEmail: string; privateKey: string }) {
  try {
    const cleanKey = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\\n/g, '')
      .replace(/"/g, '')
      .replace(/\s+/g, '');

    const binaryDerString = atob(cleanKey);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["sign"],
    );

    const jwt = await create(
      { alg: 'RS256', typ: 'JWT' },
      {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: getNumericDate(60 * 60),
        iat: getNumericDate(0),
      },
      cryptoKey
    )

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    const data = await response.json()
    if (data.error) throw new Error(`Google Auth Error: ${data.error_description}`)
    return data.access_token

  } catch (err: any) {
    throw new Error(`Key/Auth Error: ${err.message}`)
  }
}

// --- MAIN ADMIN FUNCTION ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const projectId = Deno.env.get('FCM_PROJECT_ID')!
    const clientEmail = Deno.env.get('FCM_CLIENT_EMAIL')!
    const privateKey = Deno.env.get('FCM_PRIVATE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. VERIFY ADMIN AUTH (Authorization, User existence, Admin role check)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Missing Auth Header")

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) throw new Error("Unauthorized")

    const { data: adminRecord } = await supabase
      .from('admins')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!adminRecord) throw new Error("Forbidden: You are not an Admin")

    // 2. Parse Message Content (INCLUDING NEW FIELDS: IMAGE & LINK)
    const { title, body, image, link } = await req.json()

    // 3. Get All Device Tokens (Broadcast Mode)
    const { data: tokens } = await supabase.from('device_tokens').select('token')

    if (!tokens?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No devices found in database" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`🚀 Admin Broadcast: Sending to ${tokens.length} devices...`)

    // 4. Send to FCM
    const accessToken = await getAccessToken({ clientEmail, privateKey })
    const messagesSent: string[] = []

    const promises = tokens.map(async t => {
      // Build the base notification payload
      const notificationPayload: any = {
        message: {
          token: t.token,
          notification: {
            title: title || "Announcement",
            body: body || "New update available",
          },
          data: {
            type: 'admin_broadcast',

            // Pass the optional link in the data payload
            ...(link && { link }),
          },
          android: {
            notification: {
              channel_id: "PushNotifications",
              icon: "push_icon",
              color: "#10B981", // Changed color to match Teal-500/Emerald-500
              click_action: "MAIN_ACTIVITY"
            }
          }
        }
      };

      // CRITICAL FIX: Conditionally add the image property to the notification payload.
      // This is necessary for rich notification support (iOS/Android banners).
      if (image) {
        // FCM uses 'image' inside the 'notification' object for rich media.
        notificationPayload.message.notification.image = image;
      }

      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notificationPayload),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        console.error(`FCM Error for token ${t.token}:`, result);
        // We still resolve the promise to let Promise.all finish, but log the failure
        return { success: false, token: t.token, error: result.error };
      }
      messagesSent.push(t.token);
      return { success: true, token: t.token };
    })

    await Promise.all(promises);

    return new Response(JSON.stringify({ success: true, sent: messagesSent.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error("Broadcast Error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})