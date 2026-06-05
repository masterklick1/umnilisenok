import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || (req.method === 'POST' ? 'create' : 'list');

    if (action === 'create' && req.method === 'POST') {
      const body = await req.json();
      const { child_id, request_type } = body;
      if (!child_id || !['photo', 'audio', 'location'].includes(request_type)) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Verify parent-child link
      const { data: link } = await admin
        .from('parent_child_links')
        .select('id')
        .eq('parent_id', user.id)
        .eq('child_id', child_id)
        .maybeSingle();
      if (!link) {
        return new Response(JSON.stringify({ error: 'Not linked to child' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data, error } = await admin
        .from('monitoring_requests')
        .insert({ parent_id: user.id, child_id, request_type, status: 'pending' })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ request: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list') {
      const child_id = url.searchParams.get('child_id');
      if (!child_id) {
        return new Response(JSON.stringify({ error: 'Missing child_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data, error } = await admin
        .from('monitoring_requests')
        .select('*')
        .eq('parent_id', user.id)
        .eq('child_id', child_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      // Sign result paths
      const items = await Promise.all((data || []).map(async (r: any) => {
        if (r.result_path) {
          const { data: signed } = await admin.storage
            .from('monitoring')
            .createSignedUrl(r.result_path, 60 * 10);
          return { ...r, signed_url: signed?.signedUrl || null };
        }
        return r;
      }));
      return new Response(JSON.stringify({ requests: items }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sign' && req.method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: r, error } = await admin
        .from('monitoring_requests')
        .select('*')
        .eq('id', id)
        .eq('parent_id', user.id)
        .maybeSingle();
      if (error || !r || !r.result_path) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: signed } = await admin.storage
        .from('monitoring')
        .createSignedUrl(r.result_path, 60 * 10);
      return new Response(JSON.stringify({ signed_url: signed?.signedUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('monitoring-request error', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
