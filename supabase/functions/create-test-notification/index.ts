import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateNotificationRequest {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  action_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the JWT token and verify user
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST') {
      const body: CreateNotificationRequest = await req.json();

      // Create notification
      const { data, error } = await supabaseClient
        .from('notifications')
        .insert([{
          user_id: user.id,
          title: body.title,
          message: body.message,
          type: body.type || 'info',
          action_url: body.action_url
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        notification: data 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For GET requests - create a test notification
    if (req.method === 'GET') {
      const testNotifications = [
        {
          title: "🎂 Anniversaire à venir !",
          message: "L'anniversaire de Sophie est dans 3 jours. N'oubliez pas de préparer un cadeau !",
          type: "info" as const,
          action_url: "/dashboard?tab=profiles"
        },
        {
          title: "✅ Suggestion de cadeau générée",
          message: "Nous avons trouvé le cadeau parfait pour Thomas : un livre de science-fiction !",
          type: "success" as const,
          action_url: "/dashboard?tab=profiles"
        },
        {
          title: "⚠️ Budget dépassé",
          message: "Votre budget mensuel de 200€ pour les cadeaux a été dépassé ce mois-ci.",
          type: "warning" as const,
          action_url: "/dashboard?tab=dashboard"
        }
      ];

      // Pick a random test notification
      const randomNotification = testNotifications[Math.floor(Math.random() * testNotifications.length)];

      const { data, error } = await supabaseClient
        .from('notifications')
        .insert([{
          user_id: user.id,
          ...randomNotification
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating test notification:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Test notification created',
        notification: data 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in create-test-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);