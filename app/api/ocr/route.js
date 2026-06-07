export async function POST(request) {
  try {
    const { base64, mediaType } = await request.json()

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
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 }
            },
            {
              type: 'text',
              text: `Διάβασε αυτό το τιμολόγιο/παραστατικό ΠΟΛΥ ΠΡΟΣΕΚΤΙΚΑ και επέστρεψε ΜΟΝΟ JSON χωρίς backticks ή άλλο κείμενο. Εξαγωγή ΟΛΩΝ των πεδίων που υπάρχουν.

ΚΡΙΤΙΚΟΣ ΚΑΝΟΝΑΣ για type, issuer και counterparty:
- "issuer" = η εταιρεία που ΕΚΔΙΔΕΙ/ΚΟΒΕΙ το τιμολόγιο (αναγράφεται ως ΠΩΛΗΤΗΣ / ΕΚΔΟΤΗΣ / Επιχείρηση που τιμολογεί)
- "counterparty" = η εταιρεία που ΛΑΜΒΑΝΕΙ το τιμολόγιο (αναγράφεται ως ΑΓΟΡΑΣΤΗΣ / ΠΕΛΑΤΗΣ / Προς)
- Η εταιρεία του χρήστη έχει ΑΦΜ: 802802461 (SMART AUTOMATION SOLUTIONS)
- "type" = "expense" αν ο counterparty έχει ΑΦΜ 802802461 (εμείς αγοράζουμε)
- "type" = "income" αν ο issuer έχει ΑΦΜ 802802461 (εμείς πουλάμε)
- Αν δεν βρεις ΑΦΜ 802802461 πουθενά, κοίτα ποιος είναι ο ΑΓΟΡΑΣΤΗΣ/ΠΕΛΑΤΗΣ

{
  "type": "income" ή "expense",
  "invoice_type": "ακριβές είδος παραστατικού π.χ. Τιμολόγιο Πώλησης / Τιμολόγιο Αγοράς / Απόδειξη Λιανικής / Δελτίο Αποστολής / Τιμολόγιο-Δελτίο Αποστολής / Πιστωτικό Τιμολόγιο / Απόδειξη Παροχής Υπηρεσιών",
  "series": "σειρά παραστατικού π.χ. Α, Β, ΤΔΑ",
  "number": "αριθμός παραστατικού",
  "date": "YYYY-MM-DD",
  "time": "HH:MM ώρα έκδοσης αν υπάρχει",
  "mark": "ΜARK/αριθμός καταχώρησης myDATA αν υπάρχει",
  "uid": "UID παραστατικού αν υπάρχει",

  "issuer_name": "επωνυμία εκδότη",
  "issuer_trade_name": "διακριτικός τίτλος εκδότη",
  "issuer_afm": "ΑΦΜ εκδότη",
  "issuer_doy": "ΔΟΥ εκδότη",
  "issuer_gem": "ΓΕΜΗ εκδότη αν υπάρχει",
  "issuer_address": "οδός και αριθμός εκδότη",
  "issuer_city": "πόλη εκδότη",
  "issuer_postal": "ΤΚ εκδότη",
  "issuer_phone": "τηλέφωνο εκδότη",
  "issuer_email": "email εκδότη",

  "counterparty": "επωνυμία πελάτη/προμηθευτή",
  "trade_name": "διακριτικός τίτλος πελάτη/προμηθευτή",
  "afm": "ΑΦΜ αντισυμβαλλόμενου",
  "doy": "ΔΟΥ αντισυμβαλλόμενου",
  "address": "οδός και αριθμός αντισυμβαλλόμενου",
  "city": "πόλη αντισυμβαλλόμενου",
  "postal": "ΤΚ αντισυμβαλλόμενου",
  "phone": "τηλέφωνο αντισυμβαλλόμενου",

  "items": [
    {
      "code": "κωδικός προϊόντος/υπηρεσίας όπως αναγράφεται",
      "barcode": "barcode αν υπάρχει",
      "description": "πλήρης περιγραφή είδους",
      "quantity": αριθμός,
      "unit": "μονάδα μέτρησης τεμ/kg/lt/m/κιβ κλπ",
      "unit_price": αριθμός (τιμή μονάδας προ έκπτωσης),
      "discount_pct": αριθμός (ποσοστό έκπτωσης 0-100),
      "discount_amt": αριθμός (ποσό έκπτωσης),
      "net_value": αριθμός (καθαρή αξία γραμμής μετά έκπτωση),
      "vat_rate": αριθμός (συντελεστής ΦΠΑ π.χ. 24),
      "vat_amount": αριθμός (αξία ΦΠΑ γραμμής),
      "total": αριθμός (σύνολο γραμμής με ΦΠΑ)
    }
  ],

  "subtotal": αριθμός (σύνολο καθαρής αξίας),
  "total_discount": αριθμός (συνολικές εκπτώσεις),
  "vat_breakdown": [
    {"rate": αριθμός, "net": αριθμός, "vat": αριθμός}
  ],
  "vat_rate": αριθμός (κύριος συντελεστής),
  "vat": αριθμός (συνολικό ΦΠΑ),
  "total": αριθμός (γενικό σύνολο),
  "rounding": αριθμός (στρογγυλοποίηση αν υπάρχει),

  "payment_method": "Μετρητά / Πιστωτική κάρτα / Τραπεζική μεταφορά / Επιταγή / Επί πιστώσει",
  "due_date": "YYYY-MM-DD ημερομηνία λήξης",
  "bank": "τράπεζα αν αναγράφεται",
  "iban": "IBAN αν αναγράφεται",

  "purpose": "σκοπός συναλλαγής αν αναγράφεται",
  "delivery_address": "διεύθυνση παράδοσης αν διαφέρει",
  "notes": "παρατηρήσεις/σημειώσεις"
}

ΣΗΜΑΝΤΙΚΟ: Εξαγωγή ΟΛΩΝ των ειδών από τον πίνακα. Αν κάτι δεν υπάρχει βάλε null. ΜΟΝΟ JSON.`
            }
          ]
        }]
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
