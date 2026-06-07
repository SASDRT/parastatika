import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function POST(request) {
  try {
    const { traders } = await request.json()
    const rows = traders.map(t => {
      const parts = (t.comName || '').split('||')
      return {
        emblem_id: t.id,
        code: t.code || null,
        name: (parts[0] || '').trim() || null,
        trade_name: (parts[1] || '').trim() || null,
        afm: t.afm || null,
        city: (t.city || '').trim() || null,
        address: (t.address || '').trim() || null,
        postal: (t.postalcode || '').trim() || null,
        phone: (t.phone1 || t.phone2 || '').trim() || null,
        email: (t.email || '').trim() || null,
        is_customer: t.iscustomer === 1,
        is_supplier: t.issupplier === 1
      }
    }).filter(r => r.name)
    await supabase.from('traders').delete().neq('id', 0)
    const { error } = await supabase.from('traders').insert(rows)
    if (error) return Response.json({ success: false, error: error.message }, { status: 500 })
    return Response.json({ success: true, count: rows.length })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
