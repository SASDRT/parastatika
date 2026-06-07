'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const fmt = (n) => new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(n || 0)
const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('el-GR') } catch { return d } }

const TABS = ['📸 Σάρωση', '📈 Έσοδα', '📉 Έξοδα', '📋 Καρτέλες', '💰 Υπόλοιπα']

const s = {
  // Layout
  app: { minHeight: '100vh', background: '#0f1117', color: '#e8eaf0' },
  header: { background: '#13151f', borderBottom: '1px solid #2e3347', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100 },
  headerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, gap: 12 },
  logo: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 },
  logoIcon: { width: 30, height: 30, background: '#4f8ef7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  stats: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  stat: (color, bg) => ({ textAlign: 'center', padding: '4px 10px', borderRadius: 6, background: bg }),
  statLabel: (color) => ({ fontSize: 10, color, fontWeight: 700, letterSpacing: 1 }),
  statVal: (color) => ({ fontSize: 13, color, fontFamily: 'monospace', fontWeight: 700 }),
  tabs: { background: '#13151f', borderBottom: '1px solid #2e3347', overflowX: 'auto', display: 'flex' },
  tab: (active) => ({ background: 'none', border: 'none', color: active ? '#4f8ef7' : '#6b7280', padding: '12px 14px', fontSize: 13, fontWeight: active ? 600 : 400, borderBottom: active ? '2px solid #4f8ef7' : '2px solid transparent', whiteSpace: 'nowrap', cursor: 'pointer' }),
  content: { maxWidth: 1100, margin: '0 auto', padding: '20px 16px' },
  // Cards
  card: { background: '#1a1d27', border: '1px solid #2e3347', borderRadius: 12, padding: 20 },
  // Buttons
  btnPrimary: { background: '#4f8ef7', color: '#fff', padding: '11px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14 },
  btnGhost: { background: 'transparent', color: '#9ca3af', border: '1px solid #2e3347', padding: '10px 16px', borderRadius: 8, fontSize: 13 },
  btnDanger: { background: 'transparent', color: '#f87171', padding: '4px 8px', borderRadius: 6, fontSize: 12 },
  // Table
  th: { textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#6b7280', padding: '10px 12px', borderBottom: '1px solid #2e3347' },
  td: { padding: '12px', borderBottom: '1px solid #1e2130', fontSize: 13 },
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

  // Load invoices
  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
    if (!error) setInvoices(data || [])
    setLoading(false)
  }

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3000) }

  // OCR
  const handleFile = async (file) => {
    if (!file) return
    setScanning(true)
    setEditForm(null)
    setPreviewImg(null)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target.result
        const base64 = dataUrl.split(',')[1]
        const mediaType = file.type || 'image/jpeg'
        setPreviewImg(dataUrl)

        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, mediaType })
        })
        const json = await res.json()
        if (json.success) setEditForm(json.data)
        else notify('⚠️ Δεν μπόρεσα να διαβάσω το παραστατικό. Δοκίμασε πιο καθαρή φωτογραφία.')
        setScanning(false)
      }
      reader.readAsDataURL(file)
    } catch (e) {
      notify('⚠️ Σφάλμα: ' + e.message)
      setScanning(false)
    }
  }

  const saveInvoice = async () => {
    if (!editForm) return
    setSaving(true)
    const row = {
      type: editForm.type || 'expense',
      number: editForm.number || null,
      date: editForm.date || null,
      counterparty: editForm.counterparty || null,
      afm: editForm.afm || null,
      subtotal: parseFloat(editForm.subtotal) || 0,
      vat_rate: parseFloat(editForm.vat_rate) || 24,
      vat: parseFloat(editForm.vat) || 0,
      total: parseFloat(editForm.total) || 0,
      payment_method: editForm.payment_method || null,
      notes: editForm.notes || null,
      items: editForm.items || []
    }
    const { error } = await supabase.from('invoices').insert([row])
    if (error) { notify('⚠️ Σφάλμα αποθήκευσης: ' + error.message) }
    else {
      notify('✓ Παραστατικό αποθηκεύτηκε!')
      setEditForm(null)
      setPreviewImg(null)
      await loadInvoices()
      setTab(row.type === 'income' ? 1 : 2)
    }
    setSaving(false)
  }

  const deleteInvoice = async (id) => {
    if (!confirm('Διαγραφή παραστατικού;')) return
    await supabase.from('invoices').delete().eq('id', id)
    await loadInvoices()
    notify('Διαγράφηκε.')
  }

  // Derived
  const income = invoices.filter(i => i.type === 'income')
  const expenses = invoices.filter(i => i.type === 'expense')
  const totalIncome = income.reduce((s, i) => s + (i.total || 0), 0)
  const totalExpense = expenses.reduce((s, i) => s + (i.total || 0), 0)
  const balance = totalIncome - totalExpense

  const filtered = (list) => {
    if (!searchQ) return list
    const q = searchQ.toLowerCase()
    return list.filter(i => (i.counterparty || '').toLowerCase().includes(q) || (i.number || '').toLowerCase().includes(q) || (i.afm || '').includes(q))
  }

  const byCounterparty = (type) => {
    const map = {}
    invoices.filter(i => i.type === type).forEach(inv => {
      const key = inv.counterparty || 'Άγνωστος'
      if (!map[key]) map[key] = { name: key, afm: inv.afm, invoices: [], total: 0 }
      map[key].invoices.push(inv)
      map[key].total += inv.total || 0
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            <div style={s.logoIcon}>📋</div>
            <span>Παραστατικά</span>
          </div>
          <div style={s.stats}>
            <div style={s.stat('#4ade80', '#0d3320')}>
              <div style={s.statLabel('#4ade80')}>ΕΣΟΔΑ</div>
              <div style={s.statVal('#4ade80')}>{fmt(totalIncome)}</div>
            </div>
            <div style={s.stat('#f87171', '#3a1212')}>
              <div style={s.statLabel('#f87171')}>ΕΞΟΔΑ</div>
              <div style={s.statVal('#f87171')}>{fmt(totalExpense)}</div>
            </div>
            <div style={s.stat(balance >= 0 ? '#60b4f7' : '#f87171', balance >= 0 ? '#0d2a3a' : '#3a1212')}>
              <div style={s.statLabel(balance >= 0 ? '#60b4f7' : '#f87171')}>ΥΠΟΛΟΙΠΟ</div>
              <div style={s.statVal(balance >= 0 ? '#60b4f7' : '#f87171')}>{fmt(balance)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map((t, i) => <button key={t} onClick={() => setTab(i)} style={s.tab(tab === i)}>{t}</button>)}
      </div>

      {/* Notification */}
      {notification && (
        <div style={{ position: 'fixed', top: 16, right: 16, background: '#1a2e1a', border: '1px solid #4ade80', color: '#4ade80', padding: '10px 18px', borderRadius: 8, fontSize: 13, zIndex: 999, fontWeight: 600 }}>
          {notification}
        </div>
      )}

      <div style={s.content}>

        {/* ── TAB 0: Σάρωση ── */}
        {tab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: editForm ? '1fr 1fr' : '1fr', gap: 20 }}>
            <div>
              {scanning ? (
                <div style={{ ...s.card, textAlign: 'center', padding: '48px 24px' }}>
                  {previewImg && <img src={previewImg} alt="" style={{ maxHeight: 160, borderRadius: 8, maxWidth: '100%', marginBottom: 20 }} />}
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                  <div style={{ color: '#4f8ef7', fontWeight: 600, fontSize: 15 }}>Ανάγνωση παραστατικού...</div>
                  <div style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>Το AI εξάγει τα στοιχεία</div>
                </div>
              ) : (
                <div style={{ ...s.card, textAlign: 'center', padding: '40px 24px' }}>
                  {previewImg && !editForm && (
                    <div style={{ marginBottom: 20 }}>
                      <img src={previewImg} alt="" style={{ maxHeight: 160, borderRadius: 8, maxWidth: '100%' }} />
                    </div>
                  )}
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Ανέβασε παραστατικό</div>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 24 }}>Φωτογράφισε ή επίλεξε αρχείο</div>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <label style={{ ...s.btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', fontSize: 15, borderRadius: 8, cursor: 'pointer' }}>
                      📷 Κάμερα
                      <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                    </label>
                    <label style={{ ...s.btnGhost, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', fontSize: 15, borderRadius: 8, cursor: 'pointer' }}>
                      🖼️ Από συλλογή
                      <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Edit form */}
            {editForm && (
              <div style={s.card}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#9ca3af', marginBottom: 16, letterSpacing: 1 }}>ΕΠΑΛΗΘΕΥΣΗ ΣΤΟΙΧΕΙΩΝ</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>ΤΥΠΟΣ</label>
                      <select value={editForm.type || 'expense'} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="income">📈 Έσοδο</option>
                        <option value="expense">📉 Έξοδο</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>ΗΜΕΡΟΜΗΝΙΑ</label>
                      <input type="date" value={editForm.date || ''} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>ΑΡΙΘΜΟΣ ΠΑΡΑΣΤΑΤΙΚΟΥ</label>
                    <input value={editForm.number || ''} onChange={e => setEditForm(f => ({ ...f, number: e.target.value }))} placeholder="π.χ. ΤΔΑ-0045" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>{editForm.type === 'income' ? 'ΠΕΛΑΤΗΣ' : 'ΠΡΟΜΗΘΕΥΤΗΣ'}</label>
                      <input value={editForm.counterparty || ''} onChange={e => setEditForm(f => ({ ...f, counterparty: e.target.value }))} placeholder="Επωνυμία" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>ΑΦΜ</label>
                      <input value={editForm.afm || ''} onChange={e => setEditForm(f => ({ ...f, afm: e.target.value }))} placeholder="123456789" className="mono" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>ΚΑΘΑΡΗ €</label>
                      <input type="number" value={editForm.subtotal || ''} onChange={e => setEditForm(f => ({ ...f, subtotal: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>ΦΠΑ €</label>
                      <input type="number" value={editForm.vat || ''} onChange={e => setEditForm(f => ({ ...f, vat: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>ΣΥΝΟΛΟ €</label>
                      <input type="number" value={editForm.total || ''} onChange={e => setEditForm(f => ({ ...f, total: e.target.value }))} style={{ fontWeight: 700, color: editForm.type === 'income' ? '#4ade80' : '#f87171' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>ΣΗΜΕΙΩΣΕΙΣ</label>
                    <textarea rows={2} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button style={{ ...s.btnPrimary, flex: 1, opacity: saving ? .7 : 1 }} onClick={saveInvoice} disabled={saving}>
                      {saving ? '⏳ Αποθήκευση...' : '✓ Αποθήκευση'}
                    </button>
                    <button style={s.btnGhost} onClick={() => { setEditForm(null); setPreviewImg(null) }}>Ακύρωση</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 1 & 2: Λίστα ── */}
        {(tab === 1 || tab === 2) && (() => {
          const list = tab === 1 ? income : expenses
          const color = tab === 1 ? '#4ade80' : '#f87171'
          const total = list.reduce((s, i) => s + (i.total || 0), 0)
          const flist = filtered(list)
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>{tab === 1 ? 'Έσοδα' : 'Έξοδα'}</h2>
                <span style={{ fontFamily: 'monospace', color, fontSize: 16, fontWeight: 700 }}>{fmt(total)}</span>
                <span style={{ color: '#6b7280', fontSize: 13 }}>({list.length})</span>
                <div style={{ marginLeft: 'auto', width: 200 }}>
                  <input placeholder="🔍 Αναζήτηση..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ fontSize: 13 }} />
                </div>
                <button style={s.btnPrimary} onClick={() => setTab(0)}>+ Νέο</button>
              </div>
              {loading ? (
                <div style={{ ...s.card, textAlign: 'center', padding: 40, color: '#6b7280' }}>Φόρτωση...</div>
              ) : flist.length === 0 ? (
                <div style={{ ...s.card, textAlign: 'center', padding: 48, color: '#6b7280' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                  <div>Δεν υπάρχουν παραστατικά ακόμα</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {flist.map(inv => (
                    <div key={inv.id} style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
                      {/* Κεφαλίδα γραμμής */}
                      <div
                        onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                        style={{ display: 'grid', gridTemplateColumns: '100px 90px 1fr 120px 100px 100px 110px 40px', gap: 8, padding: '12px 16px', cursor: 'pointer', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1e2232'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>{fmtDate(inv.date)}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{inv.number || '—'}</span>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{inv.counterparty || '—'}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{inv.afm || '—'}</span>
                        <span style={{ fontFamily: 'monospace', textAlign: 'right', fontSize: 12 }}>{fmt(inv.subtotal)}</span>
                        <span style={{ fontFamily: 'monospace', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{fmt(inv.vat)}</span>
                        <span style={{ fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color, fontSize: 13 }}>{fmt(inv.total)}</span>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <span style={{ color: '#6b7280', fontSize: 14 }}>{expandedId === inv.id ? '▲' : '▼'}</span>
                          <button style={s.btnDanger} onClick={e => { e.stopPropagation(); deleteInvoice(inv.id) }}>✕</button>
                        </div>
                      </div>
                      {/* Αναπτυσσόμενη προβολή τιμολογίου */}
                      {expandedId === inv.id && (
                        <div style={{ borderTop: '1px solid #2e3347', background: '#13151f' }}>
                          <InvoiceDetail inv={inv} color={color} fmt={fmt} fmtDate={fmtDate} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── TAB 3: Καρτέλες ── */}
        {tab === 3 && <KartelesTab invoices={invoices} byCounterparty={byCounterparty} fmt={fmt} fmtDate={fmtDate} s={s} />}

        {/* ── TAB 4: Υπόλοιπα ── */}
        {tab === 4 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {[{ type: 'income', label: 'Πελάτες — Εισπρακτέα', color: '#4ade80', total: totalIncome },
              { type: 'expense', label: 'Προμηθευτές — Πληρωτέα', color: '#f87171', total: totalExpense }].map(({ type, label, color, total }) => (
              <div key={type}>
                <h3 style={{ fontWeight: 600, marginBottom: 14, color }}>{label}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {byCounterparty(type).length === 0 && <div style={{ ...s.card, color: '#6b7280', textAlign: 'center', padding: 32 }}>Δεν υπάρχουν ακόμα</div>}
                  {byCounterparty(type).map(cp => (
                    <div key={cp.name} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{cp.name}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{cp.invoices.length} παραστατικά{cp.afm ? ` · ${cp.afm}` : ''}</div>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color }}>{fmt(cp.total)}</div>
                    </div>
                  ))}
                  {byCounterparty(type).length > 0 && (
                    <div style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'monospace', fontWeight: 700, color }}>
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

function InvoiceDetail({ inv, color, fmt, fmtDate }) {
  const items = inv.items || []
  const totalDiscount = items.reduce((s, i) => s + ((i.discount || 0) * (i.quantity || 1) * (i.unit_price || 0) / 100), 0)
  const totalNet = items.length > 0 ? items.reduce((s, i) => s + (i.total || 0), 0) : (inv.subtotal || 0)
  const totalVat = inv.vat || 0
  const totalAmount = inv.total || 0

  const printInvoice = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Παραστατικό ${inv.number || ''}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
        h2 { margin-bottom: 4px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .info { margin-bottom: 16px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
        th { background: #f0f0f0; border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        td { border: 1px solid #ccc; padding: 6px 8px; }
        .totals { margin-left: auto; width: 280px; }
        .totals table td { border: none; padding: 4px 8px; }
        .totals .grand { font-weight: bold; font-size: 15px; border-top: 2px solid #000; }
        @media print { button { display: none; } }
      </style></head><body>
      <div class="header">
        <div><h2>ΠΑΡΑΣΤΑΤΙΚΟ ${inv.type === 'income' ? 'ΠΩΛΗΣΗΣ' : 'ΑΓΟΡΑΣ'}</h2><div>Αρ. ${inv.number || '—'}</div></div>
        <div style="text-align:right"><div>Ημερομηνία: ${fmtDate(inv.date)}</div><div>Τρόπος πληρωμής: ${inv.payment_method || '—'}</div></div>
      </div>
      <div class="info">
        <strong>${inv.type === 'income' ? 'ΠΕΛΑΤΗΣ' : 'ΠΡΟΜΗΘΕΥΤΗΣ'}:</strong> ${inv.counterparty || '—'} &nbsp;&nbsp;
        <strong>ΑΦΜ:</strong> ${inv.afm || '—'}
      </div>
      <table>
        <thead><tr><th>ΠΕΡΙΓΡΑΦΗ</th><th>ΠΟΣ.</th><th>ΤΙΜΗ ΜΟΝ.</th><th>ΕΚΠΤΩΣΗ %</th><th>ΚΑΘΑΡΗ ΑΞΙΑ</th><th>ΦΠΑ %</th><th>ΑΞΙΑ ΦΠΑ</th><th>ΣΥΝΟΛΟ</th></tr></thead>
        <tbody>
          ${items.length > 0 ? items.map(item => {
            const net = (item.unit_price || 0) * (item.quantity || 1) * (1 - (item.discount || 0) / 100)
            const vatAmt = net * ((item.vat_rate || inv.vat_rate || 24) / 100)
            return `<tr>
              <td>${item.description || '—'}</td>
              <td style="text-align:right">${item.quantity || 1}</td>
              <td style="text-align:right">${(item.unit_price || 0).toFixed(2)}€</td>
              <td style="text-align:right">${item.discount || 0}%</td>
              <td style="text-align:right">${net.toFixed(2)}€</td>
              <td style="text-align:right">${item.vat_rate || inv.vat_rate || 24}%</td>
              <td style="text-align:right">${vatAmt.toFixed(2)}€</td>
              <td style="text-align:right"><strong>${(item.total || net + vatAmt).toFixed(2)}€</strong></td>
            </tr>`
          }).join('') : `<tr><td colspan="8" style="text-align:center;color:#999">Δεν υπάρχουν είδη</td></tr>`}
        </tbody>
      </table>
      <div class="totals">
        <table>
          <tr><td>Καθαρή αξία:</td><td style="text-align:right">${totalNet.toFixed(2)}€</td></tr>
          ${totalDiscount > 0 ? `<tr><td>Εκπτώσεις:</td><td style="text-align:right;color:red">-${totalDiscount.toFixed(2)}€</td></tr>` : ''}
          <tr><td>ΦΠΑ (${inv.vat_rate || 24}%):</td><td style="text-align:right">${totalVat.toFixed(2)}€</td></tr>
          <tr class="grand"><td><strong>ΣΥΝΟΛΟ:</strong></td><td style="text-align:right"><strong>${totalAmount.toFixed(2)}€</strong></td></tr>
        </table>
      </div>
      ${inv.notes ? `<div style="margin-top:16px;font-size:12px;color:#666"><strong>Σημειώσεις:</strong> ${inv.notes}</div>` : ''}
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Κεφαλίδα λεπτομέρειας */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, letterSpacing: 1 }}>ΑΝΑΛΥΣΗ ΠΑΡΑΣΤΑΤΙΚΟΥ</div>
        <button onClick={printInvoice} style={{ background: '#2e3347', color: '#e8eaf0', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          🖨️ Εκτύπωση / PDF
        </button>
      </div>

      {/* Στοιχεία */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          ['Τρόπος Πληρωμής', inv.payment_method || '—'],
          ['ΦΠΑ %', `${inv.vat_rate || 24}%`],
          ['Σημειώσεις', inv.notes || '—'],
        ].map(([label, val]) => (
          <div key={label} style={{ background: '#1a1d27', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 12 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Πίνακας ειδών */}
      {items.length > 0 ? (
        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#1a1d27' }}>
                {['ΠΕΡΙΓΡΑΦΗ', 'ΠΟΣ.', 'ΤΙΜΗ ΜΟΝ.', 'ΕΚΠΤΩΣΗ %', 'ΚΑΘΑΡΗ ΑΞΙΑ', 'ΦΠΑ %', 'ΑΞΙΑ ΦΠΑ', 'ΣΥΝΟΛΟ'].map(h => (
                  <th key={h} style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', padding: '8px 10px', borderBottom: '1px solid #2e3347', textAlign: h === 'ΠΕΡΙΓΡΑΦΗ' ? 'left' : 'right', letterSpacing: .5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const qty = item.quantity || 1
                const up = item.unit_price || 0
                const disc = item.discount || 0
                const net = up * qty * (1 - disc / 100)
                const vatR = item.vat_rate || inv.vat_rate || 24
                const vatAmt = net * (vatR / 100)
                const total = item.total || (net + vatAmt)
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #1e2130' }}>
                    <td style={{ padding: '9px 10px', fontSize: 12, fontWeight: 500 }}>{item.description || '—'}</td>
                    <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{qty}</td>
                    <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{up.toFixed(2)}€</td>
                    <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: disc > 0 ? '#f87171' : '#6b7280' }}>{disc > 0 ? `-${disc}%` : '—'}</td>
                    <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{net.toFixed(2)}€</td>
                    <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#6b7280' }}>{vatR}%</td>
                    <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#6b7280' }}>{vatAmt.toFixed(2)}€</td>
                    <td style={{ padding: '9px 10px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color }}>{total.toFixed(2)}€</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 16, padding: '12px', background: '#1a1d27', borderRadius: 8 }}>
          Δεν υπάρχουν αναλυτικά είδη — το AI δεν μπόρεσε να τα εξαγάγει από αυτό το παραστατικό.
        </div>
      )}

      {/* Σύνολα */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ background: '#1a1d27', borderRadius: 10, padding: '14px 20px', minWidth: 260, border: '1px solid #2e3347' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#9ca3af' }}>
            <span>Καθαρή αξία:</span>
            <span style={{ fontFamily: 'monospace' }}>{totalNet.toFixed(2)}€</span>
          </div>
          {totalDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#f87171' }}>
              <span>Εκπτώσεις:</span>
              <span style={{ fontFamily: 'monospace' }}>-{totalDiscount.toFixed(2)}€</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#9ca3af' }}>
            <span>ΦΠΑ ({inv.vat_rate || 24}%):</span>
            <span style={{ fontFamily: 'monospace' }}>{totalVat.toFixed(2)}€</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', fontSize: 16, fontWeight: 700, borderTop: '1px solid #2e3347', marginTop: 6, color }}>
            <span>ΣΥΝΟΛΟ:</span>
            <span style={{ fontFamily: 'monospace' }}>{totalAmount.toFixed(2)}€</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function KartelesTab({ invoices, byCounterparty, fmt, fmtDate, s }) {
  const [cpType, setCpType] = useState('income')
  const [selCP, setSelCP] = useState(null)
  const list = byCounterparty(cpType)
  const selected = list.find(c => c.name === selCP)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[['income', 'Πελάτες', '#4ade80', '#0d3320'], ['expense', 'Προμηθευτές', '#f87171', '#3a1212']].map(([type, label, color, bg]) => (
            <button key={type} onClick={() => { setCpType(type); setSelCP(null) }} style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid #2e3347', background: cpType === type ? bg : 'transparent', color: cpType === type ? color : '#6b7280', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.length === 0 && <div style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', padding: 24 }}>Δεν υπάρχουν ακόμα</div>}
          {list.map(cp => (
            <div key={cp.name} onClick={() => setSelCP(cp.name)} style={{ padding: '12px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${selCP === cp.name ? (cpType === 'income' ? '#4ade80' : '#f87171') : '#2e3347'}`, background: selCP === cp.name ? (cpType === 'income' ? '#0d3320' : '#3a1212') : '#13151f' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{cp.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{cp.invoices.length} παραστατικά</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: cpType === 'income' ? '#4ade80' : '#f87171', fontWeight: 700 }}>{fmt(cp.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        {!selected ? (
          <div style={{ ...s.card, textAlign: 'center', padding: 48, color: '#6b7280' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👆</div>
            <div>Επίλεξε {cpType === 'income' ? 'πελάτη' : 'προμηθευτή'} για καρτέλα</div>
          </div>
        ) : (
          <div>
            <div style={{ ...s.card, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</h3>
                {selected.afm && <div style={{ color: '#6b7280', fontSize: 13, fontFamily: 'monospace' }}>ΑΦΜ: {selected.afm}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>ΣΥΝΟΛΟ</div>
                <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: cpType === 'income' ? '#4ade80' : '#f87171' }}>{fmt(selected.total)}</div>
              </div>
            </div>
            <div style={{ ...s.card, padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                <thead>
                  <tr>{['ΗΜΕΡΟΜΗΝΙΑ', 'ΑΡΙΘΜΟΣ', 'ΚΑΘΑΡΗ', 'ΦΠΑ', 'ΣΥΝΟΛΟ', 'ΣΗΜΕΙΩΣΕΙΣ'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {selected.invoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ ...s.td, color: '#9ca3af', fontSize: 12 }}>{fmtDate(inv.date)}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>{inv.number || '—'}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', textAlign: 'right' }}>{fmt(inv.subtotal)}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', textAlign: 'right', color: '#6b7280' }}>{fmt(inv.vat)}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: cpType === 'income' ? '#4ade80' : '#f87171' }}>{fmt(inv.total)}</td>
                      <td style={{ ...s.td, color: '#6b7280', fontSize: 12 }}>{inv.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
