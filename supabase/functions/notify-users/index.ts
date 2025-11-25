import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.9.1/mod.ts'

// 1. CORS HEADERS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 2. HELPER: Robust Token Generation (The Fix)
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
  // 3. HANDLE PREFLIGHT
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 4. INIT VARIABLES
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const projectId = Deno.env.get('FCM_PROJECT_ID')!
    const clientEmail = Deno.env.get('FCM_CLIENT_EMAIL')!
    const privateKey = Deno.env.get('FCM_PRIVATE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 5. PARSE WEBHOOK PAYLOAD
    const payload = await req.json()
    const { record, type, table } = payload

    // Only trigger on new items (INSERT)
    if (type !== 'INSERT') {
      return new Response('Skipped: Not an INSERT', { status: 200, headers: corsHeaders })
    }

    console.log(`🔔 Event: New ${table} item. Finding household members...`)

    // 6. LOGIC: Find Household Members (Exclude Sender)
    // We need to find everyone in the same household EXCEPT the person who created the item
    const { data: members } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', record.household_id)
      .neq('user_id', record.user_id)

    if (!members || members.length === 0) {
      return new Response('No other members to notify.', { status: 200, headers: corsHeaders })
    }

    const userIds = members.map((m) => m.user_id)

    // 7. GET TOKENS
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token')
      .in('user_id', userIds)

    if (!tokens || tokens.length === 0) {
      return new Response('No device tokens found for members.', { status: 200, headers: corsHeaders })
    }

    // 8. PREPARE MESSAGE
    const accessToken = await getAccessToken({ clientEmail, privateKey })

    let title = 'Household Update'
    let body = 'Something new happened.'

    // Custom Messages
    switch (table) {
      case 'expenses':
        title = 'New Expense 💸'
        body = `${record.name}: ${record.amount}`
        break;
      case 'lists':
        title = 'New List 📝'
        body = `Created: "${record.name}"`
        break;
      case 'shopping_items':
        title = 'Shopping List 🛒'
        body = `Added: ${record.name}`
        break;
      case 'wishlist_items':
        title = 'New Goal 🎯'
        body = `Goal added: "${record.name}"`
        break;
      case 'credits':
        title = 'Debt Added 🤝'
        body = `Amount: ${record.amount}`
        break;
    }

    // 9. SEND TO FIREBASE
    const promises = tokens.map((t) => {
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
                type: table,
                id: String(record.id),
                click_action: "FLUTTER_NOTIFICATION_CLICK"
              },
              // 💡 Channel ID for Android
              android: {
                notification: {
                  channel_id: "PushNotifications",
                  icon: "ic_launcher_foreground"
                }
              }
            },
          }),
        }
      )
    })

    await Promise.all(promises)
    console.log(`✅ Sent ${promises.length} notifications.`)

    return new Response(JSON.stringify({ success: true, sent: promises.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error("❌ Function Error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})