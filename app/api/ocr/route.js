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
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 }
            },
            {
              type: 'text',
              text: `Διάβασε αυτό το τιμολόγιο/παραστατικό και επέστρεψε ΜΟΝΟ JSON χωρίς backticks:
{
  "type": "income" ή "expense",
  "number": "αριθμός παραστατικού",
  "date": "YYYY-MM-DD",
  "counterparty": "όνομα πελάτη ή προμηθευτή",
  "afm": "ΑΦΜ αντισυμβαλλόμενου",
  "items": [{"description": "περιγραφή είδους", "quantity": αριθμός, "unit_price": αριθμός, "total": αριθμός}],
  "subtotal": αριθμός,
  "vat_rate": αριθμός (π.χ. 24),
  "vat": αριθμός,
  "total": αριθμός,
  "payment_method": "μετρητά/τραπεζική μεταφορά/επιταγή/πίστωση",
  "notes": "σημειώσεις"
}
Αν δεν μπορείς να διαβάσεις κάτι βάλε null. Μόνο JSON τίποτα άλλο.`
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
