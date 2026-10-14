// ============================================================
// Supabase Client Configuration
// Replace the values below with your actual Supabase project credentials.
// Get them from: https://supabase.com/dashboard → your project → Settings → API
// ============================================================

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';

// Initialize Supabase client (loaded via CDN in HTML)
let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// ============================================================
// Auth Helpers
// ============================================================

async function signUp(email, password) {
  const { data, error } = await getSupabase().auth.signUp({ email, password });
  return { data, error };
}

async function signIn(email, password) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  return { data, error };
}

async function signInWithGoogle() {
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/index.html' }
  });
  return { data, error };
}

async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  return { error };
}

async function getCurrentUser() {
  const { data } = await getSupabase().auth.getUser();
  return data?.user || null;
}

function onAuthChange(callback) {
  getSupabase().auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
}

// ============================================================
// Database Helpers – Items
/*  SQL Schema (run in Supabase SQL editor):
  create table items (
    id text primary key,
    name text not null,
    cat text not null,
    descr text,
    price numeric not null,
    color text,
    owner_id uuid references auth.users(id),
    created_at timestamptz default now()
  );
  alter table items enable row level security;
  create policy "Anyone can read" on items for select using (true);
  create policy "Owner can insert" on items for insert with check (auth.uid() = owner_id);
  create policy "Owner can update" on items for update using (auth.uid() = owner_id);
  create policy "Owner can delete" on items for delete using (auth.uid() = owner_id);
*/

async function fetchItems() {
  const { data, error } = await getSupabase().from('items').select('*').order('created_at');
  return { data, error };
}

async function insertItem(item) {
  const user = await getCurrentUser();
  const { data, error } = await getSupabase().from('items').insert([{ ...item, owner_id: user?.id }]).select();
  return { data, error };
}

// ============================================================
// Database Helpers – Booking Requests
/*  SQL Schema:
  create table requests (
    id text primary key,
    item_id text references items(id),
    renter text not null,
    renter_id uuid references auth.users(id),
    start_date text not null,
    end_date text not null,
    note text,
    status text default 'pending',
    created_at timestamptz default now()
  );
  alter table requests enable row level security;
  create policy "Anyone can read" on requests for select using (true);
  create policy "Auth insert" on requests for insert with check (auth.uid() = renter_id);
  create policy "Owner or renter can update" on requests for update using (true);
*/

async function fetchRequests() {
  const { data, error } = await getSupabase().from('requests').select('*').order('created_at', { ascending: false });
  return { data, error };
}

async function insertRequest(req) {
  const user = await getCurrentUser();
  const { data, error } = await getSupabase().from('requests').insert([{ ...req, renter_id: user?.id }]).select();
  return { data, error };
}

async function updateRequestStatus(id, status) {
  const { data, error } = await getSupabase().from('requests').update({ status }).eq('id', id).select();
  return { data, error };
}

async function deleteRequest(id) {
  const { error } = await getSupabase().from('requests').delete().eq('id', id);
  return { error };
}

window.SupaDB = {
  getSupabase,
  signUp, signIn, signInWithGoogle, signOut, getCurrentUser, onAuthChange,
  fetchItems, insertItem,
  fetchRequests, insertRequest, updateRequestStatus, deleteRequest
};
