export async function POST(request) {
  try {
    const { traders } = await request.json()
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const headers = { 'Content-Type': 'application/json', 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}`, 'Prefer': 'return=minimal' }
    const rows = traders.map(t => {
      const parts = (t.comName || '').split('||')
      return { emblem_id: t.id, code: t.code || null, name: (parts[0] || '').trim() || null, trade_name: (parts[1] || '').trim() || null, afm: t.afm || null, city: (t.city || '').trim() || null, address: (t.address || '').trim() || null, postal: (t.postalcode || '').trim() || null, phone: (t.phone1 || t.phone2 || '').trim() || null, email: (t.email || '').trim() || null, is_customer: t.iscustomer === 1, is_supplier: t.issupplier === 1 }
    }).filter(r => r.name)
    await fetch(`${supaUrl}/rest/v1/traders?id=gte.0`, { method: 'DELETE', headers })
    for (let i = 0; i < rows.length; i += 50) {
      const res = await fetch(`${supaUrl}/rest/v1/traders`, { method: 'POST', headers, body: JSON.stringify(rows.slice(i, i + 50)) })
      if (!res.ok) return Response.json({ success: false, error: await res.text() }, { status: 500 })
    }
    return Response.json({ success: true, count: rows.length })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
