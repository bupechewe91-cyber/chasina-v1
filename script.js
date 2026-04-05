// ── App State ──────────────────────────────────────────────────────
const state = {
  topic: '',
  subject: '',
  explanation: '',
  testQuestion: '',
  sessionTopics: [],
  correctCount: 0
};

// ── Helpers ────────────────────────────────────────────────────────
function showOnly(id) {
  ['inputStage','explainStage','testStage','feedbackStage','summaryStage']
    .forEach(s => {
      document.getElementById(s).classList.toggle('hidden', s !== id);
    });
}

function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/^(\d+\.)/gm, '<br/><b>$1</b>')
    .replace(/\n/g, '<br/>');
}

function parseResponse(raw) {
  const parts = raw.split('TEST_QUESTION:');
  const explanation  = parts[0].replace('EXPLANATION:', '').trim();
  const testQuestion = parts[1] ? parts[1].trim() : '';
  return { explanation, testQuestion };
}

async function callAPI(payload) {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Server error ' + res.status);
  const data = await res.json();
  return data.answer;
}

// ── Streak ─────────────────────────────────────────────────────────
function updateStreak() {
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const last      = localStorage.getItem('chasina_last');
  let   streak    = parseInt(localStorage.getItem('chasina_streak') || '0');

  if (last === today) {
    // already studied today
  } else if (last === yesterday) {
    streak += 1;
  } else {
    streak = 1;
  }

  localStorage.setItem('chasina_streak', streak);
  localStorage.setItem('chasina_last', today);
  document.getElementById('streakCount').textContent = streak;
}

// ── Stage 1: Start Study ───────────────────────────────────────────
async function startStudy() {
  const topic   = document.getElementById('topicInput').value.trim();
  const subject = document.getElementById('subject').value;

  if (!topic) {
    document.getElementById('topicInput').placeholder = 'Please type a topic first!';
    return;
  }

  const btn = document.getElementById('studyBtn');
  btn.disabled    = true;
  btn.textContent = 'Thinking...';

  state.topic   = topic;
  state.subject = subject;

  try {
    const raw = await callAPI({ action: 'explain', topic, subject });
    const { explanation, testQuestion } = parseResponse(raw);

    state.explanation  = explanation;
    state.testQuestion = testQuestion;

    document.getElementById('explanationText').innerHTML = formatText(explanation);
    showOnly('explainStage');
    updateStreak();

  } catch (err) {
    alert('Something went wrong. Please try again.');
    console.error(err);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Study This';
  }
}

// ── Stage 2: Simplify ──────────────────────────────────────────────
async function simplify() {
  const btn = document.querySelector('.btn-secondary');
  btn.disabled    = true;
  btn.textContent = 'Simplifying...';

  try {
    const raw = await callAPI({
      action: 'simplify',
      topic: state.topic,
      subject: state.subject
    });
    const { explanation, testQuestion } = parseResponse(raw);
    state.explanation  = explanation;
    state.testQuestion = testQuestion;
    document.getElementById('explanationText').innerHTML = formatText(explanation);
  } catch (err) {
    alert('Something went wrong. Please try again.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Simplify this';
  }
}

// ── Stage 3: Proceed to Test ───────────────────────────────────────
function proceedToTest() {
  document.getElementById('testQuestionText').textContent = state.testQuestion;
  document.getElementById('studentAnswer').value = '';
  showOnly('testStage');
}

// ── Stage 3: Check Answer ──────────────────────────────────────────
async function checkAnswer() {
  const studentAnswer = document.getElementById('studentAnswer').value.trim();
  if (!studentAnswer) return;

  const btn = document.querySelector('#testStage .btn-primary');
  btn.disabled    = true;
  btn.textContent = 'Checking...';

  try {
    const raw = await callAPI({
      action: 'check',
      topic: state.topic,
      testQuestion: state.testQuestion,
      studentAnswer
    });

    let cls   = 'incorrect';
    let label = 'Incorrect';

    if (raw.includes('RESULT: CORRECT')) {
      cls   = 'correct';
      label = 'Correct!';
      state.correctCount++;
    } else if (raw.includes('RESULT: PARTIAL')) {
      cls   = 'partial';
      label = 'Partially correct';
    }

    const feedback = raw
      .replace(/RESULT:.*/, '')
      .replace('FEEDBACK:', '')
      .trim();

    const badge       = document.getElementById('resultBadge');
    badge.textContent = label;
    badge.className   = 'result-badge ' + cls;

    document.getElementById('feedbackText').innerHTML = formatText(feedback);
    showOnly('feedbackStage');
    updateStats();

  } catch (err) {
    alert('Something went wrong. Please try again.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Submit Answer';
  }
}

// ── Stage 4: Confidence Rating ─────────────────────────────────────
function rateConfidence(rating) {
  state.sessionTopics.push({
    topic: state.topic,
    subject: state.subject,
    confidence: rating
  });
  addTopicCard(state.topic, state.subject, rating);
  showSummary(rating);
}

// ── Sidebar ────────────────────────────────────────────────────────
function addTopicCard(topic, subject, confidence) {
  const list = document.getElementById('topicList');
  const card = document.createElement('div');
  card.className = 'topic-card ' + confidence;
  card.innerHTML =
    '<div class="t-name">'    + topic   + '</div>' +
    '<div class="t-subject">' + subject + '</div>';
  list.appendChild(card);
}

function updateStats() {
  const total = state.sessionTopics.length;
  document.getElementById('topicCount').textContent =
    total + ' topic' + (total !== 1 ? 's' : '');
  document.getElementById('correctCount').textContent =
    state.correctCount + ' correct';
}

// ── Stage 5: Summary ───────────────────────────────────────────────
function showSummary(rating) {
  const reviewTopics = state.sessionTopics
    .filter(t => t.confidence === 'lost' || t.confidence === 'sort-of')
    .map(t => t.topic);

  const total   = state.sessionTopics.length;
  const correct = state.correctCount;

  let html =
    '<b>Topic complete:</b> ' + state.topic + '<br/><br/>' +
    '<b>Session so far:</b> ' + total + ' topic' +
    (total !== 1 ? 's' : '') + ' studied, ' + correct + ' answered correctly.<br/>';

  if (rating === 'got-it') {
    html += '<br/>Great work! You understood that one.';
  } else if (rating === 'sort-of') {
    html += '<br/>Come back to this one tomorrow. Reviewing it again will lock it in.';
  } else {
    html += '<br/>This one needs more time. Try studying it from a different angle.';
  }

  if (reviewTopics.length > 0) {
    html += '<br/><br/><b>Review tomorrow:</b> ' + reviewTopics.join(', ');
    const reminder = document.getElementById('reviewReminder');
    reminder.innerHTML = 'Review tomorrow:<br/>' + reviewTopics.join('<br/>');
    reminder.classList.remove('hidden');
  }

  document.getElementById('summaryText').innerHTML = html;
  updateStats();
  showOnly('summaryStage');
}

// ── Reset ──────────────────────────────────────────────────────────
function studyAnother() {
  document.getElementById('topicInput').value = '';
  state.topic        = '';
  state.explanation  = '';
  state.testQuestion = '';
  showOnly('inputStage');
}

// ── Init ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const streak = parseInt(localStorage.getItem('chasina_streak') || '0');
  document.getElementById('streakCount').textContent = streak;
});