// supabase/functions/send-push/index.ts
//
// Triggered by a Supabase Database Webhook on INSERT into public.notifications.
// Looks up the recipient's Expo push token and sends them a push notification
// via Expo's free push service. Also works fine if you call it manually.
//
// Webhook payload shape (Supabase sends this automatically):
// { type: "INSERT", table: "notifications", record: {...new row...}, schema: "public" }

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record ?? body; // allow manual calls with just the row

    const { user_id, title, message } = record;

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "Missing user_id or title" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Look up the recipient's push token
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("push_token")
      .eq("id", user_id)
      .single();

    if (userError || !userRow?.push_token) {
      // Not an error — user just hasn't registered for push (or denied permission).
      // The in-app notification row still exists, so they'll see it in the bell screen.
      return new Response(
        JSON.stringify({ skipped: true, reason: "No push token for user" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const expoMessage = {
      to: userRow.push_token,
      sound: "default",
      title,
      body: message ?? "",
      data: { notificationId: record.id, type: record.type ?? null },
    };

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(expoMessage),
    });

    const pushResult = await pushRes.json();

    return new Response(JSON.stringify({ success: true, pushResult }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
