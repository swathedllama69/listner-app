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
    return data.access_token

  } catch (err: any) {
    throw new Error(`Key Error: ${err.message}`)
  }
}

// --- HELPER: RESOLVE HOUSEHOLD ID ---
// Some tables (like items) might be inside a list, so we need to fetch the parent to find the household.
async function resolveHouseholdId(supabase: any, table: string, record: any): Promise<string | null> {
  // 1. Direct check: If the record has household_id, use it.
  if (record.household_id) return record.household_id;

  // 2. Shopping Items: Fetch parent List
  if (table === 'shopping_items' && record.list_id) {
    const { data } = await supabase.from('lists').select('household_id').eq('id', record.list_id).single();
    return data?.household_id || null;
  }

  // 3. Wishlist Items (Goals): Fetch parent Wishlist (assuming table is 'wishlists' or 'lists')
  if (table === 'wishlist_items' && (record.wishlist_id || record.list_id)) {
    const parentId = record.wishlist_id || record.list_id;
    // Try 'wishlists' table first, fall back to 'lists' if your schema uses that
    let { data } = await supabase.from('wishlists').select('household_id').eq('id', parentId).single();
    if (!data) {
      ({ data } = await supabase.from('lists').select('household_id').eq('id', parentId).single());
    }
    return data?.household_id || null;
  }

  return null;
}

// --- MAIN FUNCTION ---
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

    // 1. Parse Payload
    const payload = await req.json()
    const { type, table, record } = payload

    console.log(`🔔 Webhook: ${type} on ${table}`)

    if (type !== 'INSERT') {
      return new Response(JSON.stringify({ message: 'Ignored: Not an INSERT' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Define Message Content based on Table
    let title = "ListNer Update"
    let body = "New activity in your household"
    let householdId = null;

    switch (table) {
      case 'expenses':
        title = "💸 New Expense Added";
        body = `Amount: ${record.amount} - ${record.description || 'No desc'}`;
        break;

      case 'lists':
        title = "📝 New List Created";
        body = `List: "${record.name}" was added.`;
        break;

      case 'shopping_items':
        title = "🛒 New Shopping Item";
        body = `${record.name || 'Item'} was added to the list.`;
        break;

      case 'wishlist_items':
        title = "🌟 New Goal Added";
        body = `${record.name || 'Goal'} was added to the wishlist.`;
        break;

      case 'credits':
        title = "💰 New Debt/Credit";
        body = `A new record of ${record.amount} was added.`;
        break;

      case 'household_members':
        title = "👋 New Member Joined";
        body = "Someone new just joined your household!";
        break;

      default:
        console.log(`Unknown table: ${table}`);
        break;
    }

    // 3. Resolve the Household ID
    householdId = await resolveHouseholdId(supabase, table, record);

    if (!householdId) {
      return new Response(JSON.stringify({ message: "Could not find household_id for this record" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Find Users to Notify (Exclude the Creator)
    // Most tables have 'created_by' or 'user_id'. specific logic for members.
    let excludeUserId = record.created_by || record.user_id;

    const { data: members, error: memberError } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', householdId)
      .neq('user_id', excludeUserId) // Don't notify the person who did the action

    if (memberError || !members || members.length === 0) {
      return new Response(JSON.stringify({ message: "No other members to notify" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userIdsToNotify = members.map(m => m.user_id);

    // 5. Get Device Tokens
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token')
      .in('user_id', userIdsToNotify)

    if (!tokens?.length) {
      return new Response(JSON.stringify({ message: "No devices found" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`🚀 Sending to ${tokens.length} devices...`)

    // 6. Send to FCM
    const accessToken = await getAccessToken({ clientEmail, privateKey })

    const promises = tokens.map(t => {
      const fcmPayload = {
        message: {
          token: t.token,
          notification: {
            title: title,
            body: body
          },
          data: {
            entity_id: String(record.id),
            entity_type: table
          },
          android: {
            notification: {
              channel_id: "PushNotifications",
              icon: "push_icon",
              color: "#0D9488",
              click_action: "MAIN_ACTIVITY"
            }
          }
        }
      };

      return fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fcmPayload),
        }
      )
    })

    const results = await Promise.all(promises)

    return new Response(JSON.stringify({ success: true, sent: results.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error("Function Error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})