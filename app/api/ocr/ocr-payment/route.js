export async function POST(request) {
  try {
    const { base64, mediaType } = await request.json()
    const isPDF = mediaType === 'application/pdf'

    const content = isPDF ? [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
      { type: 'text', text: getPrompt() }
    ] : [
      { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: base64 } },
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
        max_tokens: 1000,
        messages: [{ role: 'user', content }]
      })
    })

    const data = await response.json()
    if (data.error) return Response.json({ success: false, error: data.error.message }, { status: 500 })

    const text = data.content?.map(b => b.text || '').join('') || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return Response.json({ success: true, data: parsed })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

function getPrompt() {
  return `Διάβασε αυτή την απόδειξη/βεβαίωση πληρωμής και επέστρεψε ΜΟΝΟ JSON:

Η εταιρεία μου: SMART AUTOMATION SOLUTIONS, ΑΦΜ 802802461
- type = "receipt" αν εισέπραξα εγώ (ο πελάτης πλήρωσε εμένα)
- type = "payment" αν πλήρωσα εγώ (εγώ πλήρωσα προμηθευτή)

{
  "type": "receipt" ή "payment",
  "date": "YYYY-MM-DD",
  "amount": αριθμός,
  "counterparty": "επωνυμία αντισυμβαλλόμενου",
  "afm": "ΑΦΜ αντισυμβαλλόμενου",
  "payment_method": "Μετρητά/Τραπεζική μεταφορά/Επιταγή/Κάρτα",
  "bank": "τράπεζα αν αναγράφεται",
  "reference": "αριθμός αναφοράς/επιταγής",
  "notes": "σημειώσεις"
}

ΜΟΝΟ JSON.`
}
