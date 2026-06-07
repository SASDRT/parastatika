'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmt = (n) => new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(n || 0)
const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('el-GR') } catch { return d } }
const TABS = ['📸 Σάρωση', '📈 Έσοδα', '📉 Έξοδα', '📋 Καρτέλες', '💰 Υπόλοιπα']

const C = {
  app: { minHeight: '100vh', background: '#0a0c13', color: '#e8eaf0', fontFamily: 'system-ui,-apple-system,sans-serif' },
  header: { background: '#0f1117', borderBottom: '1px solid #1e2232', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100 },
  headerInner: { maxWidth: 1300, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58, gap: 12 },
  logo: { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 17 },
  logoIcon: { width: 34, height: 34, background: 'linear-gradient(135deg,#4f8ef7,#7c5cf7)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 },
  tabBar: { background: '#0f1117', borderBottom: '1px solid #1e2232', overflowX: 'auto', display: 'flex' },
  tab: (a) => ({ background: 'none', border: 'none', color: a ? '#4f8ef7' : '#5a6070', padding: '13px 18px', fontSize: 13, fontWeight: a ? 600 : 400, borderBottom: a ? '2px solid #4f8ef7' : '2px solid transparent', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'color .15s' }),
  content: { maxWidth: 1300, margin: '0 auto', padding: '22px 18px' },
  card: { background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, padding: 20 },
  card2: { background: '#13151f', border: '1px solid #1e2232', borderRadius: 10 },
  btnPrimary: { background: 'linear-gradient(135deg,#4f8ef7,#7c5cf7)', color: '#fff', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' },
  btnGhost: { background: 'transparent', color: '#9ca3af', border: '1px solid #2a3040', padding: '9px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  btnDanger: { background: 'transparent', color: '#f87171', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  btnIcon: { background: '#1e2232', color: '#e8eaf0', border: 'none', padding: '7px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  th: { textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#5a6070', padding: '9px 10px', borderBottom: '1px solid #1e2232', whiteSpace: 'nowrap' },
  td: { padding: '10px', borderBottom: '1px solid #161824', fontSize: 13 },
  label: { fontSize: 10, color: '#5a6070', fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 4, textTransform: 'uppercase' },
  input: { background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'inherit', transition: 'border-color .2s' },
  section: { background: '#0f1117', borderRadius: 9, padding: '13px 15px', border: '1px solid #1e2232', marginBottom: 10 },
  sectionTitle: (c) => ({ fontSize: 10, color: c || '#5a6070', fontWeight: 700, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }),
}

export default function App() {
  const [tab, setTab] = useState(0)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [previewImg, setPreviewImg] = useState(null)
  const [searchQ, setSearchQ] = useState('')
  const [notification, setNotification] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { loadInvoices() }, [])

  const loadInvoices = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('invoices').select('*').order('date', { ascending: false })
    if (!error) setInvoices(data || [])
    setLoading(false)
  }

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(''), 4000)
  }

  const handleFile = async (file) => {
    if (!file) return
    setScanning(true); setEditForm(null); setPreviewImg(null)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target.result
      setPreviewImg(dataUrl)
      try {
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: dataUrl.split(',')[1], mediaType: file.type || 'image/jpeg' })
        })
        const json = await res.json()
        if (json.success) setEditForm(json.data)
        else notify('⚠️ Δεν μπόρεσα να διαβάσω. Δοκίμασε πιο καθαρή φωτογραφία.', 'error')
      } catch(e) { notify('⚠️ Σφάλμα: ' + e.message, 'error') }
      setScanning(false)
    }
    reader.readAsDataURL(file)
  }

  const ef = (k, v) => setEditForm(f => ({ ...f, [k]: v }))

  const saveInvoice = async () => {
    if (!editForm) return
    setSaving(true)
    const row = {
      type: editForm.type || 'expense',
      invoice_type: editForm.invoice_type || null,
      series: editForm.series || null,
      number: editForm.number || null,
      date: editForm.date || null,
      time: editForm.time || null,
      mark: editForm.mark || null,
      uid: editForm.uid || null,
      issuer_name: editForm.issuer_name || null,
      issuer_trade_name: editForm.issuer_trade_name || null,
      issuer_afm: editForm.issuer_afm || null,
      issuer_doy: editForm.issuer_doy || null,
      issuer_gem: editForm.issuer_gem || null,
      issuer_address: editForm.issuer_address || null,
      issuer_city: editForm.issuer_city || null,
      issuer_postal: editForm.issuer_postal || null,
      issuer_phone: editForm.issuer_phone || null,
      issuer_email: editForm.issuer_email || null,
      counterparty: editForm.counterparty || null,
      trade_name: editForm.trade_name || null,
      afm: editForm.afm || null,
      doy: editForm.doy || null,
      address: editForm.address || null,
      city: editForm.city || null,
      postal: editForm.postal || null,
      phone: editForm.phone || null,
      subtotal: parseFloat(editForm.subtotal) || 0,
      total_discount: parseFloat(editForm.total_discount) || 0,
      vat_rate: parseFloat(editForm.vat_rate) || 24,
      vat: parseFloat(editForm.vat) || 0,
      total: parseFloat(editForm.total) || 0,
      rounding: parseFloat(editForm.rounding) || 0,
      payment_method: editForm.payment_method || null,
      due_date: editForm.due_date || null,
      bank: editForm.bank || null,
      iban: editForm.iban || null,
      purpose: editForm.purpose || null,
      delivery_address: editForm.delivery_address || null,
      notes: editForm.notes || null,
      vat_breakdown: editForm.vat_breakdown || [],
      items: editForm.items || []
    }
    const { error } = await supabase.from('invoices').insert([row])
    if (error) notify('⚠️ ' + error.message, 'error')
    else {
      notify('✓ Παραστατικό αποθηκεύτηκε επιτυχώς!')
      setEditForm(null); setPreviewImg(null)
      await loadInvoices()
      setTab(row.type === 'income' ? 1 : 2)
    }
    setSaving(false)
  }

  const deleteInvoice = async (id) => {
    if (!confirm('Διαγραφή παραστατικού;')) return
    await supabase.from('invoices').delete().eq('id', id)
    await loadInvoices(); notify('Διαγράφηκε.')
  }

  const income = invoices.filter(i => i.type === 'income')
  const expenses = invoices.filter(i => i.type === 'expense')
  const totalIncome = income.reduce((s, i) => s + (i.total || 0), 0)
  const totalExpense = expenses.reduce((s, i) => s + (i.total || 0), 0)
  const balance = totalIncome - totalExpense

  const filtered = (list) => {
    if (!searchQ) return list
    const q = searchQ.toLowerCase()
    return list.filter(i =>
      (i.counterparty || '').toLowerCase().includes(q) ||
      (i.trade_name || '').toLowerCase().includes(q) ||
      (i.number || '').toLowerCase().includes(q) ||
      (i.afm || '').includes(q) ||
      (i.invoice_type || '').toLowerCase().includes(q) ||
      (i.notes || '').toLowerCase().includes(q)
    )
  }

  const byCounterparty = (type) => {
    const map = {}
    invoices.filter(i => i.type === type).forEach(inv => {
      const key = inv.afm || inv.counterparty || 'Άγνωστος'
      if (!map[key]) map[key] = { name: inv.counterparty || 'Άγνωστος', trade_name: inv.trade_name, afm: inv.afm, doy: inv.doy, invoices: [], total: 0 }
      map[key].invoices.push(inv)
      map[key].total += inv.total || 0
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  const Field = ({ label, value, col = 1, mono = false }) => (
    <div style={{ gridColumn: `span ${col}` }}>
      <label style={C.label}>{label}</label>
      <input value={value || ''} onChange={() => {}} style={{ ...C.input, fontFamily: mono ? 'monospace' : 'inherit' }} readOnly />
    </div>
  )

  const InputF = ({ label, field, col = 1, mono = false, type = 'text', placeholder = '' }) => (
    <div style={{ gridColumn: `span ${col}` }}>
      <label style={C.label}>{label}</label>
      <input type={type} value={editForm?.[field] || ''} placeholder={placeholder}
        onChange={e => ef(field, e.target.value)}
        style={{ ...C.input, fontFamily: mono ? 'monospace' : 'inherit' }} />
    </div>
  )

  return (
    <div style={C.app}>
      {/* HEADER */}
      <div style={C.header}>
        <div style={C.headerInner}>
          <div style={C.logo}>
            <div style={C.logoIcon}>📋</div>
            <span>Παραστατικά</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['ΕΣΟΔΑ', totalIncome, '#4ade80', '#0a2215'], ['ΕΞΟΔΑ', totalExpense, '#f87171', '#2a0f0f'], ['ΥΠΟΛΟΙΠΟ', balance, balance >= 0 ? '#60b4f7' : '#f87171', balance >= 0 ? '#0a1e2e' : '#2a0f0f']].map(([l, v, c, bg]) => (
              <div key={l} style={{ textAlign: 'center', padding: '4px 12px', borderRadius: 7, background: bg, border: `1px solid ${c}22` }}>
                <div style={{ fontSize: 9, color: c, fontWeight: 700, letterSpacing: 1 }}>{l}</div>
                <div style={{ fontSize: 13, color: c, fontFamily: 'monospace', fontWeight: 700 }}>{fmt(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={C.tabBar}>
        {TABS.map((t, i) => <button key={t} onClick={() => setTab(i)} style={C.tab(tab === i)}>{t}</button>)}
      </div>

      {/* NOTIFICATION */}
      {notification && (
        <div style={{ position: 'fixed', top: 16, right: 16, background: notification.type === 'error' ? '#2a0f0f' : '#0a2215', border: `1px solid ${notification.type === 'error' ? '#f87171' : '#4ade80'}`, color: notification.type === 'error' ? '#f87171' : '#4ade80', padding: '11px 20px', borderRadius: 9, fontSize: 13, zIndex: 999, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,.4)' }}>
          {notification.msg}
        </div>
      )}

      <div style={C.content}>

        {/* ══════════════════════════════════════
            TAB 0: ΣΑΡΩΣΗ
        ══════════════════════════════════════ */}
        {tab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: editForm ? '380px 1fr' : '1fr', gap: 20 }}>
            {/* Αριστερή στήλη */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {scanning ? (
                <div style={{ ...C.card, textAlign: 'center', padding: '48px 24px' }}>
                  {previewImg && <img src={previewImg} alt="" style={{ maxHeight: 180, borderRadius: 8, maxWidth: '100%', marginBottom: 20, opacity: .6 }} />}
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                  <div style={{ color: '#4f8ef7', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Ανάγνωση παραστατικού...</div>
                  <div style={{ color: '#5a6070', fontSize: 12 }}>Εξαγωγή όλων των στοιχείων με AI</div>
                </div>
              ) : (
                <div style={{ ...C.card, textAlign: 'center', padding: '40px 24px' }}>
                  {previewImg && !editForm && <img src={previewImg} alt="" style={{ maxHeight: 150, borderRadius: 8, maxWidth: '100%', marginBottom: 16 }} />}
                  <div style={{ fontSize: 52, marginBottom: 12 }}>📄</div>
                  <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Ανέβασε Παραστατικό</div>
                  <div style={{ color: '#5a6070', fontSize: 13, marginBottom: 26, lineHeight: 1.5 }}>
                    Φωτογράφισε ή επίλεξε αρχείο<br/>Το AI εξάγει <strong style={{ color: '#4f8ef7' }}>όλα τα στοιχεία</strong> αυτόματα
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <label style={{ ...C.btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px', fontSize: 14, borderRadius: 9 }}>
                      📷 Κάμερα
                      <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                    </label>
                    <label style={{ ...C.btnGhost, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px', fontSize: 14, borderRadius: 9 }}>
                      🖼️ Από συλλογή
                      <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Δεξιά στήλη - Φόρμα */}
            {editForm && (
              <div style={{ ...C.card, overflowY: 'auto', maxHeight: '88vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700, letterSpacing: 1 }}>ΕΠΑΛΗΘΕΥΣΗ & ΑΠΟΘΗΚΕΥΣΗ</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ ...C.btnPrimary, opacity: saving ? .7 : 1, padding: '8px 16px', fontSize: 13 }} onClick={saveInvoice} disabled={saving}>
                      {saving ? '⏳...' : '✓ Αποθήκευση'}
                    </button>
                    <button style={C.btnGhost} onClick={() => { setEditForm(null); setPreviewImg(null) }}>✕</button>
                  </div>
                </div>

                {/* Τύπος & Είδος */}
                <div style={C.section}>
                  <div style={C.sectionTitle('#4f8ef7')}>ΣΤΟΙΧΕΙΑ ΠΑΡΑΣΤΑΤΙΚΟΥ</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <div>
                      <label style={C.label}>ΤΥΠΟΣ</label>
                      <select value={editForm.type || 'expense'} onChange={e => ef('type', e.target.value)} style={C.input}>
                        <option value="income">📈 Έσοδο</option>
                        <option value="expense">📉 Έξοδο</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={C.label}>ΕΙΔΟΣ ΠΑΡΑΣΤΑΤΙΚΟΥ</label>
                      <input value={editForm.invoice_type || ''} onChange={e => ef('invoice_type', e.target.value)} placeholder="π.χ. Τιμολόγιο Πώλησης" style={C.input} />
                    </div>
                    <div>
                      <label style={C.label}>ΗΜΕΡΟΜΗΝΙΑ</label>
                      <input type="date" value={editForm.date || ''} onChange={e => ef('date', e.target.value)} style={C.input} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                    <InputF label="ΣΕΙΡΑ" field="series" placeholder="Α" />
                    <InputF label="ΑΡΙΘΜΟΣ" field="number" placeholder="0001" mono />
                    <InputF label="ΩΡΑ" field="time" placeholder="14:30" />
                    <InputF label="MARK (myDATA)" field="mark" mono />
                  </div>
                </div>

                {/* Εκδότης */}
                <div style={C.section}>
                  <div style={C.sectionTitle('#7c5cf7')}>ΕΚΔΟΤΗΣ</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <InputF label="ΕΠΩΝΥΜΙΑ" field="issuer_name" col={1} />
                    <InputF label="ΔΙΑΚΡΙΤΙΚΟΣ ΤΙΤΛΟΣ" field="issuer_trade_name" col={1} />
                    <InputF label="ΑΦΜ" field="issuer_afm" mono />
                    <InputF label="ΔΟΥ" field="issuer_doy" />
                    <InputF label="ΓΕΜΗ" field="issuer_gem" mono />
                    <InputF label="ΤΗΛΕΦΩΝΟ" field="issuer_phone" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px', gap: 8, marginTop: 8 }}>
                    <InputF label="ΔΙΕΥΘΥΝΣΗ" field="issuer_address" />
                    <InputF label="ΠΟΛΗ" field="issuer_city" />
                    <InputF label="Τ.Κ." field="issuer_postal" mono />
                  </div>
                </div>

                {/* Αντισυμβαλλόμενος */}
                <div style={C.section}>
                  <div style={C.sectionTitle(editForm.type === 'income' ? '#4ade80' : '#f87171')}>
                    {editForm.type === 'income' ? 'ΠΕΛΑΤΗΣ' : 'ΠΡΟΜΗΘΕΥΤΗΣ'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <InputF label="ΕΠΩΝΥΜΙΑ" field="counterparty" />
                    <InputF label="ΔΙΑΚΡΙΤΙΚΟΣ ΤΙΤΛΟΣ" field="trade_name" />
                    <InputF label="ΑΦΜ" field="afm" mono />
                    <InputF label="ΔΟΥ" field="doy" />
                    <InputF label="ΤΗΛΕΦΩΝΟ" field="phone" />
                    <InputF label="ΠΟΛΗ" field="city" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px', gap: 8, marginTop: 8 }}>
                    <InputF label="ΔΙΕΥΘΥΝΣΗ" field="address" />
                    <InputF label="Τ.Κ." field="postal" mono />
                  </div>
                </div>

                {/* Σύνολα */}
                <div style={C.section}>
                  <div style={C.sectionTitle('#fbbf24')}>ΑΞΙΕΣ</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[['ΚΑΘΑΡΗ ΑΞΙΑ €', 'subtotal'], ['ΕΚΠΤΩΣΕΙΣ €', 'total_discount'], ['ΦΠΑ €', 'vat'], ['ΣΥΝΟΛΟ €', 'total']].map(([l, k]) => (
                      <div key={k}>
                        <label style={C.label}>{l}</label>
                        <input type="number" step="0.01" value={editForm[k] || ''}
                          onChange={e => ef(k, e.target.value)}
                          style={{ ...C.input, fontFamily: 'monospace', fontWeight: k === 'total' ? 700 : 400, color: k === 'total' ? (editForm.type === 'income' ? '#4ade80' : '#f87171') : '#e8eaf0' }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Πληρωμή */}
                <div style={C.section}>
                  <div style={C.sectionTitle('#34d399')}>ΠΛΗΡΩΜΗ</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={C.label}>ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ</label>
                      <select value={editForm.payment_method || ''} onChange={e => ef('payment_method', e.target.value)} style={C.input}>
                        <option value="">— Επίλεξε —</option>
                        <option>Μετρητά</option>
                        <option>Πιστωτική κάρτα</option>
                        <option>Χρεωστική κάρτα</option>
                        <option>Τραπεζική μεταφορά</option>
                        <option>Επιταγή</option>
                        <option>Επί πιστώσει</option>
                      </select>
                    </div>
                    <InputF label="ΗΜΕΡΟΜΗΝΙΑ ΛΗΞΗΣ" field="due_date" type="date" />
                    <InputF label="ΤΡΑΠΕΖΑ" field="bank" />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <InputF label="IBAN" field="iban" mono />
                  </div>
                </div>

                {/* Σημειώσεις */}
                <div>
                  <label style={C.label}>ΣΗΜΕΙΩΣΕΙΣ / ΠΑΡΑΤΗΡΗΣΕΙΣ</label>
                  <textarea rows={2} value={editForm.notes || ''} onChange={e => ef('notes', e.target.value)}
                    style={{ ...C.input, resize: 'vertical' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 1 & 2: ΛΙΣΤΑ ΠΑΡΑΣΤΑΤΙΚΩΝ
        ══════════════════════════════════════ */}
        {(tab === 1 || tab === 2) && (() => {
          const list = tab === 1 ? income : expenses
          const color = tab === 1 ? '#4ade80' : '#f87171'
          const total = list.reduce((s, i) => s + (i.total || 0), 0)
          const flist = filtered(list)
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 19, fontWeight: 700 }}>{tab === 1 ? 'Έσοδα' : 'Έξοδα'}</h2>
                <span style={{ fontFamily: 'monospace', color, fontSize: 17, fontWeight: 700 }}>{fmt(total)}</span>
                <span style={{ color: '#5a6070', fontSize: 13, background: '#1e2232', padding: '3px 10px', borderRadius: 20 }}>{list.length} παραστατικά</span>
                <div style={{ marginLeft: 'auto', width: 260 }}>
                  <input placeholder="🔍 Αναζήτηση..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    style={{ ...C.input, fontSize: 13 }} />
                </div>
                <button style={C.btnPrimary} onClick={() => setTab(0)}>+ Νέο</button>
              </div>

              {loading ? (
                <div style={{ ...C.card, textAlign: 'center', padding: 48, color: '#5a6070' }}>Φόρτωση...</div>
              ) : flist.length === 0 ? (
                <div style={{ ...C.card, textAlign: 'center', padding: 56, color: '#5a6070' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                  <div style={{ fontWeight: 600 }}>Δεν βρέθηκαν παραστατικά</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {flist.map(inv => (
                    <div key={inv.id} style={{ ...C.card2, overflow: 'hidden' }}>
                      {/* Γραμμή συνόψεως */}
                      <div onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                        style={{ display: 'grid', gridTemplateColumns: '95px 100px 140px 1fr 115px 95px 95px 115px 48px', gap: 6, padding: '12px 16px', cursor: 'pointer', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1a1d2b'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <span style={{ color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>{fmtDate(inv.date)}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7c5cf7' }}>{inv.series || ''}{inv.number || '—'}</span>
                        <span style={{ fontSize: 11, color: '#4f8ef7', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.invoice_type || '—'}</span>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.counterparty || '—'}</div>
                          {inv.trade_name && <div style={{ fontSize: 10, color: '#5a6070', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{inv.trade_name}"</div>}
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#5a6070' }}>{inv.afm || '—'}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, textAlign: 'right' }}>{fmt(inv.subtotal)}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, textAlign: 'right', color: '#5a6070' }}>{fmt(inv.vat)}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 14, textAlign: 'right', fontWeight: 700, color }}>{fmt(inv.total)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                          <span style={{ color: '#5a6070', fontSize: 11 }}>{expandedId === inv.id ? '▲' : '▼'}</span>
                          <button style={C.btnDanger} onClick={e => { e.stopPropagation(); deleteInvoice(inv.id) }}>✕</button>
                        </div>
                      </div>
                      {expandedId === inv.id && <InvoiceDetail inv={inv} color={color} fmt={fmt} fmtDate={fmtDate} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* ══════════════════════════════════════
            TAB 3: ΚΑΡΤΕΛΕΣ
        ══════════════════════════════════════ */}
        {tab === 3 && <KartelesTab invoices={invoices} byCounterparty={byCounterparty} fmt={fmt} fmtDate={fmtDate} />}

        {/* ══════════════════════════════════════
            TAB 4: ΥΠΟΛΟΙΠΑ
        ══════════════════════════════════════ */}
        {tab === 4 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 22 }}>
            {[{ type: 'income', label: '📈 Πελάτες — Εισπρακτέα', color: '#4ade80', total: totalIncome },
              { type: 'expense', label: '📉 Προμηθευτές — Πληρωτέα', color: '#f87171', total: totalExpense }].map(({ type, label, color, total }) => (
              <div key={type}>
                <h3 style={{ fontWeight: 700, marginBottom: 14, color, fontSize: 15 }}>{label}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {byCounterparty(type).length === 0 && <div style={{ ...C.card, color: '#5a6070', textAlign: 'center', padding: 36 }}>Δεν υπάρχουν ακόμα</div>}
                  {byCounterparty(type).map(cp => (
                    <div key={cp.name} style={{ ...C.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{cp.name}</div>
                        {cp.trade_name && <div style={{ fontSize: 11, color: '#4f8ef7', marginTop: 1 }}>"{cp.trade_name}"</div>}
                        <div style={{ fontSize: 11, color: '#5a6070', marginTop: 2 }}>
                          {cp.invoices.length} παραστατικά{cp.afm ? ` · ΑΦΜ: ${cp.afm}` : ''}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color }}>{fmt(cp.total)}</div>
                    </div>
                  ))}
                  {byCounterparty(type).length > 0 && (
                    <div style={{ textAlign: 'right', padding: '8px 6px', fontFamily: 'monospace', fontWeight: 700, color, fontSize: 16 }}>
                      Σύνολο: {fmt(total)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ΑΝΑΛΥΤΙΚΗ ΠΡΟΒΟΛΗ ΤΙΜΟΛΟΓΙΟΥ
═══════════════════════════════════════════════════════════ */
function InvoiceDetail({ inv, color, fmt, fmtDate }) {
  const items = inv.items || []
  const totalNet = items.length > 0
    ? items.reduce((s, i) => s + (parseFloat(i.net_value) || 0), 0)
    : (inv.subtotal || 0)
  const totalDiscount = inv.total_discount || 0
  const totalVat = inv.vat || 0
  const totalAmount = inv.total || 0
  const vatBreakdown = inv.vat_breakdown || []

  const printInvoice = () => {
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>${inv.invoice_type || 'Παραστατικό'} ${inv.series || ''}${inv.number || ''}</title>
    <meta charset="utf-8">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;padding:25px;color:#000;font-size:12px}
      .top{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #333}
      .title{font-size:18px;font-weight:bold;color:#1a1a8c}
      .num{font-size:13px;color:#444;margin-top:3px}
      .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}
      .party{border:1px solid #ddd;border-radius:6px;padding:10px 12px;background:#f9f9f9}
      .ptitle{font-size:10px;font-weight:bold;letter-spacing:1px;color:#666;margin-bottom:6px;text-transform:uppercase}
      .pname{font-weight:bold;font-size:13px}
      .ptrade{font-size:11px;color:#1a1a8c;margin-top:1px}
      .pinfo{font-size:11px;color:#555;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px}
      thead tr{background:#1a1a8c;color:#fff}
      th{padding:6px 7px;text-align:right;font-weight:600;font-size:10px;letter-spacing:.3px}
      th:first-child,th:nth-child(2){text-align:left}
      td{border-bottom:1px solid #eee;padding:6px 7px;text-align:right}
      td:first-child,td:nth-child(2){text-align:left}
      tr:nth-child(even) td{background:#f9f9f9}
      .totals{display:flex;justify-content:flex-end;margin-top:8px}
      .ttable{width:260px;border:1px solid #ddd;border-radius:6px;overflow:hidden}
      .trow{display:flex;justify-content:space-between;padding:5px 12px;font-size:12px}
      .trow:nth-child(even){background:#f9f9f9}
      .grand{background:#1a1a8c!important;color:#fff;font-weight:bold;font-size:14px;padding:8px 12px!important}
      .footer{margin-top:18px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#777;display:flex;justify-content:space-between}
      .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;background:#e8f0fe;color:#1a1a8c}
      @media print{@page{margin:12mm}}
    </style></head><body>
    <div class="top">
      <div>
        <div class="title">${inv.invoice_type || 'ΠΑΡΑΣΤΑΤΙΚΟ'}</div>
        <div class="num">Αρ. ${inv.series || ''}${inv.number || '—'} &nbsp;|&nbsp; ${fmtDate(inv.date)}${inv.time ? ' ' + inv.time : ''}</div>
        ${inv.mark ? `<div style="margin-top:4px"><span class="badge">MARK: ${inv.mark}</span></div>` : ''}
      </div>
      <div style="text-align:right">
        <div><strong>Τρόπος πληρωμής:</strong> ${inv.payment_method || '—'}</div>
        ${inv.due_date ? `<div><strong>Ημ. λήξης:</strong> ${fmtDate(inv.due_date)}</div>` : ''}
        ${inv.bank ? `<div><strong>Τράπεζα:</strong> ${inv.bank}</div>` : ''}
        ${inv.iban ? `<div><strong>IBAN:</strong> <span style="font-family:monospace;font-size:11px">${inv.iban}</span></div>` : ''}
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="ptitle">Εκδότης</div>
        <div class="pname">${inv.issuer_name || '—'}</div>
        ${inv.issuer_trade_name ? `<div class="ptrade">"${inv.issuer_trade_name}"</div>` : ''}
        ${inv.issuer_afm ? `<div class="pinfo">ΑΦΜ: <strong>${inv.issuer_afm}</strong>${inv.issuer_doy ? ' · ΔΟΥ: ' + inv.issuer_doy : ''}</div>` : ''}
        ${inv.issuer_gem ? `<div class="pinfo">ΓΕΜΗ: ${inv.issuer_gem}</div>` : ''}
        ${inv.issuer_address ? `<div class="pinfo">${inv.issuer_address}${inv.issuer_city ? ', ' + inv.issuer_city : ''}${inv.issuer_postal ? ' ' + inv.issuer_postal : ''}</div>` : ''}
        ${inv.issuer_phone ? `<div class="pinfo">Τηλ: ${inv.issuer_phone}</div>` : ''}
      </div>
      <div class="party">
        <div class="ptitle">${inv.type === 'income' ? 'Πελάτης' : 'Προμηθευτής'}</div>
        <div class="pname">${inv.counterparty || '—'}</div>
        ${inv.trade_name ? `<div class="ptrade">"${inv.trade_name}"</div>` : ''}
        ${inv.afm ? `<div class="pinfo">ΑΦΜ: <strong>${inv.afm}</strong>${inv.doy ? ' · ΔΟΥ: ' + inv.doy : ''}</div>` : ''}
        ${inv.address ? `<div class="pinfo">${inv.address}${inv.city ? ', ' + inv.city : ''}${inv.postal ? ' ' + inv.postal : ''}</div>` : ''}
        ${inv.phone ? `<div class="pinfo">Τηλ: ${inv.phone}</div>` : ''}
      </div>
    </div>

    <table>
      <thead><tr>
        <th style="width:8%">ΚΩΔΙΚΟΣ</th>
        <th style="width:32%">ΠΕΡΙΓΡΑΦΗ</th>
        <th>ΠΟΣ.</th>
        <th>ΜΟΝΑΔΑ</th>
        <th>ΤΙΜΗ ΜΟΝ.</th>
        <th>ΕΚΠΤ.%</th>
        <th>ΚΑΘΑΡΗ ΑΞΙΑ</th>
        <th>ΦΠΑ%</th>
        <th>ΑΞΙΑ ΦΠΑ</th>
        <th>ΣΥΝΟΛΟ</th>
      </tr></thead>
      <tbody>
        ${items.length > 0 ? items.map(item => {
          const qty = parseFloat(item.quantity) || 1
          const up = parseFloat(item.unit_price) || 0
          const disc = parseFloat(item.discount_pct) || 0
          const net = parseFloat(item.net_value) || (up * qty * (1 - disc / 100))
          const vatR = parseFloat(item.vat_rate) || parseFloat(inv.vat_rate) || 24
          const vatAmt = parseFloat(item.vat_amount) || (net * vatR / 100)
          const tot = parseFloat(item.total) || (net + vatAmt)
          return `<tr>
            <td style="font-family:monospace;font-size:10px;color:#555">${item.code || '—'}</td>
            <td style="font-weight:500">${item.description || '—'}${item.barcode ? '<br><span style="font-size:9px;color:#999">EAN: ' + item.barcode + '</span>' : ''}</td>
            <td>${qty}</td>
            <td style="color:#666">${item.unit || 'τεμ'}</td>
            <td>${up.toFixed(2)}€</td>
            <td style="color:#c00">${disc > 0 ? disc + '%' : '—'}</td>
            <td>${net.toFixed(2)}€</td>
            <td style="color:#555">${vatR}%</td>
            <td style="color:#555">${vatAmt.toFixed(2)}€</td>
            <td style="font-weight:bold">${tot.toFixed(2)}€</td>
          </tr>`
        }).join('') : '<tr><td colspan="10" style="text-align:center;color:#999;padding:16px">Δεν υπάρχουν αναλυτικά είδη</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <div class="ttable">
        <div class="trow"><span>Καθαρή αξία:</span><span>${totalNet.toFixed(2)}€</span></div>
        ${totalDiscount > 0 ? `<div class="trow" style="color:#c00"><span>Εκπτώσεις:</span><span>-${totalDiscount.toFixed(2)}€</span></div>` : ''}
        ${vatBreakdown.length > 1 ? vatBreakdown.map(v => `<div class="trow"><span>ΦΠΑ ${v.rate}%:</span><span>${parseFloat(v.vat).toFixed(2)}€</span></div>`).join('') : `<div class="trow"><span>ΦΠΑ ${inv.vat_rate || 24}%:</span><span>${totalVat.toFixed(2)}€</span></div>`}
        ${inv.rounding ? `<div class="trow"><span>Στρογγυλοπ.:</span><span>${parseFloat(inv.rounding).toFixed(2)}€</span></div>` : ''}
        <div class="trow grand"><span>ΓΕΝΙΚΟ ΣΥΝΟΛΟ:</span><span>${totalAmount.toFixed(2)}€</span></div>
      </div>
    </div>

    <div class="footer">
      <div>${inv.purpose ? '<strong>Σκοπός:</strong> ' + inv.purpose : ''}</div>
      <div>${inv.notes ? '<strong>Σημ.:</strong> ' + inv.notes : ''}</div>
    </div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`)
    win.document.close()
  }

  const InfoChip = ({ icon, text }) => text ? (
    <span style={{ fontSize: 11, color: '#9ca3af', background: '#1e2232', padding: '3px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {icon} {text}
    </span>
  ) : null

  return (
    <div style={{ borderTop: '1px solid #1e2232', background: '#0a0c13', padding: '18px 20px' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <InfoChip icon="💳" text={inv.payment_method} />
          <InfoChip icon="⏰" text={inv.due_date ? `Λήξη: ${fmtDate(inv.due_date)}` : null} />
          <InfoChip icon="🏦" text={inv.bank} />
          {inv.iban && <InfoChip icon="💳" text={inv.iban} />}
          {inv.mark && <InfoChip icon="📌" text={`MARK: ${inv.mark}`} />}
          {inv.time && <InfoChip icon="🕐" text={inv.time} />}
        </div>
        <button onClick={printInvoice} style={{ ...C.btnIcon, display: 'flex', alignItems: 'center', gap: 6 }}>
          🖨️ Εκτύπωση / PDF
        </button>
      </div>

      {/* Εκδότης & Αντισυμβαλλόμενος */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { title: '🏢 ΕΚΔΟΤΗΣ', name: inv.issuer_name, trade: inv.issuer_trade_name, afm: inv.issuer_afm, doy: inv.issuer_doy, gem: inv.issuer_gem, addr: inv.issuer_address, city: inv.issuer_city, postal: inv.issuer_postal, phone: inv.issuer_phone, email: inv.issuer_email },
          { title: inv.type === 'income' ? '👤 ΠΕΛΑΤΗΣ' : '🏪 ΠΡΟΜΗΘΕΥΤΗΣ', name: inv.counterparty, trade: inv.trade_name, afm: inv.afm, doy: inv.doy, addr: inv.address, city: inv.city, postal: inv.postal, phone: inv.phone }
        ].map(p => (
          <div key={p.title} style={{ background: '#13151f', borderRadius: 9, padding: '13px 16px', border: '1px solid #1e2232' }}>
            <div style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>{p.title}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name || '—'}</div>
            {p.trade && <div style={{ fontSize: 12, color: '#4f8ef7', marginTop: 2 }}>"{p.trade}"</div>}
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {p.afm && <div style={{ fontSize: 11, color: '#9ca3af' }}>ΑΦΜ: <span style={{ fontFamily: 'monospace', color: '#e8eaf0' }}>{p.afm}</span>{p.doy ? ` · ΔΟΥ: ${p.doy}` : ''}</div>}
              {p.gem && <div style={{ fontSize: 11, color: '#9ca3af' }}>ΓΕΜΗ: <span style={{ fontFamily: 'monospace' }}>{p.gem}</span></div>}
              {p.addr && <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.addr}{p.city ? `, ${p.city}` : ''}{p.postal ? ` ${p.postal}` : ''}</div>}
              {p.phone && <div style={{ fontSize: 11, color: '#9ca3af' }}>Τηλ: {p.phone}</div>}
              {p.email && <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.email}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Πίνακας ειδών */}
      <div style={{ overflowX: 'auto', marginBottom: 16, borderRadius: 9, border: '1px solid #1e2232', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr style={{ background: '#13151f' }}>
              {['ΚΩΔΙΚΟΣ', 'ΠΕΡΙΓΡΑΦΗ', 'ΠΟΣ.', 'ΜΟΝΑΔΑ', 'ΤΙΜΗ ΜΟΝ.', 'ΕΚΠΤ.%', 'ΚΑΘΑΡΗ ΑΞΙΑ', 'ΦΠΑ%', 'ΑΞΙΑ ΦΠΑ', 'ΣΥΝΟΛΟ'].map((h, i) => (
                <th key={h} style={{ fontSize: 9, fontWeight: 700, color: '#5a6070', padding: '9px 10px', borderBottom: '1px solid #1e2232', textAlign: i <= 1 ? 'left' : 'right', letterSpacing: .5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map((item, i) => {
              const qty = parseFloat(item.quantity) || 1
              const up = parseFloat(item.unit_price) || 0
              const disc = parseFloat(item.discount_pct) || 0
              const net = parseFloat(item.net_value) || (up * qty * (1 - disc / 100))
              const vatR = parseFloat(item.vat_rate) || parseFloat(inv.vat_rate) || 24
              const vatAmt = parseFloat(item.vat_amount) || (net * vatR / 100)
              const tot = parseFloat(item.total) || (net + vatAmt)
              return (
                <tr key={i} style={{ borderBottom: '1px solid #161824' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#13151f'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '9px 10px', fontSize: 11, fontFamily: 'monospace', color: '#7c5cf7' }}>{item.code || '—'}</td>
                  <td style={{ padding: '9px 10px', fontSize: 12, fontWeight: 500 }}>
                    {item.description || '—'}
                    {item.barcode && <div style={{ fontSize: 10, color: '#5a6070', fontFamily: 'monospace' }}>EAN: {item.barcode}</div>}
                  </td>
                  <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{qty}</td>
                  <td style={{ padding: '9px 10px', fontSize: 11, textAlign: 'right', color: '#5a6070' }}>{item.unit || 'τεμ'}</td>
                  <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{up.toFixed(2)}€</td>
                  <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: disc > 0 ? '#f87171' : '#3a4055' }}>{disc > 0 ? `-${disc}%` : '—'}</td>
                  <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{net.toFixed(2)}€</td>
                  <td style={{ padding: '9px 10px', fontSize: 11, textAlign: 'right', color: '#5a6070' }}>{vatR}%</td>
                  <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#5a6070' }}>{vatAmt.toFixed(2)}€</td>
                  <td style={{ padding: '9px 10px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color }}>{tot.toFixed(2)}€</td>
                </tr>
              )
            }) : (
              <tr><td colSpan={10} style={{ padding: 20, textAlign: 'center', color: '#5a6070', fontSize: 12 }}>
                Το AI δεν εξήγαγε αναλυτικά είδη από αυτό το παραστατικό
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Σύνολα & ΦΠΑ ανάλυση */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        {/* ΦΠΑ ανάλυση αν υπάρχει */}
        {vatBreakdown.length > 0 && (
          <div style={{ background: '#13151f', borderRadius: 9, padding: '12px 16px', border: '1px solid #1e2232', minWidth: 240 }}>
            <div style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>ΑΝΑΛΥΣΗ ΦΠΑ</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['ΣΥΝΤΕΛΕΣΤΗΣ', 'ΚΑΘΑΡΗ', 'ΦΠΑ'].map(h => <th key={h} style={{ fontSize: 9, color: '#5a6070', textAlign: 'right', padding: '3px 6px', fontWeight: 700 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {vatBreakdown.map((v, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11, textAlign: 'right', padding: '4px 6px', color: '#9ca3af' }}>{v.rate}%</td>
                    <td style={{ fontSize: 11, textAlign: 'right', padding: '4px 6px', fontFamily: 'monospace' }}>{parseFloat(v.net).toFixed(2)}€</td>
                    <td style={{ fontSize: 11, textAlign: 'right', padding: '4px 6px', fontFamily: 'monospace', color }}>{parseFloat(v.vat).toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Σύνολα */}
        <div style={{ background: '#13151f', borderRadius: 9, padding: '14px 20px', minWidth: 280, border: '1px solid #1e2232', marginLeft: 'auto' }}>
          {[
            ['Καθαρή αξία', totalNet, '#9ca3af'],
            ...(totalDiscount > 0 ? [['Εκπτώσεις', -totalDiscount, '#f87171']] : []),
            ...(vatBreakdown.length <= 1 ? [[`ΦΠΑ ${inv.vat_rate || 24}%`, totalVat, '#9ca3af']] : [['Σύνολο ΦΠΑ', totalVat, '#9ca3af']]),
            ...(inv.rounding ? [['Στρογγυλοποίηση', parseFloat(inv.rounding), '#9ca3af']] : []),
          ].map(([label, val, c]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: c }}>
              <span>{label}:</span>
              <span style={{ fontFamily: 'monospace' }}>{val < 0 ? '-' : ''}{Math.abs(val).toFixed(2)}€</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontSize: 18, fontWeight: 700, borderTop: '2px solid #2a3040', marginTop: 8, color }}>
            <span>ΓΕΝΙΚΟ ΣΥΝΟΛΟ:</span>
            <span style={{ fontFamily: 'monospace' }}>{totalAmount.toFixed(2)}€</span>
          </div>
        </div>
      </div>

      {/* Σκοπός & Σημειώσεις */}
      {(inv.purpose || inv.notes || inv.delivery_address) && (
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {inv.purpose && <div style={{ background: '#13151f', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#9ca3af', border: '1px solid #1e2232' }}><strong style={{ color: '#e8eaf0' }}>Σκοπός:</strong> {inv.purpose}</div>}
          {inv.delivery_address && <div style={{ background: '#13151f', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#9ca3af', border: '1px solid #1e2232' }}><strong style={{ color: '#e8eaf0' }}>Παράδοση:</strong> {inv.delivery_address}</div>}
          {inv.notes && <div style={{ background: '#13151f', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#9ca3af', border: '1px solid #1e2232' }}><strong style={{ color: '#e8eaf0' }}>Σημειώσεις:</strong> {inv.notes}</div>}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   ΚΑΡΤΕΛΕΣ
═══════════════════════════════════════ */
function KartelesTab({ invoices, byCounterparty, fmt, fmtDate }) {
  const [cpType, setCpType] = useState('income')
  const [selCP, setSelCP] = useState(null)
  const list = byCounterparty(cpType)
  const selected = list.find(c => c.name === selCP)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, 290px) 1fr', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[['income', '📈 Πελάτες', '#4ade80', '#0a2215'], ['expense', '📉 Προμηθευτές', '#f87171', '#2a0f0f']].map(([type, label, color, bg]) => (
            <button key={type} onClick={() => { setCpType(type); setSelCP(null) }}
              style={{ flex: 1, padding: '9px', borderRadius: 7, border: `1px solid ${cpType === type ? color + '44' : '#2a3040'}`, background: cpType === type ? bg : 'transparent', color: cpType === type ? color : '#5a6070', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {list.length === 0 && <div style={{ color: '#5a6070', fontSize: 13, textAlign: 'center', padding: 28 }}>Δεν υπάρχουν ακόμα</div>}
          {list.map(cp => (
            <div key={cp.name} onClick={() => setSelCP(cp.name)}
              style={{ padding: '11px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${selCP === cp.name ? (cpType === 'income' ? '#4ade80' : '#f87171') + '66' : '#2a3040'}`, background: selCP === cp.name ? (cpType === 'income' ? '#0a2215' : '#2a0f0f') : '#0f1117', transition: 'all .15s' }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{cp.name}</div>
              {cp.trade_name && <div style={{ fontSize: 10, color: '#4f8ef7', marginTop: 1 }}>"{cp.trade_name}"</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontSize: 10, color: '#5a6070' }}>{cp.invoices.length} παραστατικά{cp.afm ? ` · ${cp.afm}` : ''}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: cpType === 'income' ? '#4ade80' : '#f87171', fontWeight: 700 }}>{fmt(cp.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        {!selected ? (
          <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, padding: 56, textAlign: 'center', color: '#5a6070' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👆</div>
            <div style={{ fontWeight: 600 }}>Επίλεξε {cpType === 'income' ? 'πελάτη' : 'προμηθευτή'} για καρτέλα</div>
          </div>
        ) : (
          <div>
            <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, padding: '16px 20px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</h3>
                {selected.trade_name && <div style={{ fontSize: 12, color: '#4f8ef7', marginTop: 2 }}>"{selected.trade_name}"</div>}
                <div style={{ fontSize: 12, color: '#5a6070', marginTop: 3 }}>
                  {selected.afm && `ΑΦΜ: ${selected.afm}`}{selected.doy && ` · ΔΟΥ: ${selected.doy}`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#5a6070', marginBottom: 2 }}>ΣΥΝΟΛΟ ΣΥΝΑΛΛΑΓΩΝ</div>
                <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color: cpType === 'income' ? '#4ade80' : '#f87171' }}>{fmt(selected.total)}</div>
                <div style={{ fontSize: 11, color: '#5a6070' }}>{selected.invoices.length} παραστατικά</div>
              </div>
            </div>
            <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 550 }}>
                  <thead>
                    <tr>{['ΗΜΕΡΟΜΗΝΙΑ', 'ΕΙΔΟΣ', 'ΑΡΙΘΜΟΣ', 'ΚΑΘΑΡΗ', 'ΦΠΑ', 'ΣΥΝΟΛΟ', 'ΠΛΗΡΩΜΗ'].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#5a6070', padding: '9px 12px', borderBottom: '1px solid #1e2232' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {selected.invoices.map(inv => (
                      <tr key={inv.id}
                        onMouseEnter={e => e.currentTarget.style.background = '#1a1d2b'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{fmtDate(inv.date)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 11, color: '#4f8ef7', fontWeight: 600 }}>{inv.invoice_type || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 12, fontFamily: 'monospace', color: '#7c5cf7' }}>{inv.series || ''}{inv.number || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 12, fontFamily: 'monospace', textAlign: 'right' }}>{fmt(inv.subtotal)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: '#5a6070' }}>{fmt(inv.vat)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: cpType === 'income' ? '#4ade80' : '#f87171' }}>{fmt(inv.total)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 11, color: '#5a6070' }}>{inv.payment_method || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
