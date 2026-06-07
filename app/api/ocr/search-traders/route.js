import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all'
    let query = supabase.from('traders').select('name,trade_name,afm,city,address,phone,is_customer,is_supplier')
    if (q.length >= 2) query = query.or(`name.ilike.%${q}%,trade_name.ilike.%${q}%,afm.ilike.%${q}%`)
    if (type === 'customer') query = query.eq('is_customer', true)
    if (type === 'supplier') query = query.eq('is_supplier', true)
    const { data, error } = await query.limit(10).order('name')
    if (error) return Response.json({ success: false, error: error.message }, { status: 500 })
    return Response.json({ success: true, data: data || [] })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
