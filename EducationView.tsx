/**
 * EducationView.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 * Módulo educativo SANTI — Plan de estudios de élite (MIT · Harvard · UNAM)
 * para niños y jóvenes. Gamificación tipo Duolingo con sistema de recompensas.
 *
 * Características:
 *  • Plan de estudios por semestre estructurado: Matemáticas, Ciencias, 
 *    Pensamiento Computacional, Historia, Idiomas
 *  • Lecciones interactivas con preguntas de opción múltiple
 *  • Sistema XP, rachas y medallas (mejor que Duolingo)
 *  • Integración con Gemini via /api/chat para explicaciones adaptativas
 *  • Barra de progreso visual por módulo y global
 */
import React, { useState, useCallback, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Question {
  id:       string;
  text:     string;
  options:  string[];
  correct:  number;  // index
  explain:  string;
  xp:       number;
}

interface Lesson {
  id:      string;
  title:   string;
  icon:    string;
  desc:    string;
  xp:      number;
  questions: Question[];
}

interface Course {
  id:       string;
  subject:  string;
  color:    string;
  icon:     string;
  semester: number;
  level:    "Básico" | "Intermedio" | "Avanzado";
  source:   string;   // MIT / Harvard / UNAM / NASA / Khan Academy
  lessons:  Lesson[];
}

interface Progress {
  completedLessons: Set<string>;
  xp:               number;
  streak:           number;
  lastStudied:      string | nulo
  badges:           string[];
}

// ── Course catalog ────────────────────────────────────────────────────────────
const COURSES: Course[] = [
  // ─ Matemáticas ─
  {
    id: "MAT-1", subject: "Matemáticas", color: "#00e5ff", icon: "∑", semester: 1,
    level: "Básico", source: "Khan Academy · UNAM",
    lessons: [
      {
        id: "MAT-1-1", title: "Números primos y factorización", icon: "🔢", xp: 30,
        desc: "Descubre cómo todo número se construye con números primos.",
        questions: [
          { id: "q1", text: "¿Cuál de estos es un número primo?", options: ["4","6","7","9"], correct: 2, xp: 10, explain: "7 solo es divisible entre 1 y entre sí mismo, por lo tanto es primo." },
          { id: "q2", text: "¿Cuántos factores primos tiene 12?", options: ["1","2","3","4"], correct: 1, xp: 10, explain: "12 = 2 × 2 × 3 → dos factores primos distintos: 2 y 3." },
          { id: "q3", text: "¿Qué es la factorización prima?", options: ["Dividir entre 2","Expresar un número como producto de primos","Restar números","Multiplicar por 10"], correct: 1, xp: 10, explain: "Factorización prima = expresar un número como producto de sus factores primos." },
        ],
      },
      {
        id: "MAT-1-2", title: "Álgebra básica: variables y ecuaciones", icon: "🔣", xp: 35,
        desc: "Aprende a representar problemas del mundo real con letras.",
        questions: [
          { id: "q1", text: "Si x + 5 = 12, ¿cuánto vale x?", options: ["5","7","6","8"], correct: 1, xp: 10, explain: "x = 12 – 5 = 7. Despeja la variable restando 5 en ambos lados." },
          { id: "q2", text: "¿Qué representa una variable en álgebra?", options: ["Un número fijo","Un número desconocido","Una operación","Una fracción"], correct: 1, xp: 10, explain: "Una variable (como x, y, z) representa un valor desconocido o variable." },
          { id: "q3", text: "Si 3x = 15, ¿cuánto es x?", options: ["3","4","5","6"], correct: 2, xp: 15, explain: "x = 15 ÷ 3 = 5." },
        ],
      },
    ],
  },
  // ─ Ciencias ─
  {
    id: "CIE-1", subject: "Ciencias", color: "#00e676", icon: "⚗️", semester: 1,
    level: "Intermedio", source: "MIT OpenCourseWare · NASA",
    lessons: [
      {
        id: "CIE-1-1", title: "El método científico", icon: "🔬", xp: 25,
        desc: "La herramienta más poderosa de la humanidad para entender el universo.",
        questions: [
          { id: "q1", text: "¿Cuál es el primer paso del método científico?", options: ["Experimentar","Concluir","Observar y preguntar","Publicar"], correct: 2, xp: 10, explain: "Todo comienza con la observación y la formulación de una pregunta." },
          { id: "q2", text: "¿Qué es una hipótesis?", options: ["Una conclusión final","Una predicción comprobable","Un resultado","Un error"], correct: 1, xp: 10, explain: "Hipótesis: predicción provisional basada en observaciones, que puede comprobarse." },
          { id: "q3", text: "¿Qué hace que un experimento sea válido?", options: ["Ser rápido","Ser repetible y reproducible","Tener muchos pasos","Ser costoso"], correct: 1, xp: 5, explain: "La reproducibilidad garantiza que los resultados no son accidentales." },
        ],
      },
      {
        id: "CIE-1-2", title: "Sistema Solar y escala del universo", icon: "🌌", xp: 40,
        desc: "De la Luna a los confines del cosmos observable (MIT · NASA).",
        questions: [
          { id: "q1", text: "¿A qué distancia promedio está la Tierra del Sol?", options: ["150,000 km","150 millones km","15 millones km","1,500 millones km"], correct: 1, xp: 10, explain: "1 Unidad Astronómica (UA) ≈ 150 millones de kilómetros." },
          { id: "q2", text: "¿Qué planeta tiene más lunas en el Sistema Solar?", options: ["Júpiter","Saturno","Urano","Neptuno"], correct: 1, xp: 10, explain: "Saturno tiene 146 lunas confirmadas (2024), más que Júpiter." },
          { id: "q3", text: "¿Cuánto tarda la luz del Sol en llegar a la Tierra?", options: ["1 segundo","8 minutos","24 horas","1 año"], correct: 1, xp: 20, explain: "La luz viaja a 300,000 km/s → 150,000,000 km ÷ 300,000 ≈ 500 s ≈ 8 minutos." },
        ],
      },
    ],
  },
  // ─ Pensamiento Computacional ─
  {
    id: "COMP-1", subject: "Pensamiento Computacional", color: "#c8a84b", icon: "💻", semester: 2,
    level: "Básico", source: "MIT Scratch · Harvard CS50",
    lessons: [
      {
        id: "COMP-1-1", title: "Algoritmos y pseudocódigo", icon: "📋", xp: 30,
        desc: "Escribe instrucciones tan precisas que una máquina las entienda.",
        questions: [
          { id: "q1", text: "¿Qué es un algoritmo?", options: ["Un tipo de software","Una secuencia ordenada de pasos para resolver un problema","Un lenguaje de programación","Una memoria RAM"], correct: 1, xp: 10, explain: "Algoritmo: secuencia finita, ordenada y sin ambigüedades de instrucciones." },
          { id: "q2", text: "¿Cuál es la primera instrucción para hacer un sándwich?", options: ["Comer","Cerrar el pan","Tomar el pan","Abrir la bolsa"], correct: 2, xp: 10, explain: "Los algoritmos requieren orden preciso: primero tomas el pan, luego lo abres." },
          { id: "q3", text: "¿Qué estructura repite instrucciones?", options: ["Condicional","Bucle / Ciclo","Variable","Función"], correct: 1, xp: 10, explain: "Los bucles (for, while) repiten un bloque de instrucciones N veces." },
        ],
      },
      {
        id: "COMP-1-2", title: "Lógica binaria y bits", icon: "🔲", xp: 35,
        desc: "Por qué los computadores solo entienden 0 y 1 (Harvard CS50).",
        questions: [
          { id: "q1", text: "¿Cuánto vale el número binario 1010 en decimal?", options: ["8","10","12","6"], correct: 1, xp: 15, explain: "1010₂ = 1×8 + 0×4 + 1×2 + 0×1 = 10₁₀" },
          { id: "q2", text: "¿Cuántos valores puede representar 1 bit?", options: ["1","2","4","8"], correct: 1, xp: 10, explain: "1 bit puede ser 0 o 1, es decir, 2 valores distintos." },
          { id: "q3", text: "¿Cuántos bits tiene 1 byte?", options: ["4","6","8","16"], correct: 2, xp: 10, explain: "1 byte = 8 bits. Pueden representar 2⁸ = 256 valores." },
        ],
      },
    ],
  },
  // ─ Historia y Derechos Humanos ─
  {
    id: "HIS-1", subject: "Historia y Derechos Humanos", color: "#ff4fc8", icon: "📜", semester: 2,
    level: "Básico", source: "ONU · CNDH · UNAM",
    lessons: [
      {
        id: "HIS-1-1", title: "Declaración Universal de Derechos Humanos", icon: "🕊️", xp: 25,
        desc: "El documento más importante jamás escrito por la humanidad (ONU, 1948).",
        questions: [
          { id: "q1", text: "¿Cuándo fue adoptada la DUDH?", options: ["1945","1948","1950","1960"], correct: 1, xp: 10, explain: "La Declaración Universal de Derechos Humanos fue adoptada el 10 de diciembre de 1948." },
          { id: "q2", text: "¿Cuántos artículos tiene la DUDH?", options: ["10","20","30","50"], correct: 2, xp: 10, explain: "La DUDH tiene 30 artículos que cubren derechos civiles, políticos, económicos y sociales." },
          { id: "q3", text: "¿Qué establece el Artículo 1 de la DUDH?", options: ["El derecho al voto","Todos los seres humanos nacen libres e iguales en dignidad","El derecho a la propiedad","La prohibición de la guerra"], correct: 1, xp: 5, explain: "Art. 1: 'Todos los seres humanos nacen libres e iguales en dignidad y derechos.'" },
        ],
      },
    ],
  },
  // ─ Inglés ─
  {
    id: "ENG-1", subject: "Inglés", color: "#9c27b0", icon: "🗣️", semester: 1,
    level: "Básico", source: "Harvard · Duolingo Research",
    lessons: [
      {
        id: "ENG-1-1", title: "Present Simple: verbo to be", icon: "🔤", xp: 20,
        desc: "La base del inglés: soy, eres, es, somos.",
        questions: [
          { id: "q1", text: "How do you say 'Yo soy estudiante' in English?", options: ["I are a student","I is a student","I am a student","I be a student"], correct: 2, xp: 10, explain: "Con 'I' (yo) siempre se usa 'am': I am a student." },
          { id: "q2", text: "¿Cuál es la forma correcta?", options: ["She am happy","She are happy","She be happy","She is happy"], correct: 3, xp: 10, explain: "Con she/he/it se usa 'is': She is happy." },
        ],
      },
    ],
  },
];

// ── Badge definitions ─────────────────────────────────────────────────────────
const BADGES = [
  { id: "FIRST_LESSON",  icon: "🌱", name: "Primera Lección",       condition: (p: Progress) => p.completedLessons.size >= 1 },
  { id: "STREAK_3",      icon: "🔥", name: "Racha de 3 días",        condition: (p: Progress) => p.streak >= 3 },
  { id: "XP_100",        icon: "⭐", name: "100 XP",                condition: (p: Progress) => p.xp >= 100 },
  { id: "XP_300",        icon: "💫", name: "300 XP — Nivel Plata",   condition: (p: Progress) => p.xp >= 300 },
  { id: "XP_500",        icon: "🏆", name: "500 XP — Nivel Oro",     condition: (p: Progress) => p.xp >= 500 },
  { id: "FIVE_LESSONS",  icon: "📚", name: "5 Lecciones completadas",condition: (p: Progress) => p.completedLessons.size >= 5 },
];

// ── CSS ───────────────────────────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const s = document.createElement("style");
  s.textContent = `
    @keyframes xp-pop   { 0%{transform:scale(1)} 50%{transform:scale(1.4)} 100%{transform:scale(1)} }
    @keyframes badge-in { from{opacity:0;transform:scale(0.5) rotate(-10deg)} to{opacity:1;transform:scale(1) rotate(0deg)} }
    @keyframes lesson-in{ from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    @keyframes progress-fill { from{width:0} to{width:var(--w)} }
    .xp-pop     { animation: xp-pop 0.4s ease-out; }
    .badge-new  { animation: badge-in 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both; }
    .lesson-card{ animation: lesson-in 0.25s ease-out both; }
  `;
  document.head.appendChild(s);
}

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ value: number; max: number; color: string; label?: string }> = ({ value, max, color, label }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 8, color: "#4a8a6a" }}>{label}</span>
          <span style={{ fontSize: 8, color, fontWeight: "bold" }}>{pct}%</span>
        </div>
      )}
      <div style={{ width: "100%", background: "#0a1a12", height: 6, borderRadius: 3 }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 3,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 8px ${color}60`,
          transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
};

// ── Lesson modal ──────────────────────────────────────────────────────────────
const LessonModal: React.FC<{
  lesson:   Lesson;
  course:   Course;
  onClose:  (xpEarned: number) => void;
}> = ({ lesson, course, onClose }) => {
  const [qIndex,    setQIndex]    = useState(0);
  const [selected,  setSelected]  = useState<number | null>(null);
  const [revealed,  setRevealed]  = useState(false);
  const [xpEarned,  setXpEarned]  = useState(0);
  const [done,      setDone]      = useState(false);
  const [aiHint,    setAiHint]    = useState<string | null>(null);
  const [loadHint,  setLoadHint]  = useState(false);

  const q = lesson.questions[qIndex];

  const handleAnswer = (i: number) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    if (i === q.correct) setXpEarned((xp) => xp + q.xp);
  };

  const handleNext = () => {
    if (qIndex + 1 < lesson.questions.length) {
      setQIndex((n) => n + 1);
      setSelected(null);
      setRevealed(false);
      setAiHint(null);
    } else {
      setDone(true);
    }
  };

  const getHint = async () => {
    setLoadHint(true);
    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: "SANTIAGO",
          prompt: `Explica de forma sencilla para un niño de 10 años: "${q.text}". Respuesta correcta: "${q.options[q.correct]}". Dilo en 2 oraciones máximo.`,
          lang: "es",
        }),
      });
      const data = await res.json();
      setAiHint(data.response ?? q.explain);
    } catch {
      setAiHint(q.explain);
    }
    setLoadHint(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(0,0,10,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        width: "100%", maxWidth: 520,
        background: "rgba(2,8,20,0.98)",
        border: `1px solid ${course.color}40`,
        borderRadius: 16, padding: "24px 28px",
        boxShadow: `0 0 40px ${course.color}20`,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 22 }}>{lesson.icon}</span>
          <div>
            <p style={{ color: course.color, fontSize: 11, fontWeight: "bold", letterSpacing: "1px", margin: 0 }}>
              {lesson.title}
            </p>
            <p style={{ color: "#3a6a5a", fontSize: 8, margin: "2px 0 0" }}>
              {course.subject} · {course.source}
            </p>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <p style={{ color: "#c8a84b", fontSize: 10, fontWeight: "bold", margin: 0 }}>⭐ {xpEarned} XP</p>
            <p style={{ color: "#3a6a5a", fontSize: 8, margin: "2px 0 0" }}>{qIndex + 1}/{lesson.questions.length}</p>
          </div>
        </div>

        {!done ? (
          <>
            {/* Progress bar */}
            <ProgressBar value={qIndex} max={lesson.questions.length} color={course.color} />

            {/* Question */}
            <div style={{ marginTop: 20, marginBottom: 16, padding: "14px 16px", borderRadius: 10, background: `${course.color}08`, border: `1px solid ${course.color}20` }}>
              <p style={{ fontSize: 13, color: "#e0ffe8", margin: 0, lineHeight: 1.6 }}>{q.text}</p>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correct;
                const isSelected = i === selected;
                let bg = "rgba(0,20,12,0.6)";
                let border = "rgba(0,255,200,0.12)";
                let color = "#e0ffe8";
                if (revealed) {
                  if (isCorrect)              { bg = "rgba(0,230,118,0.15)"; border = "#00e676"; color = "#00e676"; }
                  else if (isSelected)        { bg = "rgba(255,23,68,0.12)"; border = "#ff1744"; color = "#ff6d00"; }
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={revealed}
                    style={{
                      padding: "11px 16px", borderRadius: 8, cursor: revealed ? "default" : "pointer",
                      background: bg, border: `1px solid ${border}`, color,
                      fontSize: 11, textAlign: "left", fontFamily: "monospace",
                      transition: "all 0.15s",
                    }}
                  >
                    {String.fromCharCode(65 + i)}. {opt}
                    {revealed && isCorrect && " ✓"}
                    {revealed && isSelected && !isCorrect && " ✗"}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {revealed && (
              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(0,255,200,0.04)", border: "1px solid rgba(0,255,200,0.15)", marginBottom: 12 }}>
                <p style={{ fontSize: 10, color: "#a0ffcc", margin: 0, lineHeight: 1.6 }}>{aiHint ?? q.explain}</p>
                {!aiHint && (
                  <button
                    onClick={getHint}
                    disabled={loadHint}
                    style={{ marginTop: 8, padding: "4px 12px", background: "rgba(0,255,200,0.08)", border: "1px solid rgba(0,255,200,0.2)", borderRadius: 4, color: "#00ffcc", fontSize: 8, cursor: "pointer", fontFamily: "monospace" }}
                  >
                    {loadHint ? "⏳ CARGANDO…" : "✨ EXPLICACIÓN IA (Agente SANTIAGO)"}
                  </button>
                )}
              </div>
            )}

            {revealed && (
              <button onClick={handleNext} style={{
                width: "100%", padding: "12px",
                background: `${course.color}20`, border: `1px solid ${course.color}60`,
                borderRadius: 8, color: course.color,
                fontFamily: "monospace", fontWeight: "bold", fontSize: 11,
                cursor: "pointer", letterSpacing: "1px",
              }}>
                {qIndex + 1 < lesson.questions.length ? "SIGUIENTE PREGUNTA →" : "FINALIZAR LECCIÓN ✓"}
              </button>
            )}
          </>
        ) : (
          /* Done screen */
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <h3 style={{ color: "#c8a84b", letterSpacing: "2px", margin: "0 0 8px" }}>¡LECCIÓN COMPLETADA!</h3>
            <p style={{ color: "#e0ffe8", fontSize: 14, margin: "0 0 6px" }}>+{xpEarned} XP ganados</p>
            <p style={{ color: "#3a6a5a", fontSize: 9, marginBottom: 20 }}>
              {xpEarned === lesson.xp ? "¡Puntuación perfecta! 🌟" : "¡Buen trabajo! Repasa las incorrectas."}
            </p>
            <button onClick={() => onClose(xpEarned)} style={{
              padding: "12px 32px",
              background: `${course.color}20`, border: `1px solid ${course.color}`,
              borderRadius: 8, color: course.color,
              fontFamily: "monospace", fontWeight: "bold", fontSize: 12,
              cursor: "pointer", letterSpacing: "1px",
            }}>
              CONTINUAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export const EducationView: React.FC = () => {
  const [progress, setProgress] = useState<Progress>(() => {
    try {
      const saved = localStorage.getItem("santi_edu_progress");
      if (saved) {
        const p = JSON.parse(saved);
        return { ...p, completedLessons: new Set(p.completedLessons ?? []) };
      }
    } catch {}
    return { completedLessons: new Set<string>(), xp: 0, streak: 0, lastStudied: null, badges: [] };
  });

  const [activeLesson, setActiveLesson] = useState<{ lesson: Lesson; course: Course } | null>(null);
  const [filterSem,    setFilterSem]    = useState<number | null>(null);
  const [xpAnim,       setXpAnim]       = useState(false);
  const [newBadge,     setNewBadge]     = useState<string | null>(null);

  // Persist progress
  useEffect(() => {
    localStorage.setItem("santi_edu_progress", JSON.stringify({
      ...progress,
      completedLessons: Array.from(progress.completedLessons),
    }));
  }, [progress]);

  const handleLessonComplete = useCallback((lesson: Lesson, xpEarned: number) => {
    setActiveLesson(null);
    setProgress((prev) => {
      const now = new Date().toDateString();
      const streak = prev.lastStudied === now ? prev.streak : prev.streak + 1;
      const newCompleted = new Set(prev.completedLessons);
      newCompleted.add(lesson.id);
      const newXp = prev.xp + xpEarned;
      const updated: Progress = { ...prev, completedLessons: newCompleted, xp: newXp, streak, lastStudied: now, badges: prev.badges };

      // Check badges
      const earned = BADGES.filter((b) => !prev.badges.includes(b.id) && b.condition(updated));
      if (earned.length) {
        updated.badges = [...prev.badges, ...earned.map((b) => b.id)];
        setNewBadge(earned[earned.length - 1].id);
        setTimeout(() => setNewBadge(null), 3500);
      }
      return updated;
    });
    if (xpEarned > 0) { setXpAnim(true); setTimeout(() => setXpAnim(false), 600); }
  }, []);

  const totalXpAvail = COURSES.reduce((sum, c) => sum + c.lessons.reduce((s, l) => s + l.xp, 0), 0);
  const totalLessons = COURSES.reduce((sum, c) => sum + c.lessons.length, 0);

  const semesters = [...new Set(COURSES.map((c) => c.semester))].sort();
  const filtered  = filterSem !== null ? COURSES.filter((c) => c.semester === filterSem) : COURSES;

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      backgroundColor: "#020810", color: "#e0ffe8", fontFamily: "monospace",
    }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "12px 20px", borderBottom: "1px solid rgba(0,255,200,0.08)",
        background: "rgba(0,8,20,0.8)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ color: "#00ffcc", fontSize: 12, letterSpacing: "3px", margin: 0 }}>
              🎓 ACADEMIA SANTI NEXUS
            </h2>
            <p style={{ color: "#3a6a5a", fontSize: 8, margin: "2px 0 0", letterSpacing: "1px" }}>
              MIT · Harvard · UNAM · NASA · ONU · Khan Academy
            </p>
          </div>

          {/* XP badge */}
          <div
            className={xpAnim ? "xp-pop" : ""}
            style={{
              padding: "6px 14px", borderRadius: 20,
              background: "rgba(200,168,75,0.15)",
              border: "1px solid rgba(200,168,75,0.4)",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>⭐</span>
            <span style={{ color: "#c8a84b", fontSize: 13, fontWeight: "bold" }}>{progress.xp} XP</span>
          </div>

          {/* Streak */}
          <div style={{
            padding: "6px 12px", borderRadius: 20,
            background: "rgba(255,109,0,0.1)",
            border: "1px solid rgba(255,109,0,0.3)",
          }}>
            <span style={{ color: "#ff6d00", fontSize: 12 }}>🔥 {progress.streak} días</span>
          </div>

          {/* Global progress */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <ProgressBar
              value={progress.completedLessons.size}
              max={totalLessons}
              color="#00ffcc"
              label={`${progress.completedLessons.size}/${totalLessons} lecciones · ${Math.round((progress.xp / totalXpAvail) * 100)}% del plan`}
            />
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {BADGES.filter((b) => progress.badges.includes(b.id)).map((b) => (
              <span key={b.id} title={b.name} style={{ fontSize: 18, cursor: "help" }}>{b.icon}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Semester filter ───────────────────────────────────────────────── */}
      <div style={{
        padding: "8px 20px", borderBottom: "1px solid rgba(0,255,200,0.06)",
        display: "flex", gap: 8, alignItems: "center",
      }}>
        <span style={{ fontSize: 8, color: "#2a5a4a", letterSpacing: "1px" }}>SEMESTRE:</span>
        <button
          onClick={() => setFilterSem(null)}
          style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 8, cursor: "pointer",
            background: filterSem === null ? "rgba(0,255,200,0.15)" : "transparent",
            border: `1px solid ${filterSem === null ? "rgba(0,255,200,0.4)" : "rgba(0,255,200,0.1)"}`,
            color: "#00ffcc", fontFamily: "monospace",
          }}
        >
          TODOS
        </button>
        {semesters.map((s) => (
          <button
            key={s}
            onClick={() => setFilterSem(s)}
            style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 8, cursor: "pointer",
              background: filterSem === s ? "rgba(0,255,200,0.15)" : "transparent",
              border: `1px solid ${filterSem === s ? "rgba(0,255,200,0.4)" : "rgba(0,255,200,0.1)"}`,
              color: "#00ffcc", fontFamily: "monospace",
            }}
          >
            {s}°
          </button>
        ))}
      </div>

      {/* ── Course grid ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {filtered.map((course) => {
          const completedInCourse = course.lessons.filter((l) => progress.completedLessons.has(l.id)).length;
          return (
            <div key={course.id} style={{ marginBottom: 24 }}>
              {/* Course header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{course.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: course.color, fontSize: 11, fontWeight: "bold", margin: 0, letterSpacing: "1px" }}>
                    {course.subject}
                  </p>
                  <p style={{ color: "#3a6a5a", fontSize: 8, margin: "2px 0" }}>
                    {course.level} · Sem {course.semester} · {course.source}
                  </p>
                  <ProgressBar value={completedInCourse} max={course.lessons.length} color={course.color} />
                </div>
                <span style={{ fontSize: 9, color: course.color }}>
                  {completedInCourse}/{course.lessons.length}
                </span>
              </div>

              {/* Lesson cards */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {course.lessons.map((lesson, i) => {
                  const done = progress.completedLessons.has(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      className="lesson-card"
                      style={{
                        flex: "1 1 220px", maxWidth: 260,
                        padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                        background: done ? `${course.color}12` : "rgba(0,8,16,0.8)",
                        border: `1px solid ${done ? course.color + "50" : course.color + "20"}`,
                        transition: "all 0.18s",
                        animationDelay: `${i * 0.08}s`,
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onClick={() => setActiveLesson({ lesson, course })}
                    >
                      {done && (
                        <div style={{
                          position: "absolute", top: 8, right: 8,
                          width: 20, height: 20, borderRadius: "50%",
                          background: "#00e676", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 10,
                        }}>
                          ✓
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 18 }}>{lesson.icon}</span>
                        <p style={{ margin: 0, fontSize: 10, color: done ? course.color : "#e0ffe8", fontWeight: "bold" }}>
                          {lesson.title}
                        </p>
                      </div>
                      <p style={{ fontSize: 8, color: "#4a8a6a", margin: "0 0 8px", lineHeight: 1.5 }}>
                        {lesson.desc}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 8, color: "#c8a84b" }}>⭐ {lesson.xp} XP</span>
                        <span style={{ fontSize: 8, color: "#3a6a5a" }}>{lesson.questions.length} preguntas</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Lesson modal ──────────────────────────────────────────────────── */}
      {activeLesson && (
        <LessonModal
          lesson={activeLesson.lesson}
          course={activeLesson.course}
          onClose={(xp) => handleLessonComplete(activeLesson.lesson, xp)}
        />
      )}

      {/* ── New badge toast ───────────────────────────────────────────────── */}
      {newBadge && (() => {
        const b = BADGES.find((x) => x.id === newBadge);
        return b ? (
          <div
            className="badge-new"
            style={{
              position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
              padding: "14px 28px", borderRadius: 12, zIndex: 9500,
              background: "rgba(200,168,75,0.95)",
              border: "2px solid #ffd600",
              textAlign: "center",
              boxShadow: "0 0 24px rgba(200,168,75,0.5)",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 4 }}>{b.icon}</div>
            <p style={{ color: "#000", fontWeight: "bold", fontSize: 12, margin: "0 0 2px" }}>¡NUEVA MEDALLA!</p>
            <p style={{ color: "#1a1a00", fontSize: 10, margin: 0 }}>{b.name}</p>
          </div>
        ) : nulo
      })()}
    </div>
  );
};
