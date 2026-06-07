export async function POST(request) {
  try {
    const { base64, mediaType } = await request.json()

    const isPDF = mediaType === 'application/pdf'

    // Build content array based on file type
    const content = isPDF ? [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 }
      },
      { type: 'text', text: getPrompt() }
    ] : [
      {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 }
      },
      { type: 'text', text: getPrompt() }
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
    const text = data.content?.map(b => b.text || '').join('') || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return Response.json({ success: true, data: parsed })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

function getPrompt() {
  return `Διάβασε αυτό το τιμολόγιο ΠΟΛΥ ΠΡΟΣΕΚΤΙΚΑ. Επέστρεψε ΜΟΝΟ JSON χωρίς backticks.

ΑΠΟΛΥΤΟΣ ΚΑΝΟΝΑΣ:
Η εταιρεία μου είναι: SMART AUTOMATION SOLUTIONS, ΑΦΜ 802802461

ΒΗΜΑ 1: Βρες ποιος ΕΚΔΙΔΕΙ το τιμολόγιο (ο πωλητής)
ΒΗΜΑ 2: Βρες ποιος είναι ο ΠΕΛΑΤΗΣ/ΑΓΟΡΑΣΤΗΣ

- "issuer_*" = ΠΑΝΤΑ ο εκδότης/πωλητής
- "counterparty" = ΠΑΝΤΑ ο πελάτης/αγοραστής
- ΑΝ counterparty έχει ΑΦΜ 802802461 → type = "expense"
- ΑΝ issuer έχει ΑΦΜ 802802461 → type = "income"

{
  "type": "income" ή "expense",
  "invoice_type": "ακριβές είδος παραστατικού",
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
  "items": [
    {
      "code": "κωδικός",
      "barcode": "barcode",
      "description": "περιγραφή",
      "quantity": αριθμός,
      "unit": "μονάδα",
      "unit_price": αριθμός,
      "discount_pct": αριθμός,
      "discount_amt": αριθμός,
      "net_value": αριθμός,
      "vat_rate": αριθμός,
      "vat_amount": αριθμός,
      "total": αριθμός
    }
  ],
  "subtotal": αριθμός,
  "total_discount": αριθμός,
  "vat_breakdown": [{"rate": αριθμός, "net": αριθμός, "vat": αριθμός}],
  "vat_rate": αριθμός,
  "vat": αριθμός,
  "total": αριθμός,
  "rounding": αριθμός,
  "payment_method": "τρόπος πληρωμής",
  "due_date": "YYYY-MM-DD",
  "bank": "τράπεζα",
  "iban": "IBAN",
  "purpose": "σκοπός",
  "delivery_address": "διεύθυνση παράδοσης",
  "notes": "σημειώσεις"
}

ΜΟΝΟ JSON, τίποτα άλλο.`
}
