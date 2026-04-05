export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action, topic, subject, testQuestion, studentAnswer } = req.body;

  let prompt = '';

  if (action === 'explain') {
    prompt = `You are Chasina, a warm and encouraging AI teacher for students.
Subject: ${subject}
Topic: ${topic}

Respond in EXACTLY this format:

EXPLANATION:
[One clear sentence summary.]
[Numbered steps 1-5, simple words.]
Real-world example: [A short relatable example.]

TEST_QUESTION:
[One short question to test understanding.]`;

  } else if (action === 'simplify') {
    prompt = `You are Chasina, an AI teacher. The student did not understand.
Explain as if the student is 12 years old. Use simple words and a short analogy. Max 4 sentences.
Subject: ${subject}
Topic: ${topic}

Respond in EXACTLY this format:

EXPLANATION:
[Your simplified explanation.]

TEST_QUESTION:
[One very simple question.]`;

  } else if (action === 'check') {
    prompt = `You are Chasina, evaluating a student's answer. Be kind but honest.
Topic: ${topic}
Question: ${testQuestion}
Student answer: ${studentAnswer}

Respond in EXACTLY this format:

RESULT: CORRECT
or
RESULT: PARTIAL
or
RESULT: INCORRECT

FEEDBACK:
[2-3 sentences: what they got right, what they missed, correct answer if needed.]`;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    res.status(200).json({ answer: text });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
}