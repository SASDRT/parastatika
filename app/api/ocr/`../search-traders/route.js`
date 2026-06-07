export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const type = searchParams.get('type') || 'all'

    const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/traders`)
    url.searchParams.set('select', 'name,trade_name,afm,city,phone,is_customer,is_supplier')
    url.searchParams.set('limit', '10')
    url.searchParams.set('order', 'name')

    if (q.length >= 2) {
      url.searchParams.set('or', `name.ilike.%${q}%,trade_name.ilike.%${q}%,afm.ilike.%${q}%`)
    }
    if (type === 'customer') url.searchParams.set('is_customer', 'eq.true')
    if (type === 'supplier') url.searchParams.set('is_supplier', 'eq.true')

    const res = await fetch(url.toString(), {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    })

    const data = await res.json()
    return Response.json({ success: true, data: Array.isArray(data) ? data : [] })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
