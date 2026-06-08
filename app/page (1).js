'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Hook για ταξινόμηση
function useSortable(data, defaultKey = 'date', defaultDir = 'desc') {
  const [sortKey, setSortKey] = React.useState(defaultKey)
  const [sortDir, setSortDir] = React.useState(defaultDir)

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...(data || [])].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey]
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const SortTh = ({ label, field, style = {} }) => (
    <th onClick={() => toggleSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: sortKey === field ? '#4f8ef7' : '#5a6070', padding: '9px 10px', borderBottom: '1px solid #1e2232', whiteSpace: 'nowrap', ...style }}>
      {label} {sortKey === field ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
    </th>
  )

  return { sorted, toggleSort, SortTh, sortKey, sortDir }
}

const fmt = (n) => new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(n || 0)
const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('el-GR') } catch { return d } }
const ALL_TABS = ['Σάρωση', 'Έσοδα', 'Έξοδα', 'Πληρωμές', 'Γεν. Έξοδα', 'Καρτέλες', 'Υπόλοιπα', 'Αναφορές', 'Dashboard']
const EMPLOYEE_TABS = ['Σάρωση', 'Έσοδα', 'Έξοδα', 'Γεν. Έξοδα']

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
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const tabRef = React.useRef(0)
  const [tab, setTabState] = useState(0)
  const setTab = (t) => { tabRef.current = t; setTabState(t) }
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [previewImg, setPreviewImg] = useState(null)
  const [searchQ, setSearchQ] = useState('')
  const [notification, setNotification] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [payments, setPayments] = useState([])
  const [generalExpenses, setGeneralExpenses] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(0) // 0 = όλοι οι μήνες
  const [showPeriodPicker, setShowPeriodPicker] = useState(false)
  const years = [2021, 2022, 2023, 2024, 2025, 2026]
  const months = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ']
  const monthsFull = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος']

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      loadInvoices(); loadPayments(); loadExpenses()
      // Load user role
      supabase.from('user_roles').select('role,name').eq('user_id', session.user.id).single()
        .then(({ data }) => setUserRole(data?.role || 'admin'))
    }
  }, [session])

  const loadInvoices = async () => {
    setLoading(true)
    const savedTab = tabRef.current
    const { data, error } = await supabase.from('invoices').select('*').order('date', { ascending: false })
    if (!error) setInvoices(data || [])
    setLoading(false)
    if (tabRef.current !== savedTab) { tabRef.current = savedTab; setTabState(savedTab) }
  }

  const loadPayments = async () => {
    const { data, error } = await supabase.from('payments').select('*').order('date', { ascending: false })
    if (!error) setPayments(data || [])
  }

  const loadExpenses = async () => {
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false })
    if (!error) setGeneralExpenses(data || [])
  }

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) { setLoginError('Συμπλήρωσε email και password'); return }
    setLoginLoading(true); setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) setLoginError('Λάθος email ή password')
    setLoginLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  const handleBackup = async () => {
    try {
      const [inv, pay, exp, trd] = await Promise.all([
        supabase.from('invoices').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('traders').select('*')
      ])
      const backup = {
        exported_at: new Date().toISOString(),
        company: 'SMART AUTOMATION SOLUTIONS DRT',
        invoices: inv.data || [],
        payments: pay.data || [],
        expenses: exp.data || [],
        traders: trd.data || []
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `parastatika-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      notify(`Backup ολοκληρώθηκε! ${backup.invoices.length} παραστατικά, ${backup.payments.length} πληρωμές`)
    } catch(e) {
      notify('Σφάλμα backup: ' + e.message, 'error')
    }
  }

  const handleExportExcel = async () => {
    try {
      notify('Προετοιμασία Excel...')
      const [inv, pay, exp] = await Promise.all([
        supabase.from('invoices').select('*').order('date', { ascending: false }),
        supabase.from('payments').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false })
      ])

      // Build CSV content for each sheet (as separate downloads)
      const fmtN = (n) => (n || 0).toFixed(2)
      const fmtD = (d) => d ? new Date(d).toLocaleDateString('el-GR') : ''
      const esc = (s) => s ? `"${String(s).replace(/"/g, '""')}"` : ''

      // Invoices CSV
      const invHeaders = ['Ημερομηνία','Τύπος','Είδος','Σειρά','Αριθμός','Εκδότης','ΑΦΜ Εκδότη','Αντισυμβαλλόμενος','ΑΦΜ','Καθαρή','ΦΠΑ','Σύνολο','Τρόπος Πληρωμής','MARK']
      const invRows = (inv.data || []).map(i => [
        fmtD(i.date), i.type==='income'?'Έσοδο':'Έξοδο', esc(i.invoice_type), esc(i.series), esc(i.number),
        esc(i.issuer_name), esc(i.issuer_afm), esc(i.counterparty), esc(i.afm),
        fmtN(i.subtotal), fmtN(i.vat), fmtN(i.total), esc(i.payment_method), esc(i.mark)
      ].join(','))

      const invCsv = [invHeaders.join(','), ...invRows].join('\n')

      // Payments CSV
      const payHeaders = ['Ημερομηνία','Τύπος','Επωνυμία','ΑΦΜ','Ποσό','Τρόπος','Αναφορά','Σημειώσεις']
      const payRows = (pay.data || []).map(p => [
        fmtD(p.date), p.type==='receipt'?'Είσπραξη':'Πληρωμή',
        esc(p.counterparty), esc(p.afm), fmtN(p.amount),
        esc(p.payment_method), esc(p.reference), esc(p.notes)
      ].join(','))
      const payCsv = [payHeaders.join(","), ...payRows].join("\n")

      // Expenses CSV
      const expHeaders = ['Ημερομηνία','Κατηγορία','Περιγραφή','Προμηθευτής','Ποσό','ΦΠΑ','Τρόπος','Αρ. Απόδειξης']
      const expRows = (exp.data || []).map(e => [
        fmtD(e.date), esc(e.category), esc(e.description), esc(e.vendor),
        fmtN(e.amount), fmtN(e.vat), esc(e.payment_method), esc(e.receipt_ref)
      ].join(','))
      const expCsv = [expHeaders.join(","), ...expRows].join("\n")

      // Download all 3 files
      const today = new Date().toISOString().split('T')[0]
      const downloads = [
        { name: `παραστατικα-${today}.csv`, content: '﻿' + invCsv },
        { name: `πληρωμες-${today}.csv`, content: '﻿' + payCsv },
        { name: `γεν-εξοδα-${today}.csv`, content: '﻿' + expCsv },
      ]

      downloads.forEach(({ name, content: c }) => {
        const blob = new Blob([c], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = name; a.click()
        URL.revokeObjectURL(url)
      })

      notify(`Export ολοκληρώθηκε! 3 αρχεία CSV (ανοίγουν σε Excel)`)
    } catch(e) {
      notify('Σφάλμα export: ' + e.message, 'error')
    }
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

    // Έλεγχος διπλοεγγραφής (αριθμός + σειρά + ΑΦΜ εκδότη)
    if (editForm.number && editForm.issuer_afm) {
      let query = supabase.from('invoices')
        .select('id')
        .eq('number', editForm.number)
        .eq('issuer_afm', editForm.issuer_afm)
        .eq('type', editForm.type || 'expense')
      if (editForm.series) query = query.eq('series', editForm.series)
      if (editForm.invoice_type) query = query.eq('invoice_type', editForm.invoice_type)
      const { data: existing } = await query.limit(1)
      if (existing && existing.length > 0) {
        notify('Το παραστατικό αυτό έχει ήδη καταχωρηθεί! (ίδιος αριθμός, σειρά και τύπος)', 'error')
        setSaving(false)
        return
      }
    }

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
      notify('Παραστατικό αποθηκεύτηκε επιτυχώς!')
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

  const copyInvoice = (inv) => {
    const copy = { ...inv }
    delete copy.id
    delete copy.created_at
    copy.date = new Date().toISOString().split('T')[0]
    copy.number = ''
    copy.series = ''
    copy.mark = null
    copy.uid = null
    setEditForm(copy)
    setTab(0)
    notify('Αντίγραφο έτοιμο — επεξεργάσου και αποθήκευσε!')
  }

  const income = invoices.filter(i => {
    if (i.type !== 'income') return false
    const d = new Date(i.date)
    return d.getFullYear() === year && (month === 0 || d.getMonth() + 1 === month)
  })
  const expenses = invoices.filter(i => {
    if (i.type !== 'expense') return false
    const d = new Date(i.date)
    return d.getFullYear() === year && (month === 0 || d.getMonth() + 1 === month)
  })
  const totalIncome = income.reduce((s, i) => s + (i.total || 0), 0)
  const totalExpense = expenses.reduce((s, i) => s + (i.total || 0), 0)
  const totalGeneralFiltered = generalExpenses.filter(e => { const d=new Date(e.date); return d.getFullYear()===year&&(month===0||d.getMonth()+1===month) }).reduce((s,e)=>s+(e.amount||0),0)
  const totalExpenseAll = totalExpense + totalGeneralFiltered
  const yearPayments = payments.filter(p => {
    const d = new Date(p.date)
    return d.getFullYear() === year && (month === 0 || d.getMonth() + 1 === month)
  })
  const totalReceipts = yearPayments.filter(p => p.type === 'receipt').reduce((s, p) => s + (p.amount || 0), 0)
  const totalPaid = yearPayments.filter(p => p.type === 'payment').reduce((s, p) => s + (p.amount || 0), 0)
  const balance = totalIncome - totalExpenseAll

  const filtered = (list) => {
    if (!searchQ) return list
    const q = searchQ.toLowerCase()
    return list.filter(i => {
      const itemMatch = (i.items || []).some(it =>
        (it.description || '').toLowerCase().includes(q) ||
        (it.code || '').toLowerCase().includes(q) ||
        (it.barcode || '').toLowerCase().includes(q)
      )
      return (i.counterparty || '').toLowerCase().includes(q) ||
        (i.trade_name || '').toLowerCase().includes(q) ||
        (i.issuer_name || '').toLowerCase().includes(q) ||
        (i.issuer_trade_name || '').toLowerCase().includes(q) ||
        (i.number || '').toLowerCase().includes(q) ||
        (i.series || '').toLowerCase().includes(q) ||
        (i.afm || '').includes(q) ||
        (i.issuer_afm || '').includes(q) ||
        (i.invoice_type || '').toLowerCase().includes(q) ||
        (i.notes || '').toLowerCase().includes(q) ||
        itemMatch
    })
  }

  const byCounterparty = (type, pmts = [], filteredInvoices = invoices) => {
    const map = {}
    // Από τιμολόγια
    filteredInvoices.filter(i => i.type === type).forEach(inv => {
      const name = type === 'expense' ? (inv.issuer_name || inv.counterparty || 'Άγνωστος') : (inv.counterparty || 'Άγνωστος')
      const tradeName = type === 'expense' ? inv.issuer_trade_name : inv.trade_name
      const afm = type === 'expense' ? (inv.issuer_afm || inv.afm) : inv.afm
      const doy = type === 'expense' ? (inv.issuer_doy || inv.doy) : inv.doy
      const key = afm || name
      if (!map[key]) map[key] = { name, trade_name: tradeName, afm, doy, invoices: [], total: 0 }
      map[key].invoices.push(inv)
      map[key].total += inv.total || 0
    })
    // Από πληρωμές/εισπράξεις χωρίς τιμολόγιο
    const pType = type === 'expense' ? 'payment' : 'receipt'
    pmts.filter(p => p.type === pType && p.counterparty).forEach(p => {
      const key = p.afm || p.counterparty
      if (!map[key]) map[key] = { name: p.counterparty, trade_name: null, afm: p.afm, doy: null, invoices: [], total: 0, paidTotal: 0 }
    })
    // Υπολογισμός πραγματικού υπολοίπου (τιμολόγια - πληρωμές)
    Object.values(map).forEach(cp => {
      const paid = pmts.filter(p => {
        const pT = type === 'expense' ? 'payment' : 'receipt'
        return p.type === pT && (
          (cp.afm && p.afm === cp.afm) ||
          (p.counterparty || '').toLowerCase() === cp.name.toLowerCase()
        )
      }).reduce((s, p) => s + (p.amount || 0), 0)
      cp.paidTotal = paid
      cp.balance = cp.total - paid
    })
    return Object.values(map).sort((a, b) => Math.abs(b.balance || b.total) - Math.abs(a.balance || a.total))
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

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#0a0c13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#4f8ef7', fontSize: 14 }}>Φόρτωση...</div>
    </div>
  )

  if (!session) return (
    <div style={{ minHeight: '100vh', background: '#0a0c13', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 16, padding: '40px 36px', width: 360, boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#4f8ef7,#7c5cf7)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 14px' }}>P</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#e8eaf0' }}>Παραστατικά</div>
          <div style={{ fontSize: 13, color: '#5a6070', marginTop: 4 }}>SMART AUTOMATION SOLUTIONS</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Email</label>
          <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="email@example.com"
            style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 8, padding: '11px 14px', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Password</label>
          <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 8, padding: '11px 14px', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {loginError && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 14, textAlign: 'center' }}>{loginError}</div>}
        <button onClick={handleLogin} disabled={loginLoading}
          style={{ background: 'linear-gradient(135deg,#4f8ef7,#7c5cf7)', color: '#fff', border: 'none', borderRadius: 9, padding: '13px', fontSize: 15, fontWeight: 700, width: '100%', cursor: 'pointer', opacity: loginLoading ? .7 : 1 }}>
          {loginLoading ? 'Σύνδεση...' : 'Είσοδος'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={C.app}>
      {/* HEADER */}
      <div style={C.header}>
        <div style={C.headerInner}>
          <div style={C.logo}>
            <div style={C.logoIcon}>P</div>
            <span>Παραστατικά</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleBackup} style={{ background: 'transparent', color: '#5a6070', border: '1px solid #2a3040', padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Backup</button>
            <button onClick={handleExportExcel} style={{ background: 'transparent', color: '#5a6070', border: '1px solid #2a3040', padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Export CSV</button>
            <div style={{ fontSize: 11, color: '#5a6070', padding: '4px 10px', background: '#0a0c13', borderRadius: 6, border: '1px solid #1e2232' }}>
              {userRole === 'admin' ? 'Admin' : 'Υπάλληλος'} · {session?.user?.email}
            </div>
            <button onClick={handleLogout} style={{ background: 'transparent', color: '#5a6070', border: '1px solid #2a3040', padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Αποσύνδεση</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowPeriodPicker(!showPeriodPicker)}
                style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {month === 0 ? `${year} — Όλο το έτος` : `${monthsFull[month-1]} ${year}`}
                <span style={{ color: '#5a6070', fontSize: 10 }}>▼</span>
              </button>
              {showPeriodPicker && (
                <div style={{ position: 'absolute', top: '110%', right: 0, background: '#13151f', border: '1px solid #2a3040', borderRadius: 10, zIndex: 999, padding: 14, minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,.6)' }}>
                  <div style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>ΕΤΟΣ</div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
                    {years.map(y => (
                      <button key={y} onClick={() => setYear(y)}
                        style={{ background: year === y ? 'linear-gradient(135deg,#4f8ef7,#7c5cf7)' : '#0a0c13', color: year === y ? '#fff' : '#9ca3af', border: `1px solid ${year === y ? 'transparent' : '#2a3040'}`, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: year === y ? 700 : 400, cursor: 'pointer' }}>
                        {y}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>ΜΗΝΑΣ</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
                    <button onClick={() => { setMonth(0); setShowPeriodPicker(false) }}
                      style={{ background: month === 0 ? 'linear-gradient(135deg,#4f8ef7,#7c5cf7)' : '#0a0c13', color: month === 0 ? '#fff' : '#9ca3af', border: `1px solid ${month === 0 ? 'transparent' : '#2a3040'}`, padding: '5px', borderRadius: 6, fontSize: 11, cursor: 'pointer', gridColumn: 'span 4' }}>
                      Όλο το έτος
                    </button>
                    {months.map((m, i) => (
                      <button key={i} onClick={() => { setMonth(i + 1); setShowPeriodPicker(false) }}
                        style={{ background: month === i+1 ? 'linear-gradient(135deg,#4f8ef7,#7c5cf7)' : '#0a0c13', color: month === i+1 ? '#fff' : '#9ca3af', border: `1px solid ${month === i+1 ? 'transparent' : '#2a3040'}`, padding: '5px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {userRole !== 'employee' && [['ΕΣΟΔΑ', totalIncome, '#4ade80', '#0a2215'], ['ΕΞΟΔΑ', totalExpenseAll, '#f87171', '#2a0f0f'], ['ΥΠΟΛΟΙΠΟ', balance, balance >= 0 ? '#60b4f7' : '#f87171', balance >= 0 ? '#0a1e2e' : '#2a0f0f']].map(([l, v, c, bg]) => (
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
        {ALL_TABS.map((t,i) => {
          if (userRole === 'employee' && !EMPLOYEE_TABS.includes(t)) return null
          return <button key={t} onClick={() => setTab(i)} style={C.tab(tab === i)}>{t}</button>
        })}
      </div>

      {/* NOTIFICATION */}
      {notification && (
        <div style={{ position: 'fixed', top: 16, right: 16, background: notification.type === 'error' ? '#2a0f0f' : '#0a2215', border: `1px solid ${notification.type === 'error' ? '#f87171' : '#4ade80'}`, color: notification.type === 'error' ? '#f87171' : '#4ade80', padding: '11px 20px', borderRadius: 9, fontSize: 13, zIndex: 999, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,.4)' }}>
          {notification.msg}
        </div>
      )}

      <div style={C.content}>

        {/* ══════════════════════════════════════
            TAB 0: DASHBOARD
        ══════════════════════════════════════ */}
        {tab === 8 && (
          <DashboardTab
            income={income} expenses={expenses}
            yearPayments={yearPayments}
            generalExpenses={generalExpenses.filter(e => { const d=new Date(e.date); return d.getFullYear()===year&&(month===0||d.getMonth()+1===month) })}
            invoices={invoices} payments={payments}
            fmt={fmt} fmtDate={fmtDate} year={year} month={month} monthsFull={monthsFull}
            setTab={setTab}
          />
        )}

        {/* ══════════════════════════════════════
            TAB 1: ΣΑΡΩΣΗ
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
                      Κάμερα
                      <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                    </label>
                    <label style={{ ...C.btnGhost, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px', fontSize: 14, borderRadius: 9 }}>
                      Από συλλογή
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
                      {saving ? '...' : 'Αποθήκευση'}
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
                    {editForm.type === 'income' ? 'ΠΕΛΑΤΗΣ' : 'ΠΕΛΑΤΗΣ (ΑΓΟΡΑΣΤΗΣ)'}
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

                {/* Είδη / Υλικά */}
                <div style={C.section}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={C.sectionTitle('#4f8ef7')}>ΕΙΔΗ / ΥΛΙΚΑ</div>
                    <button type="button" onClick={() => ef('items', [...(editForm.items || []), { code: '', description: '', quantity: 1, unit: 'τεμ', unit_price: 0, discount_pct: 0, net_value: 0, vat_rate: 24, vat_amount: 0, total: 0 }])}
                      style={{ background: '#1e2232', color: '#4f8ef7', border: '1px solid #2a3040', padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                      + Προσθήκη είδους
                    </button>
                  </div>
                  {(editForm.items || []).length === 0 && (
                    <div style={{ color: '#5a6070', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Δεν υπάρχουν είδη — πάτα "+ Προσθήκη" ή ξανασκάναρε</div>
                  )}
                  {(editForm.items || []).map((item, idx) => {
                    const updateItem = (k, v) => {
                      const items = [...(editForm.items || [])]
                      items[idx] = { ...items[idx], [k]: v }
                      // Auto-calculate net_value, vat_amount, total
                      const it = items[idx]
                      const qty = parseFloat(it.quantity) || 1
                      const up = parseFloat(it.unit_price) || 0
                      const disc = parseFloat(it.discount_pct) || 0
                      const net = qty * up * (1 - disc / 100)
                      const vatR = parseFloat(it.vat_rate) || 24
                      const vatAmt = net * vatR / 100
                      items[idx].net_value = Math.round(net * 100) / 100
                      items[idx].vat_amount = Math.round(vatAmt * 100) / 100
                      items[idx].total = Math.round((net + vatAmt) * 100) / 100
                      ef('items', items)
                      // Recalculate totals
                      const subtotal = items.reduce((s, i) => s + (parseFloat(i.net_value) || 0), 0)
                      const totalVat = items.reduce((s, i) => s + (parseFloat(i.vat_amount) || 0), 0)
                      ef('subtotal', Math.round(subtotal * 100) / 100)
                      ef('vat', Math.round(totalVat * 100) / 100)
                      ef('total', Math.round((subtotal + totalVat) * 100) / 100)
                    }
                    return (
                      <div key={idx} style={{ background: '#0a0c13', borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: '1px solid #2a3040' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: '#5a6070', fontWeight: 700 }}>ΕΙΔΟΣ {idx + 1}</span>
                          <button type="button" onClick={() => {
                            const items = (editForm.items || []).filter((_, i) => i !== idx)
                            ef('items', items)
                            const subtotal = items.reduce((s, i) => s + (parseFloat(i.net_value) || 0), 0)
                            const totalVat = items.reduce((s, i) => s + (parseFloat(i.vat_amount) || 0), 0)
                            ef('subtotal', Math.round(subtotal * 100) / 100)
                            ef('vat', Math.round(totalVat * 100) / 100)
                            ef('total', Math.round((subtotal + totalVat) * 100) / 100)
                          }} style={{ background: 'transparent', color: '#f87171', border: 'none', fontSize: 12, cursor: 'pointer', padding: '2px 6px' }}>
                            Διαγραφή
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 60px 70px', gap: 6, marginBottom: 6 }}>
                          <div>
                            <label style={{ ...C.label, marginBottom: 2 }}>ΚΩΔΙΚΟΣ</label>
                            <input value={item.code || ''} onChange={e => updateItem('code', e.target.value)}
                              style={{ ...C.input, fontSize: 11, fontFamily: 'monospace', padding: '6px 8px' }} />
                          </div>
                          <div>
                            <label style={{ ...C.label, marginBottom: 2 }}>ΠΕΡΙΓΡΑΦΗ</label>
                            <input value={item.description || ''} onChange={e => updateItem('description', e.target.value)}
                              style={{ ...C.input, fontSize: 11, padding: '6px 8px' }} />
                          </div>
                          <div>
                            <label style={{ ...C.label, marginBottom: 2 }}>ΠΟΣ.</label>
                            <input type="number" step="0.001" value={item.quantity || ''} onChange={e => updateItem('quantity', e.target.value)}
                              style={{ ...C.input, fontSize: 11, fontFamily: 'monospace', padding: '6px 8px' }} />
                          </div>
                          <div>
                            <label style={{ ...C.label, marginBottom: 2 }}>ΜΟΝΑΔΑ</label>
                            <input value={item.unit || 'τεμ'} onChange={e => updateItem('unit', e.target.value)}
                              style={{ ...C.input, fontSize: 11, padding: '6px 8px' }} />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px', gap: 6 }}>
                          <div>
                            <label style={{ ...C.label, marginBottom: 2 }}>ΤΙΜΗ ΜΟΝ. €</label>
                            <input type="number" step="0.01" value={item.unit_price || ''} onChange={e => updateItem('unit_price', e.target.value)}
                              style={{ ...C.input, fontSize: 11, fontFamily: 'monospace', padding: '6px 8px' }} />
                          </div>
                          <div>
                            <label style={{ ...C.label, marginBottom: 2 }}>ΕΚΠΤ.%</label>
                            <input type="number" step="0.1" value={item.discount_pct || ''} onChange={e => updateItem('discount_pct', e.target.value)}
                              style={{ ...C.input, fontSize: 11, fontFamily: 'monospace', padding: '6px 8px' }} />
                          </div>
                          <div>
                            <label style={{ ...C.label, marginBottom: 2 }}>ΦΠΑ%</label>
                            <input type="number" value={item.vat_rate || 24} onChange={e => updateItem('vat_rate', e.target.value)}
                              style={{ ...C.input, fontSize: 11, fontFamily: 'monospace', padding: '6px 8px' }} />
                          </div>
                          <div>
                            <label style={{ ...C.label, marginBottom: 2 }}>ΚΑΘΑΡΗ €</label>
                            <input value={(parseFloat(item.net_value) || 0).toFixed(2)} readOnly
                              style={{ ...C.input, fontSize: 11, fontFamily: 'monospace', padding: '6px 8px', color: '#9ca3af' }} />
                          </div>
                          <div>
                            <label style={{ ...C.label, marginBottom: 2 }}>ΣΥΝΟΛΟ €</label>
                            <input value={(parseFloat(item.total) || 0).toFixed(2)} readOnly
                              style={{ ...C.input, fontSize: 11, fontFamily: 'monospace', padding: '6px 8px', color: '#4f8ef7', fontWeight: 700 }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
            TAB 2 & 3: ΛΙΣΤΑ ΠΑΡΑΣΤΑΤΙΚΩΝ
        ══════════════════════════════════════ */}
        {(tab === 1 || tab === 2) && (
          <InvoiceList
            list={tab === 2 ? income : expenses}
            color={tab === 2 ? '#4ade80' : '#f87171'}
            title={tab === 1 ? 'Έσοδα' : 'Έξοδα'}
            searchQ={searchQ} setSearchQ={setSearchQ}
            filtered={filtered} expandedId={expandedId} setExpandedId={setExpandedId}
            deleteInvoice={deleteInvoice} setTab={setTab} setEditForm={setEditForm}
            fmt={fmt} fmtDate={fmtDate} loading={loading}
            tab={tab} copyInvoice={copyInvoice} userRole={userRole} loadInvoices={loadInvoices}
            generalExpenses={tab === 3 ? generalExpenses.filter(e => { const d=new Date(e.date); return d.getFullYear()===year&&(month===0||d.getMonth()+1===month) }) : []}
          />
        )}

        {/* ══════════════════════════════════════
            TAB 3: ΠΛΗΡΩΜΕΣ
        ══════════════════════════════════════ */}
        {tab === 3 && <PaymentsTab payments={yearPayments} invoices={invoices} loadPayments={loadPayments} fmt={fmt} fmtDate={fmtDate} notify={notify} year={year} month={month} monthsFull={monthsFull} />}

        {/* ══════════════════════════════════════
            TAB 4: ΓΕΝΙΚΑ ΕΞΟΔΑ
        ══════════════════════════════════════ */}
        {tab === 4 && <GeneralExpensesTab expenses={generalExpenses.filter(e => {
          const d = new Date(e.date)
          return d.getFullYear() === year && (month === 0 || d.getMonth() + 1 === month)
        })} loadExpenses={loadExpenses} fmt={fmt} fmtDate={fmtDate} notify={notify} year={year} month={month} monthsFull={monthsFull} />}

        {/* ══════════════════════════════════════
            TAB 5: ΚΑΡΤΕΛΕΣ
        ══════════════════════════════════════ */}
        {tab === 5 && <KartelesTab invoices={[...income, ...expenses]} payments={yearPayments} byCounterparty={(t) => byCounterparty(t, yearPayments, [...income, ...expenses])} fmt={fmt} fmtDate={fmtDate} year={year} month={month} monthsFull={monthsFull} />}

        {/* ══════════════════════════════════════
            TAB 4: ΥΠΟΛΟΙΠΑ
        ══════════════════════════════════════ */}
        {tab === 7 && <ReportsTab income={income} expenses={expenses} yearPayments={yearPayments} generalExpenses={generalExpenses.filter(e => { const d=new Date(e.date); return d.getFullYear()===year&&(month===0||d.getMonth()+1===month) })} fmt={fmt} fmtDate={fmtDate} year={year} month={month} monthsFull={monthsFull} />}

        {tab === 6 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 22 }}>
            {[{ type: 'income', label: 'Πελάτες — Εισπρακτέα', color: '#4ade80', total: totalIncome },
              { type: 'expense', label: 'Προμηθευτές — Πληρωτέα', color: '#f87171', total: totalExpense }].map(({ type, label, color, total }) => (
              <div key={type}>
                <h3 style={{ fontWeight: 700, marginBottom: 14, color, fontSize: 15 }}>{label}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {byCounterparty(type, yearPayments, [...income, ...expenses]).length === 0 && <div style={{ ...C.card, color: '#5a6070', textAlign: 'center', padding: 36 }}>Δεν υπάρχουν ακόμα</div>}
                  {byCounterparty(type, yearPayments, [...income, ...expenses]).map(cp => (
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
          Εκτύπωση / PDF
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
function KartelesTab({ invoices, payments, byCounterparty, fmt, fmtDate, year, month, monthsFull }) {
  const [cpType, setCpType] = useState('income')
  const [selCP, setSelCP] = useState(null)
  const [searchKartela, setSearchKartela] = useState('')
  const [expandedInvId, setExpandedInvId] = useState(null)

  const allList = byCounterparty(cpType)
  const list = searchKartela ? allList.filter(cp => {
    const q = searchKartela.toLowerCase()
    const nameMatch = (cp.name || '').toLowerCase().includes(q) || (cp.trade_name || '').toLowerCase().includes(q) || (cp.afm || '').includes(q)
    const itemMatch = cp.invoices.some(inv => (inv.items || []).some(it =>
      (it.description || '').toLowerCase().includes(q) || (it.code || '').toLowerCase().includes(q)
    ))
    const invMatch = cp.invoices.some(inv =>
      (inv.number || '').toLowerCase().includes(q) ||
      (inv.series || '').toLowerCase().includes(q) ||
      (inv.invoice_type || '').toLowerCase().includes(q) ||
      (inv.issuer_name || '').toLowerCase().includes(q) ||
      (inv.issuer_trade_name || '').toLowerCase().includes(q)
    )
    return nameMatch || itemMatch || invMatch
  }) : allList
  const selected = list.find(c => c.name === selCP)
  const color = cpType === 'income' ? '#4ade80' : '#f87171'

  const printKartela = () => {
    const title = cpType === 'income' ? 'ΚΑΡΤΕΛΑ ΠΕΛΑΤΗ' : 'ΚΑΡΤΕΛΑ ΠΡΟΜΗΘΕΥΤΗ'
    const win = window.open('', '_blank')
    let running = 0
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><meta charset="utf-8">
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:25px;font-size:12px}
    .hdr{text-align:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #000}
    .title{font-size:20px;font-weight:bold;color:${cpType === 'income' ? '#1a6e3a' : '#8b1a1a'}}
    .info{margin-bottom:16px;background:#f5f5f5;padding:10px;border:1px solid #ddd;border-radius:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th{background:#333;color:#fff;padding:7px 8px;text-align:left;font-size:11px}
    th.r{text-align:right}td{padding:7px 8px;border-bottom:1px solid #eee}
    td.r{text-align:right}tr:nth-child(even) td{background:#f9f9f9}
    .red{color:#c00;font-weight:bold}.grn{color:#080;font-weight:bold}.bold{font-weight:bold}
    .tot{display:flex;justify-content:flex-end}.tbox{border:2px solid #333;border-radius:4px;min-width:260px}
    .tr{display:flex;justify-content:space-between;padding:6px 12px;font-size:13px}
    .tr:nth-child(even){background:#f5f5f5}.grand{background:#333!important;color:#fff;font-weight:bold;font-size:15px}
    @media print{@page{margin:12mm}}</style></head><body>
    <div class="hdr"><div class="title">${title}</div>
    <div style="font-size:14px;margin-top:4px">${selected.name}${selected.trade_name ? ' &quot;' + selected.trade_name + '&quot;' : ''}</div></div>
    <div class="info"><strong>ΑΦΜ:</strong> ${selected.afm||'—'} &nbsp; <strong>ΔΟΥ:</strong> ${selected.doy||'—'} &nbsp;
    <strong>Παραστατικά:</strong> ${selected.invoices.length} &nbsp;
    <strong>Εκτύπωση:</strong> ${new Date().toLocaleDateString('el-GR')}</div>
    <table><thead><tr>
    <th>ΗΜΕΡΟΜΗΝΙΑ</th><th>ΕΙΔΟΣ</th><th>ΑΡΙΘΜΟΣ</th><th>ΤΡΟΠΟΣ ΠΛΗΡ.</th>
    <th class="r">ΧΡΕΩΣΗ</th><th class="r">ΠΙΣΤΩΣΗ</th><th class="r">ΥΠΟΛΟΙΠΟ</th>
    </tr></thead><tbody>
    ${(() => {
      const cpAfm = selected.afm
      const cpName = selected.name
      const pType = cpType === 'expense' ? 'payment' : 'receipt'
      const relPmts = (payments||[]).filter(p => {
        const matchAfm = cpAfm && p.afm === cpAfm
        const matchName = (p.counterparty||'').toLowerCase() === cpName.toLowerCase()
        return (matchAfm || matchName) && p.type === pType
      })
      const allMov = [
        ...selected.invoices.map(inv => ({...inv, _kind:'invoice', _date: inv.date})),
        ...relPmts.map(p => ({...p, _kind:'payment', _date: p.date}))
      ].sort((a,b) => new Date(a._date) - new Date(b._date))
      return allMov.map(mov => {
        const isInv = mov._kind === 'invoice'
        const debit = isInv ? (mov.total||0) : 0
        const credit = !isInv ? (mov.amount||0) : 0
        running += debit - credit
        const dr = cpType === 'income'
          ? `<td class="r red">${debit>0?debit.toFixed(2)+'€':'—'}</td><td class="r grn">${credit>0?credit.toFixed(2)+'€':'—'}</td>`
          : `<td class="r red">${debit>0?debit.toFixed(2)+'€':'—'}</td><td class="r grn">${credit>0?credit.toFixed(2)+'€':'—'}</td>`
        const kind = isInv ? (mov.invoice_type||'Τιμολόγιο') : (mov.type==='receipt'?'Είσπραξη':'Πληρωμή')
        const ref = isInv ? ((mov.series||'')+(mov.number||'—')) : (mov.reference||'—')
        const method = mov.payment_method || '—'
        return `<tr><td>${fmtDate(mov._date)}</td><td>${kind}</td><td>${ref}</td><td>${method}</td>${dr}<td class="r bold">${Math.abs(running).toFixed(2)}€${running>0?'':running<0?'':''}</td></tr>`
      }).join('')
    })()}
    </tbody></table>
    <div class="tot"><div class="tbox">
    <div class="tr"><span>Χρεώσεις:</span><span class="red">${selected.invoices.reduce((s,i)=>s+(i.total||0),0).toFixed(2)}€</span></div>
    <div class="tr"><span>Πιστώσεις:</span><span class="grn">${(() => { const pType=cpType==='expense'?'payment':'receipt'; return (payments||[]).filter(p=>(p.afm===selected.afm||(p.counterparty||'').toLowerCase()===selected.name.toLowerCase())&&p.type===pType).reduce((s,p)=>s+(p.amount||0),0).toFixed(2) })()}€</span></div>
    <div class="tr grand"><span>ΥΠΟΛΟΙΠΟ:</span><span>${(selected.invoices.reduce((s,i)=>s+(i.total||0),0) - (() => { const pType=cpType==='expense'?'payment':'receipt'; return (payments||[]).filter(p=>(p.afm===selected.afm||(p.counterparty||'').toLowerCase()===selected.name.toLowerCase())&&p.type===pType).reduce((s,p)=>s+(p.amount||0),0) })()).toFixed(2)}€</span></div>
    </div></div>
    <script>window.onload=()=>window.print()</script></body></html>`)
    win.document.close()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, 290px) 1fr', gap: 20 }}>
      {/* Αριστερή στήλη */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4f8ef7', marginBottom: 10, textAlign: 'center', background: '#0a0c13', border: '1px solid #1e2232', borderRadius: 7, padding: '6px' }}>{month === 0 ? `Χρήση ${year}` : `${monthsFull[month-1]} ${year}`}</div>
        <div style={{ marginBottom: 10 }}>
          <input placeholder="Αναζήτηση..." value={searchKartela}
            onChange={e => { setSearchKartela(e.target.value); setSelCP(null) }}
            style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '8px 12px', fontSize: 12, width: '100%', outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[['income', 'Πελάτες', '#4ade80', '#0a2215'], ['expense', 'Προμηθευτές', '#f87171', '#2a0f0f']].map(([type, label, c, bg]) => (
            <button key={type} onClick={() => { setCpType(type); setSelCP(null); setSearchKartela('') }}
              style={{ flex: 1, padding: '8px', borderRadius: 6, border: `1px solid ${cpType === type ? c + '44' : '#2a3040'}`, background: cpType === type ? bg : 'transparent', color: cpType === type ? c : '#5a6070', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {list.length === 0 && <div style={{ color: '#5a6070', fontSize: 12, textAlign: 'center', padding: 20 }}>Δεν βρέθηκαν</div>}
          {list.map(cp => (
            <div key={cp.name} onClick={() => setSelCP(cp.name)}
              style={{ padding: '11px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${selCP === cp.name ? color + '66' : '#2a3040'}`, background: selCP === cp.name ? (cpType === 'income' ? '#0a2215' : '#2a0f0f') : '#0f1117' }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{cp.name}</div>
              {cp.trade_name && <div style={{ fontSize: 10, color: '#4f8ef7' }}>"{cp.trade_name}"</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontSize: 10, color: '#5a6070' }}>{cp.invoices.length} παραστ.{cp.afm ? ` · ${cp.afm}` : ''}</span>
                <div style={{ textAlign: 'right' }}>
                  {cp.paidTotal > 0 && <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4ade80' }}>-{fmt(cp.paidTotal)}</div>}
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: cp.balance === 0 ? '#5a6070' : cp.balance > 0 ? color : '#4ade80', fontWeight: 700 }}>{fmt(Math.abs(cp.balance !== undefined ? cp.balance : cp.total))}{cp.balance < 0 ? '' : ''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Δεξιά στήλη - Καρτέλα */}
      <div>
        {!selected ? (
          <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, padding: 56, textAlign: 'center', color: '#5a6070' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👆</div>
            <div style={{ fontWeight: 600 }}>Επίλεξε {cpType === 'income' ? 'πελάτη' : 'προμηθευτή'} για καρτέλα</div>
          </div>
        ) : (
          <div>
            {/* Header καρτέλας */}
            <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, padding: '14px 18px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>{selected.name}</h3>
                {selected.trade_name && <div style={{ fontSize: 12, color: '#4f8ef7', marginTop: 2 }}>"{selected.trade_name}"</div>}
                <div style={{ fontSize: 11, color: '#5a6070', marginTop: 2 }}>
                  {selected.afm && `ΑΦΜ: ${selected.afm}`}{selected.doy && ` · ΔΟΥ: ${selected.doy}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: '#5a6070', marginBottom: 2 }}>ΣΥΝΟΛΟ ΣΥΝΑΛΛΑΓΩΝ</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color }}>{fmt(selected.total)}</div>
                  <div style={{ fontSize: 10, color: '#5a6070' }}>{selected.invoices.length} παραστατικά</div>
                </div>
                <button onClick={printKartela} style={{ background: '#1e2232', color: '#e8eaf0', border: 'none', padding: '8px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  PDF
                </button>
              </div>
            </div>

            {/* Πίνακας παραστατικών + πληρωμών */}
            {(() => {
              // Συνδυάζω τιμολόγια + πληρωμές και ταξινομώ κατά ημερομηνία
              const cpAfm = cpType === 'expense' ? selected.afm : selected.afm
              const cpName = selected.name
              const relatedPayments = (payments || []).filter(p => {
                const matchAfm = cpAfm && p.afm === cpAfm
                const matchName = (p.counterparty || '').toLowerCase() === cpName.toLowerCase()
                const correctType = cpType === 'expense' ? p.type === 'payment' : p.type === 'receipt'
                return (matchAfm || matchName) && correctType
              })
              const allMovements = [
                ...selected.invoices.map(inv => ({ ...inv, _kind: 'invoice', _date: inv.date })),
                ...relatedPayments.map(p => ({ ...p, _kind: 'payment', _date: p.date }))
              ].sort((a, b) => new Date(a._date) - new Date(b._date))
              
              let running = 0
              return (
            <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
                  <thead>
                    <tr>
                      {['ΗΜΕΡΟΜΗΝΙΑ', 'ΚΙΝΗΣΗ', 'ΑΡΙΘΜΟΣ/ΑΝΑΦΟΡΑ', 'ΤΡΟΠΟΣ', 'ΧΡΕΩΣΗ', 'ΠΙΣΤΩΣΗ', 'ΥΠΟΛΟΙΠΟ', ''].map(h => (
                        <th key={h} style={{ textAlign: ['ΧΡΕΩΣΗ','ΠΙΣΤΩΣΗ','ΥΠΟΛΟΙΠΟ'].includes(h) ? 'right' : 'left', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#5a6070', padding: '9px 12px', borderBottom: '1px solid #1e2232' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allMovements.map((mov, idx) => {
                      const isInvoice = mov._kind === 'invoice'
                      const debit = isInvoice ? (mov.total || 0) : 0
                      const credit = !isInvoice ? (mov.amount || 0) : 0
                      running += debit - credit
                      const balColor = running > 0 ? '#f87171' : running < 0 ? '#4ade80' : '#5a6070'
                      return (<React.Fragment key={idx}>
                      <tr key={idx} onMouseEnter={e => e.currentTarget.style.background='#1a1d2b'} onMouseLeave={e => e.currentTarget.style.background=''}>
                        <td style={{ padding:'10px 12px', borderBottom:'1px solid #161824', fontSize:12, color:'#9ca3af', fontFamily:'monospace' }}>{fmtDate(mov._date)}</td>
                        <td style={{ padding:'10px 12px', borderBottom:'1px solid #161824', fontSize:12 }}>
                          {isInvoice
                            ? <span style={{ color:'#4f8ef7', fontWeight:600 }}>{mov.invoice_type || 'Τιμολόγιο'}</span>
                            : <span style={{ background: mov.type==='receipt'?'#0a2215':'#2a0f0f', color: mov.type==='receipt'?'#4ade80':'#f87171', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600 }}>{mov.type==='receipt'?'Είσπραξη':'Πληρωμή'}</span>
                          }
                        </td>
                        <td style={{ padding:'10px 12px', borderBottom:'1px solid #161824', fontSize:12, fontFamily:'monospace', color:'#7c5cf7' }}>{isInvoice ? (mov.series||'')+(mov.number||'—') : (mov.reference||'—')}</td>
                        <td style={{ padding:'10px 12px', borderBottom:'1px solid #161824', fontSize:11, color:'#5a6070' }}>{isInvoice ? (mov.payment_method||'—') : (mov.payment_method||'—')}</td>
                        <td style={{ padding:'10px 12px', borderBottom:'1px solid #161824', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight: debit>0?700:400, color: debit>0?'#f87171':'#3a4055' }}>{debit>0?fmt(debit):'—'}</td>
                        <td style={{ padding:'10px 12px', borderBottom:'1px solid #161824', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight: credit>0?700:400, color: credit>0?'#4ade80':'#3a4055' }}>{credit>0?fmt(credit):'—'}</td>
                        <td style={{ padding:'10px 12px', borderBottom:'1px solid #161824', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight:700, color:balColor }}>{fmt(Math.abs(running))}{running>0?' (χρεώστης)':running<0?' (πιστωτής)':''}</td>
                        <td style={{ padding:'10px 12px', borderBottom:'1px solid #161824' }}>
                          {isInvoice && (mov.items||[]).length > 0 && <button onClick={() => setExpandedInvId(expandedInvId===mov.id?null:mov.id)} style={{ background:'transparent', color:'#5a6070', border:'none', cursor:'pointer', fontSize:11 }}>{expandedInvId===mov.id?'▲':'▼'}</button>}
                        </td>
                      </tr>
                      {isInvoice && expandedInvId === mov.id && (mov.items||[]).length > 0 && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0, background: '#0a0c13' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#1a1d27' }}>
                                  {['ΚΩΔΙΚΟΣ','ΠΕΡΙΓΡΑΦΗ','ΠΟΣ.','ΤΙΜΗ','ΚΑΘΑΡΗ','ΦΠΑ%','ΣΥΝΟΛΟ'].map(h => (
                                    <th key={h} style={{ fontSize:9, color:'#5a6070', padding:'6px 10px', fontWeight:700, textAlign: h==='ΚΩΔΙΚΟΣ'||h==='ΠΕΡΙΓΡΑΦΗ'?'left':'right', borderBottom:'1px solid #1e2232' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {mov.items.map((item, i) => (
                                  <tr key={i} style={{ borderBottom:'1px solid #161824' }}>
                                    <td style={{ padding:'6px 10px', fontSize:11, fontFamily:'monospace', color:'#7c5cf7' }}>{item.code||'—'}</td>
                                    <td style={{ padding:'6px 10px', fontSize:11 }}>{item.description||'—'}</td>
                                    <td style={{ padding:'6px 10px', fontSize:11, textAlign:'right', fontFamily:'monospace' }}>{item.quantity||1}</td>
                                    <td style={{ padding:'6px 10px', fontSize:11, textAlign:'right', fontFamily:'monospace' }}>{(parseFloat(item.unit_price)||0).toFixed(2)}€</td>
                                    <td style={{ padding:'6px 10px', fontSize:11, textAlign:'right', fontFamily:'monospace' }}>{(parseFloat(item.net_value)||0).toFixed(2)}€</td>
                                    <td style={{ padding:'6px 10px', fontSize:11, textAlign:'right', color:'#5a6070' }}>{item.vat_rate||24}%</td>
                                    <td style={{ padding:'6px 10px', fontSize:12, textAlign:'right', fontFamily:'monospace', fontWeight:700, color:cpType==='income'?'#4ade80':'#f87171' }}>{(parseFloat(item.total)||0).toFixed(2)}€</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>)
                    })}
                  </tbody>
                </table>
              </div>
            </div>
              )
            })()}
          </div>
        )}
      </div>

    </div>
  )
}


/* ═══════════════════════════════════════
   AUTOCOMPLETE COMPONENT
═══════════════════════════════════════ */
function TraderSearch({ value, onChange, onSelect, type = 'all', placeholder = 'Αναζήτηση...' }) {
  const [results, setResults] = useState([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (value.length < 2) { setResults([]); setShow(false); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        let query = supabase.from('traders').select('name,trade_name,afm,city,phone,is_customer,is_supplier')
          .or(`name.ilike.%${value}%,trade_name.ilike.%${value}%,afm.ilike.%${value}%`)
          .limit(10).order('name')
        if (type === 'customer') query = query.eq('is_customer', true)
        if (type === 'supplier') query = query.eq('is_supplier', true)
        const { data, error } = await query
        if (!error) { setResults(data || []); setShow(true) }
      } catch(e) {}
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input value={value} onChange={e => { onChange(e.target.value); setShow(true) }}
          onFocus={() => value.length >= 2 && setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
          placeholder={placeholder}
          style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '9px 32px 9px 12px', fontSize: 13, width: '100%', outline: 'none' }} />
        {loading && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#5a6070' }}>...</span>}
        {!loading && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#5a6070' }}>🔍</span>}
      </div>
      {show && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#13151f', border: '1px solid #2a3040', borderRadius: 8, zIndex: 999, maxHeight: 240, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
          {results.map((t, i) => (
            <div key={i} onMouseDown={() => { onSelect(t); setShow(false) }}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #1e2232' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e2232'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
              {t.trade_name && <div style={{ fontSize: 11, color: '#4f8ef7' }}>"{t.trade_name}"</div>}
              <div style={{ fontSize: 11, color: '#5a6070', marginTop: 2 }}>
                ΑΦΜ: {t.afm || '—'}{t.city ? ` · ${t.city}` : ''}
                {t.is_customer && !t.is_supplier && ' · 👤 Πελάτης'}
                {t.is_supplier && !t.is_customer && ' · 🏪 Προμηθευτής'}
                {t.is_customer && t.is_supplier && ' · 👤🏪 Πελάτης & Προμηθευτής'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ΠΛΗΡΩΜΕΣ & ΕΙΣΠΡΑΞΕΙΣ
═══════════════════════════════════════════════════════════ */
function PaymentsTab({ payments, invoices, loadPayments, fmt, fmtDate, notify, year, month, monthsFull }) {
  const [showForm, setShowForm] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [form, setForm] = useState({ type: 'payment', date: new Date().toISOString().split('T')[0], amount: '', counterparty: '', afm: '', payment_method: 'Μετρητά', bank: '', reference: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('all')

  const ef = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = async (file) => {
    if (!file) return
    setScanning(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target.result
      try {
        const res = await fetch('/api/ocr-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: dataUrl.split(',')[1], mediaType: file.type || 'image/jpeg' })
        })
        const json = await res.json()
        if (json.success) setForm(f => ({ ...f, ...json.data }))
        else notify('⚠️ Δεν μπόρεσα να διαβάσω την απόδειξη.', 'error')
      } catch(e) { notify('⚠️ ' + e.message, 'error') }
      setScanning(false)
    }
    reader.readAsDataURL(file)
  }

  const savePayment = async () => {
    if (!form.amount || !form.date) { notify('⚠️ Συμπλήρωσε ημερομηνία και ποσό!', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('payments').insert([{
      type: form.type,
      date: form.date,
      amount: parseFloat(form.amount) || 0,
      counterparty: form.counterparty || null,
      afm: form.afm || null,
      payment_method: form.payment_method || null,
      bank: form.bank || null,
      reference: form.reference || null,
      notes: form.notes || null
    }])
    if (error) notify('⚠️ ' + error.message, 'error')
    else {
      notify('Αποθηκεύτηκε!')
      setShowForm(false)
      setForm({ type: 'payment', date: new Date().toISOString().split('T')[0], amount: '', counterparty: '', afm: '', payment_method: 'Μετρητά', bank: '', reference: '', notes: '' })
      await loadPayments()
    }
    setSaving(false)
  }

  const deletePayment = async (id) => {
    if (!confirm('Διαγραφή;')) return
    await supabase.from('payments').delete().eq('id', id)
    await loadPayments()
    notify('Διαγράφηκε.')
  }

  const filtered = filterType === 'all' ? payments : payments.filter(p => p.type === filterType)
  const { sorted: sortedPayments, SortTh: PaySortTh } = useSortable(filtered, 'date', 'desc')
  const yearPayments = payments.filter(p => {
    const d = new Date(p.date)
    return d.getFullYear() === year && (month === 0 || d.getMonth() + 1 === month)
  })
  const totalReceipts = yearPayments.filter(p => p.type === 'receipt').reduce((s, p) => s + (p.amount || 0), 0)
  const totalPayments = payments.filter(p => p.type === 'payment').reduce((s, p) => s + (p.amount || 0), 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>Πληρωμές & Εισπράξεις — {month === 0 ? year : `${monthsFull[month-1]} ${year}`}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ background: '#0a2215', border: '1px solid #4ade8033', borderRadius: 7, padding: '4px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#4ade80', fontWeight: 700 }}>ΕΙΣΠΡΑΞΕΙΣ</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#4ade80', fontWeight: 700 }}>{fmt(totalReceipts)}</div>
          </div>
          <div style={{ background: '#2a0f0f', border: '1px solid #f8717133', borderRadius: 7, padding: '4px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#f87171', fontWeight: 700 }}>ΠΛΗΡΩΜΕΣ</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#f87171', fontWeight: 700 }}>{fmt(totalPayments)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {[['all','Όλα'],['receipt','Εισπράξεις'],['payment','Πληρωμές']].map(([v,l]) => (
            <button key={v} onClick={() => setFilterType(v)} style={{ background: filterType===v ? '#1e2232' : 'transparent', color: filterType===v ? '#e8eaf0' : '#5a6070', border: '1px solid #2a3040', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <label style={{ background: '#1e2232', color: '#e8eaf0', border: '1px solid #2a3040', padding: '9px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          title="Import πελατών/προμηθευτών από Emblem JSON">
          Import Emblem
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={async e => {
            const file = e.target.files[0]; if (!file) return
            try {
              const text = await file.text()
              const data = JSON.parse(text)
              const traders = data.traders || []
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
              if (error) notify('⚠️ ' + error.message, 'error')
              else notify(`Εισήχθησαν ${rows.length} επαφές!`)
            } catch(err) { notify('⚠️ ' + err.message, 'error') }
          }} />
        </label>
        <button onClick={() => setShowForm(!showForm)} style={{ background: 'linear-gradient(135deg,#4f8ef7,#7c5cf7)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Νέα</button>
      </div>

      {/* Φόρμα καταχώρησης */}
      {showForm && (
        <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>ΝΕΑ ΚΙΝΗΣΗ</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΤΥΠΟΣ</label>
              <select value={form.type} onChange={e => ef('type', e.target.value)}
                style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none' }}>
                <option value="receipt">💚 Είσπραξη (εισέπραξα)</option>
                <option value="payment">🔴 Πληρωμή (πλήρωσα)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΗΜΕΡΟΜΗΝΙΑ</label>
              <input type="date" value={form.date} onChange={e => ef('date', e.target.value)}
                style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΠΟΣΟ €</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => ef('amount', e.target.value)}
                style={{ background: '#0a0c13', border: '1px solid #2a3040', color: form.type === 'receipt' ? '#4ade80' : '#f87171', borderRadius: 7, padding: '9px 12px', fontSize: 14, fontWeight: 700, width: '100%', outline: 'none', fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>{form.type === 'receipt' ? 'ΑΠΟ ΠΕΛΑΤΗ' : 'ΣΕ ΠΡΟΜΗΘΕΥΤΗ'}</label>
              <TraderSearch value={form.counterparty} onChange={v => ef('counterparty', v)}
                onSelect={t => { ef('counterparty', t.name); ef('afm', t.afm || ''); }}
                type={form.type === 'receipt' ? 'customer' : 'supplier'}
                placeholder="Γράψε επωνυμία ή ΑΦΜ..." />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΑΦΜ</label>
              <input value={form.afm} onChange={e => ef('afm', e.target.value)}
                style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ</label>
              <select value={form.payment_method} onChange={e => ef('payment_method', e.target.value)}
                style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none' }}>
                <option>Μετρητά</option>
                <option>Τραπεζική μεταφορά</option>
                <option>Επιταγή</option>
                <option>Πιστωτική κάρτα</option>
                <option>Χρεωστική κάρτα</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΑΡΙΘΜΟΣ ΑΝΑΦΟΡΑΣ</label>
              <input value={form.reference} onChange={e => ef('reference', e.target.value)} placeholder="Αρ. επιταγής / παραπομπή"
                style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΣΗΜΕΙΩΣΕΙΣ</label>
              <input value={form.notes} onChange={e => ef('notes', e.target.value)}
                style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
            <button onClick={savePayment} disabled={saving}
              style={{ background: 'linear-gradient(135deg,#4f8ef7,#7c5cf7)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? .7 : 1 }}>
              {saving ? '...' : 'Αποθήκευση'}
            </button>
            <label style={{ background: '#1e2232', color: '#e8eaf0', border: 'none', padding: '10px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {scanning ? 'Ανάγνωση...' : 'Σάρωση απόδειξης'}
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} disabled={scanning} />
            </label>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: '#5a6070', border: '1px solid #2a3040', padding: '10px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Ακύρωση</button>
          </div>
        </div>
      )}

      {/* Λίστα κινήσεων */}
      {filtered.length === 0 ? (
        <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, padding: 48, textAlign: 'center', color: '#5a6070' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
          <div style={{ fontWeight: 600 }}>Δεν υπάρχουν κινήσεις ακόμα</div>
        </div>
      ) : (
        <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  <PaySortTh label="ΗΜΕΡΟΜΗΝΙΑ" field="date" />
                    <th style={{ fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '9px 12px', borderBottom: '1px solid #1e2232' }}>ΤΥΠΟΣ</th>
                    <PaySortTh label="ΕΠΩΝΥΜΙΑ" field="counterparty" />
                    <PaySortTh label="ΑΦΜ" field="afm" />
                    <th style={{ fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '9px 12px', borderBottom: '1px solid #1e2232' }}>ΤΡΟΠΟΣ</th>
                    <th style={{ fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '9px 12px', borderBottom: '1px solid #1e2232' }}>ΑΝΑΦΟΡΑ</th>
                    <PaySortTh label="ΠΟΣΟ" field="amount" style={{ textAlign: 'right' }} />
                    <th style={{ fontSize: 10, color: '#5a6070', padding: '9px 12px', borderBottom: '1px solid #1e2232' }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map(p => (
                  <tr key={p.id} onMouseEnter={e => e.currentTarget.style.background = '#1a1d2b'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{fmtDate(p.date)}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 12 }}>
                      <span style={{ background: p.type === 'receipt' ? '#0a2215' : '#2a0f0f', color: p.type === 'receipt' ? '#4ade80' : '#f87171', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                        {p.type === 'receipt' ? 'Είσπραξη' : 'Πληρωμή'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 13, fontWeight: 500 }}>{p.counterparty || '—'}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 11, color: '#5a6070', fontFamily: 'monospace' }}>{p.afm || '—'}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 11, color: '#5a6070' }}>{p.payment_method || '—'}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 11, color: '#5a6070' }}>{p.reference || '—'}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 14, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: p.type === 'receipt' ? '#4ade80' : '#f87171' }}>{fmt(p.amount)}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824' }}>
                      <button onClick={() => deletePayment(p.id)} style={{ background: 'transparent', color: '#f87171', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ΓΕΝΙΚΑ ΕΞΟΔΑ
═══════════════════════════════════════════════════════════ */
const EXPENSE_CATEGORIES = [
  'Διόδια', 'Καύσιμα', 'Στάθμευση', 'Τηλεφωνία', 'Ίντερνετ',
  'Αναλώσιμα', 'Γραφική ύλη', 'Φαγητό/Καφές', 'Ταχυδρομικά',
  'Συντήρηση οχήματος', 'Ασφάλεια', 'Ενοίκιο', 'ΔΕΗ/ΕΥΔΑΠ',
  'Διαφήμιση', 'Λογισμικό', 'Άλλο'
]

function GeneralExpensesTab({ expenses, loadExpenses, fmt, fmtDate, notify, year, month, monthsFull }) {
  const [showForm, setShowForm] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState('all')
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Διόδια',
    description: '',
    amount: '',
    vat: '',
    payment_method: 'Μετρητά',
    receipt_ref: '',
    vendor: '',
    notes: ''
  })

  const ef = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = async (file) => {
    if (!file) return
    setScanning(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target.result
      try {
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: dataUrl.split(',')[1], mediaType: file.type || 'image/jpeg', mode: 'expense' })
        })
        const json = await res.json()
        if (json.success && json.data) {
          const d = json.data
          setForm(f => ({
            ...f,
            date: d.date || f.date,
            category: d.category || f.category,
            description: d.description || f.description,
            amount: d.amount || f.amount,
            vat: d.vat || f.vat,
            vendor: d.vendor || f.vendor,
            receipt_ref: d.receipt_ref || f.receipt_ref,
            payment_method: d.payment_method || f.payment_method,
            notes: d.notes || f.notes
          }))
          setShowForm(true)
          notify('Η απόδειξη διαβάστηκε!')
        } else notify('Δεν μπόρεσα να διαβάσω.', 'error')
      } catch(e) { notify('Σφάλμα: ' + e.message, 'error') }
      setScanning(false)
    }
    reader.readAsDataURL(file)
  }

  const saveExpense = async () => {
    if (!form.amount || !form.date) { notify('Συμπλήρωσε ημερομηνία και ποσό!', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('expenses').insert([{
      date: form.date,
      category: form.category,
      description: form.description || null,
      amount: parseFloat(form.amount) || 0,
      vat: parseFloat(form.vat) || 0,
      payment_method: form.payment_method || 'Μετρητά',
      receipt_ref: form.receipt_ref || null,
      vendor: form.vendor || null,
      notes: form.notes || null
    }])
    if (error) notify('Σφάλμα: ' + error.message, 'error')
    else {
      notify('Αποθηκεύτηκε!')
      setShowForm(false)
      setForm({ date: new Date().toISOString().split('T')[0], category: 'Διόδια', description: '', amount: '', vat: '', payment_method: 'Μετρητά', receipt_ref: '', vendor: '', notes: '' })
      await loadExpenses()
    }
    setSaving(false)
  }

  const deleteExpense = async (id) => {
    if (!confirm('Διαγραφή;')) return
    await supabase.from('expenses').delete().eq('id', id)
    await loadExpenses()
    notify('Διαγράφηκε.')
  }

  const filtered = filterCat === 'all' ? expenses : expenses.filter(e => e.category === filterCat)
  const { sorted: sortedExpenses, SortTh: GenSortTh } = useSortable(filtered, 'date', 'desc')
  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0)
  const totalVat = filtered.reduce((s, e) => s + (e.vat || 0), 0)

  // Σύνολα ανά κατηγορία
  const byCat = {}
  expenses.forEach(e => {
    if (!byCat[e.category]) byCat[e.category] = 0
    byCat[e.category] += e.amount || 0
  })
  const catSorted = Object.entries(byCat).sort((a, b) => b[1] - a[1])

  const period = month === 0 ? `${year}` : `${monthsFull[month-1]} ${year}`

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>Γενικά Έξοδα — {period}</h2>
        <div style={{ background: '#2a0f0f', border: '1px solid #f8717133', borderRadius: 7, padding: '4px 12px' }}>
          <div style={{ fontSize: 9, color: '#f87171', fontWeight: 700 }}>ΣΥΝΟΛΟ</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#f87171', fontWeight: 700 }}>{fmt(total)}</div>
        </div>
        {totalVat > 0 && (
          <div style={{ background: '#1a1d27', border: '1px solid #2a3040', borderRadius: 7, padding: '4px 12px' }}>
            <div style={{ fontSize: 9, color: '#5a6070', fontWeight: 700 }}>ΦΠΑ</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#9ca3af', fontWeight: 700 }}>{fmt(totalVat)}</div>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <label style={{ background: '#1e2232', color: '#e8eaf0', border: '1px solid #2a3040', padding: '9px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {scanning ? 'Ανάγνωση...' : 'Σάρωση απόδειξης'}
            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} disabled={scanning} />
          </label>
          <button onClick={() => setShowForm(!showForm)} style={{ background: 'linear-gradient(135deg,#4f8ef7,#7c5cf7)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Νέο</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        {/* Κατηγορίες αριστερά */}
        <div>
          <div style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>ΚΑΤΗΓΟΡΙΕΣ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div onClick={() => setFilterCat('all')}
              style={{ padding: '9px 12px', borderRadius: 7, cursor: 'pointer', background: filterCat === 'all' ? '#2a0f0f' : '#0f1117', border: `1px solid ${filterCat === 'all' ? '#f8717166' : '#2a3040'}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: filterCat === 'all' ? '#f87171' : '#9ca3af', fontWeight: filterCat === 'all' ? 700 : 400 }}>Όλες</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#f87171', fontWeight: 700 }}>{fmt(expenses.reduce((s,e)=>s+(e.amount||0),0))}</span>
            </div>
            {catSorted.map(([cat, amt]) => (
              <div key={cat} onClick={() => setFilterCat(cat)}
                style={{ padding: '9px 12px', borderRadius: 7, cursor: 'pointer', background: filterCat === cat ? '#2a0f0f' : '#0f1117', border: `1px solid ${filterCat === cat ? '#f8717166' : '#2a3040'}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: filterCat === cat ? '#f87171' : '#9ca3af', fontWeight: filterCat === cat ? 700 : 400 }}>{cat}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#f87171' }}>{fmt(amt)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Δεξιά */}
        <div>
          {/* Φόρμα */}
          {showForm && (
            <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>ΝΕΟ ΕΞΟΔΟ</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΗΜΕΡΟΜΗΝΙΑ</label>
                  <input type="date" value={form.date} onChange={e => ef('date', e.target.value)}
                    style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΚΑΤΗΓΟΡΙΑ</label>
                  <select value={form.category} onChange={e => ef('category', e.target.value)}
                    style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', outline: 'none' }}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΠΟΣΟ €</label>
                  <input type="number" step="0.01" value={form.amount} onChange={e => ef('amount', e.target.value)}
                    style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#f87171', borderRadius: 7, padding: '8px 10px', fontSize: 14, fontWeight: 700, width: '100%', outline: 'none', fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΦΠΑ €</label>
                  <input type="number" step="0.01" value={form.vat} onChange={e => ef('vat', e.target.value)}
                    style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΠΡΟΜΗΘΕΥΤΗΣ</label>
                  <input value={form.vendor} onChange={e => ef('vendor', e.target.value)} placeholder="π.χ. Aegean Motorway"
                    style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ</label>
                  <select value={form.payment_method} onChange={e => ef('payment_method', e.target.value)}
                    style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', outline: 'none' }}>
                    <option>Μετρητά</option>
                    <option>Χρεωστική κάρτα</option>
                    <option>Πιστωτική κάρτα</option>
                    <option>Τραπεζική μεταφορά</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΑΡ. ΑΠΟΔΕΙΞΗΣ</label>
                  <input value={form.receipt_ref} onChange={e => ef('receipt_ref', e.target.value)}
                    style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, display: 'block', marginBottom: 4 }}>ΠΕΡΙΓΡΑΦΗ</label>
                  <input value={form.description} onChange={e => ef('description', e.target.value)} placeholder="π.χ. Α/Θ Θεσσαλονίκη"
                    style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={saveExpense} disabled={saving}
                  style={{ background: 'linear-gradient(135deg,#4f8ef7,#7c5cf7)', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? .7 : 1 }}>
                  {saving ? '...' : 'Αποθήκευση'}
                </button>
                <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: '#5a6070', border: '1px solid #2a3040', padding: '9px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Ακύρωση</button>
              </div>
            </div>
          )}

          {/* Λίστα */}
          {filtered.length === 0 ? (
            <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, padding: 48, textAlign: 'center', color: '#5a6070' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🧾</div>
              <div style={{ fontWeight: 600 }}>Δεν υπάρχουν έξοδα για αυτή την περίοδο</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Σκάναρε απόδειξη ή πρόσθεσε χειροκίνητα</div>
            </div>
          ) : (
            <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <GenSortTh label="ΗΜΕΡΟΜΗΝΙΑ" field="date" />
                      <GenSortTh label="ΚΑΤΗΓΟΡΙΑ" field="category" />
                      <GenSortTh label="ΠΕΡΙΓΡΑΦΗ" field="description" />
                      <GenSortTh label="ΠΡΟΜΗΘΕΥΤΗΣ" field="vendor" />
                      <th style={{ fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '9px 12px', borderBottom: '1px solid #1e2232' }}>ΤΡΟΠΟΣ</th>
                      <th style={{ fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '9px 12px', borderBottom: '1px solid #1e2232' }}>ΑΡ. ΑΠΟΔ.</th>
                      <GenSortTh label="ΦΠΑ" field="vat" style={{ textAlign: 'right' }} />
                      <GenSortTh label="ΠΟΣΟ" field="amount" style={{ textAlign: 'right' }} />
                      <th style={{ fontSize: 10, color: '#5a6070', padding: '9px 12px', borderBottom: '1px solid #1e2232' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedExpenses.map(e => (
                      <tr key={e.id} onMouseEnter={ev => ev.currentTarget.style.background='#1a1d2b'} onMouseLeave={ev => ev.currentTarget.style.background=''}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{fmtDate(e.date)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 12 }}>
                          <span style={{ background: '#2a0f0f', color: '#f87171', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{e.category}</span>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 12, color: '#9ca3af' }}>{e.description || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 12 }}>{e.vendor || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 11, color: '#5a6070' }}>{e.payment_method || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 11, color: '#5a6070', fontFamily: 'monospace' }}>{e.receipt_ref || '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: '#5a6070' }}>{e.vat > 0 ? fmt(e.vat) : '—'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824', fontSize: 14, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: '#f87171' }}>{fmt(e.amount)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #161824' }}>
                          <button onClick={() => deleteExpense(e.id)} style={{ background: 'transparent', color: '#f87171', border: 'none', fontSize: 12, cursor: 'pointer' }}>✕</button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#0f1117' }}>
                      <td colSpan={6} style={{ padding: '10px 12px', fontSize: 12, color: '#5a6070', fontWeight: 700 }}>ΣΥΝΟΛΟ</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: '#5a6070', fontWeight: 700 }}>{totalVat > 0 ? fmt(totalVat) : '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 15, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: '#f87171' }}>{fmt(total)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ΑΝΑΦΟΡΕΣ
═══════════════════════════════════════════════════════════ */
function ReportsTab({ income, expenses, yearPayments, generalExpenses, fmt, fmtDate, year, month, monthsFull }) {
  const [activeReport, setActiveReport] = useState('customers')
  const [selected, setSelected] = useState(null)
  const period = month === 0 ? `${year}` : `${monthsFull[month-1]} ${year}`

  // Τζίρος ανά πελάτη
  const byCustomer = {}
  income.forEach(inv => {
    const key = inv.afm || inv.counterparty || 'Άγνωστος'
    if (!byCustomer[key]) byCustomer[key] = { name: inv.counterparty || 'Άγνωστος', afm: inv.afm, invoices: 0, subtotal: 0, vat: 0, total: 0 }
    byCustomer[key].invoices++
    byCustomer[key].subtotal += inv.subtotal || 0
    byCustomer[key].vat += inv.vat || 0
    byCustomer[key].total += inv.total || 0
  })
  const customerList = Object.values(byCustomer).sort((a, b) => b.total - a.total)
  const totalIncome = customerList.reduce((s, c) => s + c.total, 0)

  // Τζίρος ανά προμηθευτή
  const bySupplier = {}
  expenses.forEach(inv => {
    const name = inv.issuer_name || inv.counterparty || 'Άγνωστος'
    const key = inv.issuer_afm || name
    if (!bySupplier[key]) bySupplier[key] = { name, afm: inv.issuer_afm || inv.afm, invoices: 0, subtotal: 0, vat: 0, total: 0 }
    bySupplier[key].invoices++
    bySupplier[key].subtotal += inv.subtotal || 0
    bySupplier[key].vat += inv.vat || 0
    bySupplier[key].total += inv.total || 0
  })
  const supplierList = Object.values(bySupplier).sort((a, b) => b.total - a.total)
  const totalExpense = supplierList.reduce((s, c) => s + c.total, 0)

  // Γενικά έξοδα ανά κατηγορία
  const byCat = {}
  generalExpenses.forEach(e => {
    if (!byCat[e.category]) byCat[e.category] = { count: 0, total: 0, vat: 0 }
    byCat[e.category].count++
    byCat[e.category].total += e.amount || 0
    byCat[e.category].vat += e.vat || 0
  })
  const catList = Object.entries(byCat).sort((a, b) => b[1].total - a[1].total)
  const totalGeneral = catList.reduce((s, [, v]) => s + v.total, 0)

  const printReport = () => {
    const win = window.open('', '_blank')
    const isCustomer = activeReport === 'customers'
    const isSupplier = activeReport === 'suppliers'
    const list = isCustomer ? customerList : isSupplier ? supplierList : catList
    const total = isCustomer ? totalIncome : isSupplier ? totalExpense : totalGeneral
    const title = isCustomer ? 'ΤΖΙΡΟΣ ΑΝΑ ΠΕΛΑΤΗ' : isSupplier ? 'ΑΓΟΡΕΣ ΑΝΑ ΠΡΟΜΗΘΕΥΤΗ' : 'ΓΕΝΙΚΑ ΕΞΟΔΑ ΑΝΑ ΚΑΤΗΓΟΡΙΑ'
    const color = isCustomer ? '#1a6e3a' : '#8b1a1a'

    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><meta charset="utf-8">
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:25px;font-size:12px}
    .hdr{text-align:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #000}
    .title{font-size:18px;font-weight:bold;color:${color}}
    .sub{font-size:13px;color:#444;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#333;color:#fff;padding:8px 10px;text-align:left;font-size:11px}
    th.r{text-align:right}
    td{padding:8px 10px;border-bottom:1px solid #eee;font-size:12px}
    td.r{text-align:right}
    tr:nth-child(even) td{background:#f9f9f9}
    .tot{background:#f0f0f0!important;font-weight:bold}
    .bar{background:${color};height:8px;border-radius:4px;display:inline-block}
    @media print{@page{margin:12mm}}</style></head><body>
    <div class="hdr">
      <div class="title">${title}</div>
      <div class="sub">Περίοδος: ${period} &nbsp;|&nbsp; Εκτύπωση: ${new Date().toLocaleDateString('el-GR')}</div>
    </div>
    <table>
      <thead><tr>
        <th>#</th>
        ${isCustomer || isSupplier ? '<th>ΕΠΩΝΥΜΙΑ</th><th>ΑΦΜ</th><th class="r">ΠΑΡΑΣΤ.</th><th class="r">ΚΑΘΑΡΗ ΑΞΙΑ</th><th class="r">ΦΠΑ</th>' : '<th>ΚΑΤΗΓΟΡΙΑ</th><th class="r">ΕΓΓΡΑΦΕΣ</th>'}
        <th class="r">ΣΥΝΟΛΟ</th>
        <th class="r">% ΣΥΜΜΕΤΟΧΗ</th>
      </tr></thead>
      <tbody>
        ${(isCustomer ? customerList : isSupplier ? supplierList : catList).map((item, i) => {
          const isArr = Array.isArray(item)
          const name = isArr ? item[0] : item.name
          const data = isArr ? item[1] : item
          const pct = total > 0 ? ((data.total / total) * 100).toFixed(1) : '0.0'
          return `<tr>
            <td>${i + 1}</td>
            ${!isArr ? `<td><strong>${name}</strong></td><td style="font-family:monospace;color:#666">${data.afm || '—'}</td><td class="r">${data.invoices}</td><td class="r">${data.subtotal.toFixed(2)}€</td><td class="r">${data.vat.toFixed(2)}€</td>` : `<td><strong>${name}</strong></td><td class="r">${data.count}</td>`}
            <td class="r"><strong>${data.total.toFixed(2)}€</strong></td>
            <td class="r">${pct}% <span class="bar" style="width:${Math.max(4, parseFloat(pct))}px"></span></td>
          </tr>`
        }).join('')}
        <tr class="tot">
          <td colspan="${isCustomer || isSupplier ? '5' : '2'}"></td>
          <td class="r">ΣΥΝΟΛΟ</td>
          <td class="r">${total.toFixed(2)}€</td>
          <td class="r">100%</td>
        </tr>
      </tbody>
    </table>
    <script>window.onload=()=>window.print()</script></body></html>`)
    win.document.close()
  }

  const reports = [
    { id: 'customers', label: 'Τζίρος ανά Πελάτη', total: totalIncome, color: '#4ade80', count: customerList.length },
    { id: 'suppliers', label: 'Αγορές ανά Προμηθευτή', total: totalExpense, color: '#f87171', count: supplierList.length },
    { id: 'general', label: 'Γεν. Έξοδα ανά Κατηγορία', total: totalGeneral, color: '#fbbf24', count: catList.length },
  ]

  const activeData = activeReport === 'customers' ? customerList : activeReport === 'suppliers' ? supplierList : null
  const activeCatData = activeReport === 'general' ? catList : null
  const activeTotal = activeReport === 'customers' ? totalIncome : activeReport === 'suppliers' ? totalExpense : totalGeneral
  const activeColor = activeReport === 'customers' ? '#4ade80' : activeReport === 'suppliers' ? '#f87171' : '#fbbf24'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>Αναφορές — {period}</h2>
        <button onClick={printReport} style={{ background: '#1e2232', color: '#e8eaf0', border: '1px solid #2a3040', padding: '9px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
          Εκτύπωση / PDF
        </button>
      </div>

      {/* Report selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {reports.map(r => (
          <div key={r.id} onClick={() => { setActiveReport(r.id); setSelected(null) }}
            style={{ background: activeReport === r.id ? '#13151f' : '#0f1117', border: `2px solid ${activeReport === r.id ? r.color + '66' : '#1e2232'}`, borderRadius: 10, padding: '16px 18px', cursor: 'pointer', transition: 'all .15s' }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>{r.label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: r.color }}>{fmt(r.total)}</div>
            <div style={{ fontSize: 11, color: '#5a6070', marginTop: 4 }}>{r.count} εγγραφές</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '10px 12px', borderBottom: '1px solid #1e2232', width: 40 }}>#</th>
                <th style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '10px 12px', borderBottom: '1px solid #1e2232' }}>
                  {activeReport === 'general' ? 'ΚΑΤΗΓΟΡΙΑ' : 'ΕΠΩΝΥΜΙΑ'}
                </th>
                {activeReport !== 'general' && <>
                  <th style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '10px 12px', borderBottom: '1px solid #1e2232' }}>ΑΦΜ</th>
                  <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '10px 12px', borderBottom: '1px solid #1e2232' }}>ΠΑΡΑΣΤ.</th>
                  <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '10px 12px', borderBottom: '1px solid #1e2232' }}>ΚΑΘΑΡΗ</th>
                  <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '10px 12px', borderBottom: '1px solid #1e2232' }}>ΦΠΑ</th>
                </>}
                {activeReport === 'general' && <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '10px 12px', borderBottom: '1px solid #1e2232' }}>ΕΓΓΡΑΦΕΣ</th>}
                <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '10px 12px', borderBottom: '1px solid #1e2232' }}>ΣΥΝΟΛΟ</th>
                <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '10px 12px', borderBottom: '1px solid #1e2232' }}>% ΣΥΜΜΕΤΟΧΗ</th>
              </tr>
            </thead>
            <tbody>
              {(activeData || activeCatData || []).map((item, i) => {
                const isArr = Array.isArray(item)
                const name = isArr ? item[0] : item.name
                const data = isArr ? item[1] : item
                const pct = activeTotal > 0 ? ((data.total / activeTotal) * 100).toFixed(1) : '0.0'
                return (
                  <tr key={i} onClick={() => setSelected(selected?.name === name ? null : {...data, name, isArr})}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background='#1a1d2b'} onMouseLeave={e => e.currentTarget.style.background=selected?.name===name?'#1a1d2b':''}>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 12, color: '#5a6070', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 13, fontWeight: 600, color: selected?.name===name ? activeColor : '#e8eaf0' }}>{name} {selected?.name===name ? '▲' : '▼'}</td>
                    {activeReport !== 'general' && <>
                      <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 11, color: '#5a6070', fontFamily: 'monospace' }}>{data.afm || '—'}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 12, textAlign: 'right', color: '#5a6070' }}>{data.invoices}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(data.subtotal)}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#5a6070' }}>{fmt(data.vat)}</td>
                    </>}
                    {activeReport === 'general' && <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 12, textAlign: 'right', color: '#5a6070' }}>{data.count}</td>}
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 14, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: activeColor }}>{fmt(data.total)}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #161824', fontSize: 12, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ background: '#1e2232', borderRadius: 4, overflow: 'hidden', width: 60, height: 6 }}>
                          <div style={{ background: activeColor, height: '100%', width: `${Math.min(100, parseFloat(pct))}%`, borderRadius: 4 }} />
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: 11, minWidth: 36 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {/* Σύνολο */}
              <tr style={{ background: '#0f1117' }}>
                <td colSpan={activeReport !== 'general' ? 5 : 2} style={{ padding: '12px', fontSize: 12, color: '#5a6070', fontWeight: 700 }}>ΣΥΝΟΛΟ</td>
                {activeReport !== 'general' && <td style={{ padding: '12px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt((activeData||[]).reduce((s,c)=>s+(c.subtotal||0),0))}</td>}
                {activeReport !== 'general' && <td style={{ padding: '12px', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#5a6070' }}>{fmt((activeData||[]).reduce((s,c)=>s+(c.vat||0),0))}</td>}
                <td style={{ padding: '12px', fontSize: 16, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: activeColor }}>{fmt(activeTotal)}</td>
                <td style={{ padding: '12px', fontSize: 12, textAlign: 'right', color: '#5a6070' }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Αναλυτική προβολή */}
      {selected && (
        <div style={{ background: '#13151f', border: `1px solid ${activeColor}44`, borderRadius: 12, padding: 20, marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: activeColor }}>{selected.name}</h3>
              {selected.afm && <div style={{ fontSize: 12, color: '#5a6070', marginTop: 2 }}>ΑΦΜ: {selected.afm}</div>}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#5a6070' }}>ΣΥΝΟΛΟ</div>
                <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: activeColor }}>{fmt(selected.total)}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'transparent', color: '#5a6070', border: '1px solid #2a3040', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Κλείσιμο</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  {['ΗΜΕΡΟΜΗΝΙΑ', 'ΕΙΔΟΣ', 'ΑΡΙΘΜΟΣ', 'ΚΑΘΑΡΗ', 'ΦΠΑ', 'ΣΥΝΟΛΟ'].map(h => (
                    <th key={h} style={{ textAlign: ['ΚΑΘΑΡΗ','ΦΠΑ','ΣΥΝΟΛΟ'].includes(h)?'right':'left', fontSize: 10, fontWeight: 700, color: '#5a6070', padding: '8px 12px', borderBottom: '1px solid #1e2232' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(activeReport === 'customers'
                  ? income.filter(inv => (inv.afm || inv.counterparty) === (selected.afm || selected.name))
                  : activeReport === 'suppliers'
                  ? expenses.filter(inv => (inv.issuer_afm || inv.issuer_name || inv.counterparty) === (selected.afm || selected.name))
                  : generalExpenses.filter(e => e.category === selected.name)
                ).map((inv, i) => (
                  <tr key={i} onMouseEnter={e => e.currentTarget.style.background='#1a1d2b'} onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #161824', fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{fmtDate(inv.date)}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #161824', fontSize: 11, color: '#4f8ef7', fontWeight: 600 }}>
                      {activeReport === 'general' ? inv.category : (inv.invoice_type || '—')}
                    </td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #161824', fontSize: 12, fontFamily: 'monospace', color: '#7c5cf7' }}>
                      {activeReport === 'general' ? (inv.vendor || '—') : (inv.series||'')+(inv.number||'—')}
                    </td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #161824', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>
                      {fmt(activeReport === 'general' ? (inv.amount - (inv.vat||0)) : inv.subtotal)}
                    </td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #161824', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#5a6070' }}>
                      {fmt(activeReport === 'general' ? (inv.vat||0) : inv.vat)}
                    </td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid #161824', fontSize: 13, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: activeColor }}>
                      {fmt(activeReport === 'general' ? inv.amount : inv.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
function DashboardTab({ income, expenses, yearPayments, generalExpenses, invoices, payments, fmt, fmtDate, year, month, monthsFull, setTab }) {
  const period = month === 0 ? `Χρήση ${year}` : `${monthsFull[month-1]} ${year}`

  const totalIncome = income.reduce((s, i) => s + (i.total || 0), 0)
  const totalExpense = expenses.reduce((s, i) => s + (i.total || 0), 0)
  const totalGeneralFiltered = generalExpenses.filter(e => { const d=new Date(e.date); return d.getFullYear()===year&&(month===0||d.getMonth()+1===month) }).reduce((s,e)=>s+(e.amount||0),0)
  const totalExpenseAll = totalExpense + totalGeneralFiltered
  const totalGeneral = generalExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalReceipts = yearPayments.filter(p => p.type === 'receipt').reduce((s, p) => s + (p.amount || 0), 0)
  const totalPaid = yearPayments.filter(p => p.type === 'payment').reduce((s, p) => s + (p.amount || 0), 0)
  const netResult = totalIncome - totalExpense - totalGeneral
  const pendingIn = totalIncome - totalReceipts
  const pendingOut = totalExpense - totalPaid

  // Τελευταίες κινήσεις
  const recentInvoices = [...invoices].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0, 5)

  // Τιμολόγια που λήγουν σύντομα (επόμενες 30 μέρες)
  const today = new Date()
  const in30 = new Date(today.getTime() + 30*24*60*60*1000)
  const expiring = invoices.filter(inv => {
    if (!inv.due_date) return false
    const d = new Date(inv.due_date)
    return d >= today && d <= in30
  }).sort((a,b) => new Date(a.due_date)-new Date(b.due_date))

  const Card = ({ label, value, sub, color, bg, onClick, badge }) => (
    <div onClick={onClick} style={{ background: bg || '#13151f', border: `1px solid ${color}33`, borderRadius: 12, padding: '18px 20px', cursor: onClick ? 'pointer' : 'default', transition: 'all .15s', position: 'relative' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.border = `1px solid ${color}66`)}
      onMouseLeave={e => onClick && (e.currentTarget.style.border = `1px solid ${color}33`)}>
      {badge && <div style={{ position: 'absolute', top: 10, right: 10, background: '#f87171', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '2px 6px' }}>{badge}</div>}
      <div style={{ fontSize: 11, color: '#5a6070', fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#5a6070', marginTop: 4 }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>Dashboard — {period}</h2>
      </div>
      {/* Ειδοποίηση για λάθη */}
      {(() => {
        const flagged = [...income, ...expenses].filter(inv => inv.notes?.includes('⚠️ ΛΑΘΟΣ'))
        return flagged.length > 0 ? (
          <div style={{ background: '#2a0f0f', border: '2px solid #f87171', borderRadius: 10, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 24 }}>⚠️</div>
            <div>
              <div style={{ color: '#f87171', fontWeight: 700, fontSize: 14 }}>{flagged.length} παραστατικά έχουν αναφερθεί ως λάθος!</div>
              <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 3 }}>
                {flagged.map(inv => `${inv.series||''}${inv.number||''} (${inv.issuer_name || inv.counterparty})`).join(', ')}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: '#5a6070' }}>Πήγαινε Έσοδα/Έξοδα για διαγραφή</div>
          </div>
        ) : null
      })()}

      {/* Κύρια σύνοψη */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Card label="Έσοδα" value={fmt(totalIncome)} sub={`${income.length} παραστατικά`} color="#4ade80" onClick={() => setTab(1)} />
        <Card label="Έξοδα (τιμολόγια)" value={fmt(totalExpense)} sub={`${expenses.length} παραστατικά`} color="#f87171" onClick={() => setTab(2)} />
        <Card label="Γενικά Έξοδα" value={fmt(totalGeneral)} sub={`${generalExpenses.length} εγγραφές`} color="#fbbf24" onClick={() => setTab(3)} />
        <Card label="Αποτέλεσμα Περιόδου" value={fmt(netResult)} sub="Έσοδα − Έξοδα − Γεν.Έξοδα" color={netResult >= 0 ? '#4ade80' : '#f87171'} bg={netResult >= 0 ? '#0a2215' : '#2a0f0f'} />
      </div>

      {/* Εισπρακτέα / Πληρωτέα */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Card label="Εισπράχθηκαν" value={fmt(totalReceipts)} sub={`από σύνολο ${fmt(totalIncome)}`} color="#4ade80" onClick={() => setTab(3)} />
        <Card label="Εισπρακτέα (υπόλοιπο)" value={fmt(Math.max(0, pendingIn))} sub={pendingIn > 0 ? "Αναμένεται είσπραξη" : "Όλα εισπράχθηκαν"} color={pendingIn > 0 ? '#fbbf24' : '#4ade80'} />
        <Card label="Πληρώθηκαν" value={fmt(totalPaid)} sub={`από σύνολο ${fmt(totalExpense)}`} color="#f87171" onClick={() => setTab(3)} />
        <Card label="Πληρωτέα (υπόλοιπο)" value={fmt(Math.max(0, pendingOut))} sub={pendingOut > 0 ? "Αναμένεται πληρωμή" : "Όλα πληρώθηκαν"} color={pendingOut > 0 ? '#fbbf24' : '#4ade80'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Τελευταίες κινήσεις */}
        <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e2232', fontWeight: 700, fontSize: 13 }}>Τελευταίες Κινήσεις</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {recentInvoices.map(inv => (
                <tr key={inv.id} onMouseEnter={e => e.currentTarget.style.background='#1a1d2b'} onMouseLeave={e => e.currentTarget.style.background=''}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #161824', fontSize: 11, color: '#5a6070', fontFamily: 'monospace', width: 85 }}>{fmtDate(inv.date)}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #161824', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      {inv.type === 'expense' ? (inv.issuer_name || inv.counterparty) : (inv.counterparty || inv.issuer_name)}
                    </div>
                    <div style={{ fontSize: 10, color: '#5a6070' }}>{inv.invoice_type || '—'}</div>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #161824', fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: inv.type === 'income' ? '#4ade80' : '#f87171', whiteSpace: 'nowrap' }}>
                    {inv.type === 'income' ? '+' : '-'}{fmt(inv.total)}
                  </td>
                </tr>
              ))}
              {recentInvoices.length === 0 && (
                <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#5a6070', fontSize: 12 }}>Δεν υπάρχουν κινήσεις</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Υπενθυμίσεις - Λήξεις */}
        <div style={{ background: '#13151f', border: `1px solid ${expiring.length > 0 ? '#fbbf2444' : '#1e2232'}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e2232', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Επερχόμενες Λήξεις (30 ημέρες)</span>
            {expiring.length > 0 && <span style={{ background: '#f87171', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>{expiring.length}</span>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {expiring.map(inv => {
                const daysLeft = Math.ceil((new Date(inv.due_date) - today) / (1000*60*60*24))
                return (
                  <tr key={inv.id} onMouseEnter={e => e.currentTarget.style.background='#1a1d2b'} onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid #161824', fontSize: 12 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                        {inv.type === 'expense' ? (inv.issuer_name || inv.counterparty) : (inv.counterparty)}
                      </div>
                      <div style={{ fontSize: 10, color: '#5a6070' }}>{inv.series}{inv.number} · {inv.invoice_type}</div>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid #161824', fontSize: 11, color: daysLeft <= 7 ? '#f87171' : '#fbbf24', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {daysLeft === 0 ? 'Σήμερα!' : `${daysLeft} μέρες`}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid #161824', fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: inv.type === 'income' ? '#4ade80' : '#f87171', whiteSpace: 'nowrap' }}>
                      {fmt(inv.total)}
                    </td>
                  </tr>
                )
              })}
              {expiring.length === 0 && (
                <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#5a6070', fontSize: 12 }}>Δεν υπάρχουν επερχόμενες λήξεις</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ΦΠΑ Ανάλυση */}
      <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, padding: 20, marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Ανάλυση ΦΠΑ — {period}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { label: 'ΦΠΑ Εσόδων (χρεώσατε)', value: income.reduce((s,i)=>s+(i.vat||0),0), color: '#4ade80', sub: 'Πρέπει να αποδώσετε' },
            { label: 'ΦΠΑ Εξόδων (πληρώσατε)', value: expenses.reduce((s,i)=>s+(i.vat||0),0) + generalExpenses.reduce((s,e)=>s+(e.vat||0),0), color: '#f87171', sub: 'Εκπίπτει' },
            { label: 'ΦΠΑ Καταβλητέο', value: income.reduce((s,i)=>s+(i.vat||0),0) - expenses.reduce((s,i)=>s+(i.vat||0),0) - generalExpenses.reduce((s,e)=>s+(e.vat||0),0), color: '#fbbf24', sub: 'Προς απόδοση στην εφορία' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ background: '#0a0c13', borderRadius: 9, padding: '14px 16px', border: `1px solid ${color}22` }}>
              <div style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color }}>{fmt(Math.abs(value))}</div>
              <div style={{ fontSize: 10, color: '#5a6070', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   INVOICE LIST COMPONENT (με sorting)
═══════════════════════════════════════ */
function InvoiceList({ list, color, title, searchQ, setSearchQ, filtered, expandedId, setExpandedId, deleteInvoice, setTab, setEditForm, fmt, fmtDate, loading, tab, copyInvoice, userRole, generalExpenses = [], loadInvoices }) {
  // Μετατροπή generalExpenses σε invoice-like objects
  const genAsInvoices = generalExpenses.map(e => ({
    ...e,
    _isGeneral: true,
    type: 'expense',
    invoice_type: e.category,
    counterparty: e.vendor || e.category,
    issuer_name: e.vendor || e.category,
    total: e.amount,
    subtotal: e.amount - (e.vat || 0),
    vat: e.vat || 0,
    number: e.receipt_ref || '—',
    series: '',
  }))
  const combinedList = [...list, ...genAsInvoices]
  const total = combinedList.reduce((s, i) => s + (i.total || 0), 0)
  const flist = filtered(combinedList)
  const { sorted: sortedList, SortTh } = useSortable(flist, 'date', 'desc')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>{title}</h2>
        {userRole !== 'employee' && <span style={{ fontFamily: 'monospace', color, fontSize: 17, fontWeight: 700 }}>{fmt(total)}</span>}
        <span style={{ color: '#5a6070', fontSize: 13, background: '#1e2232', padding: '3px 10px', borderRadius: 20 }}>{combinedList.length} παραστατικά{genAsInvoices.length > 0 ? ` (${genAsInvoices.length} γεν. έξοδα)` : ''}</span>
        <div style={{ marginLeft: 'auto', width: 260 }}>
          <input placeholder="Αναζήτηση..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
            style={{ background: '#0a0c13', border: '1px solid #2a3040', color: '#e8eaf0', borderRadius: 7, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <button style={{ background: 'linear-gradient(135deg,#4f8ef7,#7c5cf7)', color: '#fff', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}
          onClick={() => { setEditForm({ type: tab === 1 ? 'income' : 'expense', date: new Date().toISOString().split('T')[0], items: [] }); setTab(1) }}>
          + Χειροκίνητη
        </button>
        <button style={{ background: 'transparent', color: '#9ca3af', border: '1px solid #2a3040', padding: '9px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
          onClick={() => { setEditForm(null); setTab(0) }}>
          + Σάρωση
        </button>
      </div>

      {loading ? (
        <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, textAlign: 'center', padding: 48, color: '#5a6070' }}>Φόρτωση...</div>
      ) : sortedList.length === 0 ? (
        <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, textAlign: 'center', padding: 56, color: '#5a6070' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <div style={{ fontWeight: 600 }}>Δεν βρέθηκαν παραστατικά</div>
        </div>
      ) : (
        <div style={{ background: '#13151f', border: '1px solid #1e2232', borderRadius: 12, overflow: 'hidden' }}>
          {/* Sortable headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '95px 100px 140px 1fr 115px 95px 95px 115px 70px', gap: 6, padding: '0 16px', background: '#0f1117', borderBottom: '1px solid #1e2232' }}>
            <SortTh label="ΗΜΕΡΟΜΗΝΙΑ" field="date" />
            <SortTh label="ΑΡΙΘΜΟΣ" field="number" />
            <SortTh label="ΕΙΔΟΣ" field="invoice_type" />
            <SortTh label="ΕΠΩΝΥΜΙΑ" field="counterparty" />
            <SortTh label="ΑΦΜ" field="afm" />
            <SortTh label="ΚΑΘΑΡΗ" field="subtotal" style={{ textAlign: 'right' }} />
            <SortTh label="ΦΠΑ" field="vat" style={{ textAlign: 'right' }} />
            <SortTh label="ΣΥΝΟΛΟ" field="total" style={{ textAlign: 'right' }} />
            <th style={{ padding: '9px 10px', borderBottom: 'none' }}></th>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sortedList.map(inv => (
              <div key={inv.id} style={{ borderBottom: '1px solid #161824' }}>
                <div onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                  style={{ display: 'grid', gridTemplateColumns: '95px 100px 140px 1fr 115px 95px 95px 115px 70px', gap: 6, padding: '12px 16px', cursor: 'pointer', alignItems: 'center', background: inv.notes?.includes('⚠️ ΛΑΘΟΣ') ? '#1a0a0a' : '' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a1d2b'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <span style={{ color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>{fmtDate(inv.date)}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7c5cf7' }}>{inv.series || ''}{inv.number || '—'}</span>
                  <span style={{ fontSize: 11, color: inv._isGeneral ? '#fbbf24' : '#4f8ef7', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv._isGeneral ? `[${inv.category}]` : (inv.invoice_type || '—')}
                  </span>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.type === 'expense' ? (inv.issuer_name || inv.counterparty || '—') : (inv.counterparty || '—')}
                    </div>
                    {(inv.type === 'expense' ? inv.issuer_trade_name : inv.trade_name) && (
                      <div style={{ fontSize: 10, color: '#5a6070', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        "{inv.type === 'expense' ? inv.issuer_trade_name : inv.trade_name}"
                      </div>
                    )}
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#5a6070' }}>
                    {inv.type === 'expense' ? (inv.issuer_afm || inv.afm || '—') : (inv.afm || '—')}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, textAlign: 'right', color: '#5a6070' }}>{userRole === 'employee' ? '—' : fmt(inv.subtotal)}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, textAlign: 'right', color: '#5a6070' }}>{userRole === 'employee' ? '—' : fmt(inv.vat)}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 14, textAlign: 'right', fontWeight: 700, color }}>{userRole === 'employee' ? '—' : fmt(inv.total)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                    <span style={{ color: '#5a6070', fontSize: 11 }}>{expandedId === inv.id ? '▲' : '▼'}</span>
                    {userRole !== 'employee' && <button style={{ background: 'transparent', color: '#4f8ef7', border: 'none', padding: '4px 6px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                      title="Αντίγραφο"
                      onClick={e => { e.stopPropagation(); copyInvoice(inv) }}>⎘</button>}
                    {userRole === 'employee' && (
                      <button style={{ background: inv.notes?.includes('⚠️ ΛΑΘΟΣ') ? '#2a0f0f' : 'transparent', color: inv.notes?.includes('⚠️ ΛΑΘΟΣ') ? '#f87171' : '#fbbf24', border: `1px solid ${inv.notes?.includes('⚠️ ΛΑΘΟΣ') ? '#f87171' : '#fbbf2444'}`, padding: '3px 7px', borderRadius: 6, fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
                        title="Αναφορά λάθους"
                        onClick={async e => {
                          e.stopPropagation()
                          if (inv.notes?.includes('⚠️ ΛΑΘΟΣ')) {
                            const newNotes = (inv.notes || '').replace(' | ⚠️ ΛΑΘΟΣ - ΠΡΟΣ ΔΙΑΓΡΑΦΗ', '').replace('⚠️ ΛΑΘΟΣ - ΠΡΟΣ ΔΙΑΓΡΑΦΗ', '').trim()
                            await supabase.from('invoices').update({ notes: newNotes || null }).eq('id', inv.id)
                            if (loadInvoices) await loadInvoices()
                            notify('Η αναφορά λάθους ακυρώθηκε.')
                          } else {
                            const newNotes = (inv.notes ? inv.notes + ' | ' : '') + '⚠️ ΛΑΘΟΣ - ΠΡΟΣ ΔΙΑΓΡΑΦΗ'
                            await supabase.from('invoices').update({ notes: newNotes }).eq('id', inv.id)
                            if (loadInvoices) await loadInvoices()
                            notify('Η αναφορά λάθους καταχωρήθηκε! Ο διαχειριστής θα το διαγράψει.')
                          }
                        }}>
                        {inv.notes?.includes('⚠️ ΛΑΘΟΣ') ? '⚠️ Ακύρωση' : '! Λάθος'}
                      </button>
                    )}
                    {userRole !== 'employee' && <button style={{ background: 'transparent', color: '#f87171', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); deleteInvoice(inv.id) }}>✕</button>}
                  </div>
                </div>
                {expandedId === inv.id && (inv._isGeneral ? (
                  <div style={{ borderTop: '1px solid #1e2232', background: '#0a0c13', padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      {[
                        ['ΚΑΤΗΓΟΡΙΑ', inv.category, '#fbbf24'],
                        ['ΠΕΡΙΓΡΑΦΗ', inv.description || '—', '#9ca3af'],
                        ['ΠΡΟΜΗΘΕΥΤΗΣ', inv.vendor || '—', '#9ca3af'],
                        ['ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ', inv.payment_method || '—', '#9ca3af'],
                        ['ΑΡ. ΑΠΟΔΕΙΞΗΣ', inv.receipt_ref || '—', '#7c5cf7'],
                        ['ΦΠΑ', fmt(inv.vat || 0), '#9ca3af'],
                      ].map(([label, val, c]) => (
                        <div key={label} style={{ background: '#13151f', borderRadius: 8, padding: '10px 14px', border: '1px solid #1e2232' }}>
                          <div style={{ fontSize: 10, color: '#5a6070', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 13, color: c, fontWeight: 600 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <InvoiceDetail inv={inv} color={color} fmt={fmt} fmtDate={fmtDate} />)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
