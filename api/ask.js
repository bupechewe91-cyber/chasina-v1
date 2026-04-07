export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action, topic, subject, testQuestion, studentAnswer } = req.body;

  let prompt = '';

  if (action === 'explain') {
    prompt = `You are Chasina, a warm AI teacher.\nSubject: ${subject}\nTopic: ${topic}\n\nRespond in EXACTLY this format:\n\nEXPLANATION:\nOne clear sentence summary.\n1. Step one\n2. Step two\n3. Step three\nReal-world example: A short example.\n\nTEST_QUESTION:\nOne short question to test understanding.`;

  } else if (action === 'simplify') {
    prompt = `You are Chasina. Explain to a 12 year old.\nSubject: ${subject}\nTopic: ${topic}\n\nRespond in EXACTLY this format:\n\nEXPLANATION:\nSimple explanation in 4 sentences.\n\nTEST_QUESTION:\nOne very simple question.`;

  } else if (action === 'check') {
    prompt = `You are Chasina evaluating a student.\nTopic: ${topic}\nQuestion: ${testQuestion}\nStudent answer: ${studentAnswer}\n\nRespond in EXACTLY this format:\n\nRESULT: CORRECT\nor\nRESULT: PARTIAL\nor\nRESULT: INCORRECT\n\nFEEDBACK:\n2-3 kind sentences about their answer.`;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]) {
      return res.status(500).json({ error: 'No response from AI', details: data });
    }

    const text = data.candidates[0].content.parts[0].text;
    res.status(200).json({ answer: text });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
