import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.9.1/mod.ts'

// 1. CORS HEADERS (Allow access from your website)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 2. HELPER: Robust Token Generation (Fixes Base64 & Google Lib Errors)
async function getAccessToken({ clientEmail, privateKey }: { clientEmail: string; privateKey: string }) {
  try {
    // CLEANER: Removes headers, newlines, spaces, AND accidental quotes
    const cleanKey = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\\n/g, '')  // Remove literal \n
      .replace(/"/g, '')    // Remove accidental quotes
      .replace(/\s+/g, ''); // Remove all whitespace

    // Decode Base64
    const binaryDerString = atob(cleanKey);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    // Import Key
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["sign"],
    );

    // Sign JWT
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

    // Exchange for Access Token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    const data = await response.json()
    return data.access_token

  } catch (err: any) {
    console.error("Token Gen Error:", err.message)
    throw new Error(`Key Error: ${err.message}`)
  }
}

Deno.serve(async (req) => {
  // 3. HANDLE CORS PREFLIGHT
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 4. INITIALIZATION
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const projectId = Deno.env.get('FCM_PROJECT_ID')!
    const clientEmail = Deno.env.get('FCM_CLIENT_EMAIL')!
    const privateKey = Deno.env.get('FCM_PRIVATE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 5. SECURITY: Auth Check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Missing Auth Header")

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) throw new Error("Unauthorized")

    // 6. SECURITY: Admin Check
    const { data: adminRecord } = await supabase.from('admins').select('role').eq('id', user.id).single()
    if (!adminRecord) throw new Error("Forbidden: Not an Admin")

    // 7. PREPARE PAYLOAD
    const { title, body } = await req.json()
    const { data: tokens } = await supabase.from('device_tokens').select('token')

    if (!tokens?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No devices" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 8. SEND TO FIREBASE
    const accessToken = await getAccessToken({ clientEmail, privateKey })

    const promises = tokens.map(t => {
      return fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: t.token,
              notification: { title, body },
              data: {
                type: 'admin_broadcast',
                click_action: "FLUTTER_NOTIFICATION_CLICK"
              },
              // 💡 FIX: Channel ID for Android 8+ Delivery
              android: {
                notification: {
                  channel_id: "PushNotifications",
                  icon: "ic_launcher_foreground" // Or "push_icon" if configured
                }
              }
            },
          }),
        }
      )
    })

    await Promise.all(promises)

    return new Response(JSON.stringify({ success: true, sent: promises.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})