import React, { useMemo, useRef, useState } from "react";

const QUICK_PROMPTS = [
  "Explain attendance",
  "How marks are shown",
  "Where is timetable",
  "How to submit assignments",
  "Give me a study plan"
];

const INTENT_CATALOG = [
  {
    key: "smallTalk",
    keywords: ["hi", "hello", "hey", "yo", "hmm", "ok", "okay", "thanks", "thank you", "chatty"],
    responses: [
      "Hey! I’m here. Ask me about marks, attendance, timetable, assignments, resources, or study plan.",
      "Sure — ask in any style. I can explain your student sections in simple words.",
      "No problem. Tell me what you need help with: marks, attendance, timetable, or assignments."
    ],
    followUp: "You can ask casually too, like 'chatty marks' or 'hey attendance'."
  },
  {
    key: "attendance",
    keywords: ["attendance", "present", "absent", "leave", "shortage", "attend", "attdn"],
    responses: [
      "Attendance shows your present percentage by subject. Keep each subject above your safe target to avoid shortage issues.",
      "Open Attendance to see subject-wise percentage. Improve low subjects first by attending regularly this week.",
      "If one subject is low, prioritize attending those classes first to stabilize your overall attendance."
    ],
    followUp: "For attendance, check subjects with low percentage first and improve consistency in those classes this week."
  },
  {
    key: "marks",
    keywords: ["mark", "marks", "mrks", "markss", "grade", "score", "scorecard", "gpa", "result", "exam"],
    responses: [
      "Marks shows subject-wise scores. Focus first on subjects where your trend is lower than others.",
      "Use Marks to track progress after each test and identify which subject needs extra revision.",
      "Compare recent scores by subject and set weekly revision goals for weaker ones."
    ],
    followUp: "For marks improvement: revise weak chapters, solve one practice set daily, and check progress in Marks after each test."
  },
  {
    key: "timetable",
    keywords: ["timetable", "schedule", "period", "class", "timing", "time table", "routine"],
    responses: [
      "Timetable gives your weekly classes. Use Today Flow when you want a simple Now/Next view for the current day.",
      "Weekly class timing is in Timetable, while Today Flow helps you focus only on what is next now.",
      "Use Timetable for planning and Today Flow for execution during the day."
    ],
    followUp: "If your day feels heavy, open Today Flow and focus only on the current class and immediate next class."
  },
  {
    key: "assignments",
    keywords: ["assignment", "homework", "submit", "submission", "deadline", "pending", "hw"],
    responses: [
      "Assignments helps you track pending work and due dates. Complete urgent deadlines first.",
      "Check Assignments daily and finish tasks in deadline order to avoid last-minute pressure.",
      "Split each assignment into small steps and complete one step per session."
    ],
    followUp: "For assignments: split each task into small steps and finish one step per study session to avoid deadline pressure."
  },
  {
    key: "resources",
    keywords: ["resource", "resources", "note", "notes", "material", "pdf", "file"],
    responses: [
      "Resources contains files shared by teachers. Save important ones and revise from them before tests.",
      "Use Resources as your single place for notes and reference files by subject.",
      "Before exams, start revision with teacher-provided resources for reliable coverage."
    ],
    followUp: "Pick one resource per weak subject and revise it fully before moving to the next file."
  },
  {
    key: "messages",
    keywords: ["message", "messages", "notification", "notify", "announce", "announcement", "update"],
    responses: [
      "Messages contains teacher/school updates. Notification bell on top shows quick recent alerts.",
      "Use Messages for full communication history and bell notifications for quick checks.",
      "If you miss updates, check Messages first to catch up on announcements."
    ],
    followUp: "Open messages once daily so you do not miss class updates or new instructions."
  },
  {
    key: "profile",
    keywords: ["profile", "account", "details", "personal", "info", "information"],
    responses: [
      "Profile shows your basic details and performance summary. Keep your contact info updated there.",
      "Use Profile to verify your personal information and quick academic summary.",
      "If any detail is outdated, update it in Profile to keep records accurate."
    ],
    followUp: "Keep profile details current so communication and records stay accurate."
  },
  {
    key: "flow",
    keywords: ["flow", "today flow", "task flow", "course journey", "journey", "task"],
    responses: [
      "Flow Centric has three views: Today Flow for class sequence, Task Flow for work progression, and Course Journey for learning progress.",
      "Use Today Flow for current classes, Task Flow for pending work, and Course Journey for long-term tracking.",
      "Flow views help you plan less and execute more by showing what to do next."
    ],
    followUp: "If you feel stuck, start from Today Flow first, then move to Task Flow for pending work."
  },
  {
    key: "studyPlan",
    keywords: ["study plan", "plan", "routine", "how to study", "revision", "prepare"],
    responses: [
      "Simple study plan: 40 mins weak subject + 10 mins break + 40 mins assignment + 20 mins quick revision.",
      "Try a daily loop: check timetable, complete one urgent assignment step, revise one weak chapter, then review messages.",
      "For exams: morning concept revision, evening practice questions, night recap of mistakes."
    ],
    followUp: "If you tell me your weak subject, I can suggest a focused 3-day mini plan."
  }
];

function pickResponse(intent, message) {
  const index = (message.length + intent.key.length) % intent.responses.length;
  return intent.responses[index];
}

const SUGGESTED_BY_TOPIC = {
  attendance: ["How to improve low attendance?", "What is safe attendance target?", "How to recover missed classes?"],
  marks: ["How to improve maths marks?", "How to track score progress?", "How to prepare for next exam?"],
  timetable: ["How to plan my day from timetable?", "How to use Today Flow better?", "How to manage back-to-back classes?"],
  assignments: ["How to finish assignments faster?", "How to prioritize deadlines?", "How to avoid late submission?"],
  resources: ["How to revise from resources?", "Which files should I read first?", "How to organize subject notes?"],
  messages: ["How often should I check messages?", "How to not miss announcements?", "Where can I see old updates?"],
  profile: ["What should I update in profile?", "Can profile affect dashboard data?", "How to keep details accurate?"],
  flow: ["How to use Task Flow daily?", "When should I use Course Journey?", "How to focus with Today Flow?"],
  studyPlan: ["Make a 3-day revision plan", "Give me a pre-exam routine", "How to study weak subjects first?"]
};

const DEFAULT_SUGGESTIONS = ["Give me a study plan", "How to improve attendance?", "How to improve marks?"];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(first, second) {
  const rows = first.length + 1;
  const cols = second.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = first[row - 1] === second[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[first.length][second.length];
}

function keywordMatches(tokens, keyword) {
  if (!keyword) return false;
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return false;

  return tokens.some((token) => {
    if (!token) return false;
    if (token === normalizedKeyword) return true;
    if (token.includes(normalizedKeyword) || normalizedKeyword.includes(token)) {
      return token.length >= 3 || normalizedKeyword.length >= 3;
    }
    if (token.length >= 4 && normalizedKeyword.length >= 4) {
      return levenshteinDistance(token, normalizedKeyword) <= 1;
    }
    return false;
  });
}

function detectIntent(message) {
  const normalized = normalizeText(message);
  const tokens = normalized.split(" ").filter(Boolean);
  const ranked = INTENT_CATALOG.map((intent) => {
    const score = intent.keywords.reduce(
      (sum, keyword) => (keywordMatches(tokens, keyword) ? sum + 1 : sum),
      0
    );
    return { intent, score };
  }).filter((item) => item.score > 0);

  if (!ranked.length) return null;
  ranked.sort((first, second) => second.score - first.score);
  return ranked[0].intent;
}

export default function StudentChatbot({
  open,
  onClose,
  studentName,
  activeSection
}) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [lastTopic, setLastTopic] = useState(null);
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      text: `Hi${studentName ? ` ${studentName}` : ""}! I can explain your dashboard sections in simple words.`
    }
  ]);
  const requestInFlight = useRef(false);

  const canSend = draft.trim().length > 0;

  const title = useMemo(() => "Student Help Bot", []);
  const suggestionPrompts = useMemo(() => {
    if (lastTopic && SUGGESTED_BY_TOPIC[lastTopic]) {
      return SUGGESTED_BY_TOPIC[lastTopic];
    }
    return DEFAULT_SUGGESTIONS;
  }, [lastTopic]);

  const getLocalReply = (inputText) => {
    const message = normalizeText(inputText);
    const matchedIntent = detectIntent(message);

    if (matchedIntent) {
      setLastTopic(matchedIntent.key);
      return pickResponse(matchedIntent, message);
    }

    if (lastTopic) {
      const lastIntent = INTENT_CATALOG.find((intent) => intent.key === lastTopic);
      if (lastIntent?.followUp) {
        return lastIntent.followUp;
      }
    }

    if (activeSection) {
      return `You are currently in ${activeSection}. Ask me about attendance, marks, timetable, assignments, resources, messages, profile, or flow.`;
    }

    return "Ask me about attendance, marks, timetable, assignments, resources, messages, profile, or flow. I’ll explain clearly.";
  };

  const sendMessage = async (rawText) => {
    const text = (rawText ?? draft).trim();
    if (!text || pending || requestInFlight.current) return;

    const nextMessages = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setDraft("");
    setPending(true);
    requestInFlight.current = true;

    try {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const reply = getLocalReply(text);
      setMessages((prev) => {
        const updated = [...prev, { role: "assistant", text: reply }];
        if (updated.length > 240) {
          return [updated[0], ...updated.slice(updated.length - 239)];
        }
        return updated;
      });
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "I couldn't process that. Please try asking in a different way." }
      ]);
    } finally {
      setPending(false);
      requestInFlight.current = false;
    }
  };

  if (!open) return null;

  return (
    <div className="student-chatbot-overlay" role="dialog" aria-label={title}>
      <div className="student-chatbot-panel">
        <div className="student-chatbot-head">
          <div>
            <h4>{title}</h4>
            <p>Ask anything about your dashboard, progress, or next steps.</p>
          </div>
          <div className="student-chatbot-head-actions">
            <button
              type="button"
              onClick={() =>
                {
                  setMessages([
                    {
                      role: "assistant",
                      text: `Hi${studentName ? ` ${studentName}` : ""}! I can explain your dashboard sections in simple words.`
                    }
                  ]);
                  setLastTopic(null);
                }
              }
              aria-label="Clear chat"
            >
              Clear
            </button>
            <button type="button" onClick={onClose} aria-label="Close chatbot">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="student-chatbot-messages">
          {messages.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`student-chat-msg ${item.role === "user" ? "is-user" : "is-bot"}`}>
              {item.text}
            </div>
          ))}
          {pending && <div className="student-chat-msg is-bot">Thinking...</div>}
        </div>

        <div className="student-chatbot-quick">
          {QUICK_PROMPTS.map((prompt) => (
            <button key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={pending}>
              {prompt}
            </button>
          ))}
        </div>

        <div className="student-chatbot-suggest">
          <span>Suggested follow-ups:</span>
          <div className="student-chatbot-suggest-list">
            {suggestionPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={pending}>
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="student-chatbot-input-row">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask for explanation, plan, or suggestion..."
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
              }
            }}
          />
          <button type="button" disabled={!canSend || pending} onClick={() => sendMessage()}>
            {pending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}