import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, setup_secret } = await req.json();
    const adminEmail = typeof email === "string" ? email.toLowerCase().trim() : "";

    const SETUP_SECRET = Deno.env.get("SETUP_SECRET");
    if (!SETUP_SECRET || !setup_secret || setup_secret !== SETUP_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!adminEmail || !password || password.length < 6) {
      return new Response(JSON.stringify({ error: "Valid email and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = list?.users?.find((u: any) => u.email?.toLowerCase() === adminEmail);
    const { data: authData, error: authError } = existingUser
      ? await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
          user_metadata: {
            ...(existingUser.user_metadata || {}),
            force_password_change: false,
          },
        })
      : await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password,
          email_confirm: true,
          user_metadata: { force_password_change: false },
        });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!authData?.user?.id) {
      throw new Error("Unable to prepare admin account");
    }

    // Assign admin role
    await supabaseAdmin.from("user_roles").upsert({
      user_id: authData.user.id,
      role: "admin",
    }, {
      onConflict: "user_id,role",
    });

    return new Response(JSON.stringify({ success: true, recovered: Boolean(existingUser) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
