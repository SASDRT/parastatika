export async function POST(request) {
  try {
    const { base64, mediaType, mode } = await request.json()
    const isPDF = mediaType === 'application/pdf'

    const content = isPDF ? [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
      { type: 'text', text: mode === 'expense' ? getExpensePrompt() : getInvoicePrompt() }
    ] : [
      { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: base64 } },
      { type: 'text', text: mode === 'expense' ? getExpensePrompt() : getInvoicePrompt() }
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 3000,
        messages: [{ role: 'user', content }]
      })
    })

    const data = await response.json()
    if (data.error) {
      console.error('Anthropic error:', JSON.stringify(data.error))
      return Response.json({ success: false, error: data.error.message }, { status: 500 })
    }

    const text = data.content?.map(b => b.text || '').join('') || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return Response.json({ success: true, data: parsed })
  } catch (error) {
    console.error('OCR error:', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

function getExpensePrompt() {
  return `Διάβασε αυτή την απόδειξη και επέστρεψε ΜΟΝΟ JSON χωρίς backticks.

Κατηγορίες: Διόδια / Καύσιμα / Στάθμευση / Τηλεφωνία / Ίντερνετ / Αναλώσιμα / Γραφική ύλη / Φαγητό-Καφές / Ταχυδρομικά / Συντήρηση οχήματος / Ασφάλεια / Ενοίκιο / ΔΕΗ-ΕΥΔΑΠ / Διαφήμιση / Λογισμικό / Άλλο

Κανόνες κατηγοριοποίησης:
- Aegean Motorway, Egnatia Odos, διόδια → Διόδια
- ΕΚΟ, BP, Shell, Aegean Oil, Avin, Ελίν, βενζίνη, diesel → Καύσιμα
- parking, στάθμευση → Στάθμευση
- Cosmote, Vodafone, Wind, Nova, τηλέφωνο → Τηλεφωνία
- ΟΤΕ, internet, ίντερνετ → Ίντερνετ
- ΔΕΗ, ρεύμα, ΕΥΔΑΠ, νερό → ΔΕΗ-ΕΥΔΑΠ
- εστιατόριο, καφέ, ταβέρνα, φαγητό → Φαγητό-Καφές

{
  "date": "YYYY-MM-DD",
  "category": "κατηγορία από τη λίστα",
  "description": "σύντομη περιγραφή",
  "vendor": "επωνυμία καταστήματος/εταιρείας",
  "amount": αριθμός (συνολικό ποσό με ΦΠΑ),
  "vat": αριθμός (ποσό ΦΠΑ αν αναγράφεται),
  "payment_method": "Μετρητά ή Χρεωστική κάρτα ή Πιστωτική κάρτα",
  "receipt_ref": "αριθμός απόδειξης αν υπάρχει",
  "notes": "σημειώσεις"
}

ΜΟΝΟ JSON.`
}

function getInvoicePrompt() {
  return `Διάβασε αυτό το τιμολόγιο ΠΟΛΥ ΠΡΟΣΕΚΤΙΚΑ. Επέστρεψε ΜΟΝΟ JSON χωρίς backticks.

ΑΠΟΛΥΤΟΣ ΚΑΝΟΝΑΣ:
Η εταιρεία μου είναι: SMART AUTOMATION SOLUTIONS, ΑΦΜ 802802461
- "issuer_*" = ΠΑΝΤΑ ο εκδότης/πωλητής
- "counterparty" = ΠΑΝΤΑ ο πελάτης/αγοραστής
- ΑΝ counterparty έχει ΑΦΜ 802802461 → type = "expense"
- ΑΝ issuer έχει ΑΦΜ 802802461 → type = "income"

{
  "type": "income" ή "expense",
  "invoice_type": "είδος παραστατικού",
  "series": "σειρά",
  "number": "αριθμός",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "mark": "MARK myDATA",
  "uid": "UID",
  "issuer_name": "επωνυμία εκδότη",
  "issuer_trade_name": "διακριτικός τίτλος εκδότη",
  "issuer_afm": "ΑΦΜ εκδότη",
  "issuer_doy": "ΔΟΥ εκδότη",
  "issuer_gem": "ΓΕΜΗ εκδότη",
  "issuer_address": "διεύθυνση εκδότη",
  "issuer_city": "πόλη εκδότη",
  "issuer_postal": "ΤΚ εκδότη",
  "issuer_phone": "τηλέφωνο εκδότη",
  "issuer_email": "email εκδότη",
  "counterparty": "επωνυμία πελάτη",
  "trade_name": "διακριτικός τίτλος πελάτη",
  "afm": "ΑΦΜ πελάτη",
  "doy": "ΔΟΥ πελάτη",
  "address": "διεύθυνση πελάτη",
  "city": "πόλη πελάτη",
  "postal": "ΤΚ πελάτη",
  "phone": "τηλέφωνο πελάτη",
  "items": [{"code":"κωδικός","barcode":"barcode","description":"περιγραφή","quantity":0,"unit":"μονάδα","unit_price":0,"discount_pct":0,"discount_amt":0,"net_value":0,"vat_rate":0,"vat_amount":0,"total":0}],
  "subtotal": 0,
  "total_discount": 0,
  "vat_breakdown": [{"rate":0,"net":0,"vat":0}],
  "vat_rate": 0,
  "vat": 0,
  "total": 0,
  "rounding": 0,
  "payment_method": "τρόπος πληρωμής",
  "due_date": "YYYY-MM-DD",
  "bank": "τράπεζα",
  "iban": "IBAN",
  "purpose": "σκοπός",
  "delivery_address": "διεύθυνση παράδοσης",
  "notes": "σημειώσεις"
}

ΜΟΝΟ JSON.`
}
