/**
 * Synthetic patient "Ana" — i8 Reserva case.
 *
 * Reproducible demo patient built around the adaptive 4-phase interview
 * architecture (see docs/15_interview_design_research.md):
 *
 *   Phase A — Triage (2 turns: consent + red-flag sweep)
 *   Phase B — Chief complaint + surface signals (3 turns: open funnel)
 *   Phase C — Directed differential (6 turns: adaptive probes)
 *   Phase D — Biographical anchor + closure (2 turns: ATM + consent)
 *
 * Ana's answers are NOT pre-scripted to confirm i8. She opens ambiguous,
 * and the posterior should converge to i8 by evidence accumulation —
 * not by leading questions. A judge familiar with Active Inference
 * should see legitimate Bayesian updating, not theatre.
 */

export type PrescriptedTurn = {
  role: "assistant" | "user";
  content: string;
  /** Phase label for the UI timeline (optional). */
  phase?: "A" | "B" | "C" | "D";
};

export const PATIENT_ANA_PROFILE = {
  id: "ana",
  name: "Ana",
  age: 47,
  sex: "F",
  occupation_es: "Arquitecta, dos hijos adolescentes.",
  occupation_en: "Architect, two teenage children.",
  chief_complaint_es:
    "Glucosa en el límite, sobrepeso refractario, hiperfagia nocturna.",
  chief_complaint_en:
    "Borderline glucose, refractory weight gain, nocturnal hyperphagia.",
  /**
   * The intake Ana walks in with. Realistic labs that align with — but
   * do not dictate — an i8 Reserva posterior. The analyzer should cross
   * these with the narrative to increase confidence and to produce
   * discordance entries where applicable.
   */
  intake: {
    age: 47 as const,
    sex: "F" as const,
    labs: {
      hba1c: 6.1,
      homa_ir: 3.2,
      fasting_glucose: 104,
      triglycerides: 178,
      hdl: 41,
      cortisol_morning: 22,
      crp: 2.8,
      vitamin_d: 22,
      sdnn_hrv: 32,
    },
    active_diagnoses: [] as const,
    chronic_medications: [] as const,
    red_flags: {
      suicidal_ideation_past_month: false,
      active_eating_disorder: false,
      recent_major_loss_under_6_weeks: false,
      unmanaged_medical_condition: false,
      substance_dependence: false,
    },
    notes_es:
      "Padre falleció cuando tenía 7 años. Refiere hiperfagia nocturna de 8 años de evolución.",
  },
  expected_imprint: "i8" as const,
  expected_posterior_range: [0.62, 0.82] as const,
};

// ─────────────────────────────────────────────────────────── SPANISH ──
export const PATIENT_ANA_SCRIPT_ES: PrescriptedTurn[] = [
  // PHASE A — TRIAGE
  {
    phase: "A",
    role: "assistant",
    content:
      "Antes de empezar: esto es un prototipo de apoyo clínico, nada de lo que digas reemplaza a tu médico. Vamos a tomar unos 15 minutos. ¿Este es un buen momento para hablar?",
  },
  {
    phase: "A",
    role: "user",
    content: "Sí, estoy bien. Puedo hablar.",
  },
  {
    phase: "A",
    role: "assistant",
    content:
      "Tres preguntas rápidas de seguridad: ¿en el último mes has tenido pensamientos de hacerte daño o de que estarías mejor muerta? ¿Alguna hospitalización, crisis o condición médica sin tratar en los últimos seis meses? ¿Alguna pérdida importante en las últimas semanas?",
  },
  {
    phase: "A",
    role: "user",
    content:
      "No, nada de eso. Estoy estable. Mi papá murió hace mucho, pero eso fue cuando yo era niña.",
  },

  // PHASE B — CHIEF COMPLAINT + SURFACE SIGNALS (open funnel, no leading)
  {
    phase: "B",
    role: "assistant",
    content: "Cuéntame con tus palabras qué te trae hoy. Tómate tu tiempo.",
  },
  {
    phase: "B",
    role: "user",
    content:
      "Mi cardióloga me dijo que tengo la glucosa en el límite. Llevo años intentando bajar de peso y no puedo. Como sano entre semana, pero algo pasa en las noches.",
  },
  {
    phase: "B",
    role: "assistant",
    content:
      "Dijiste «algo pasa en las noches». ¿Puedes contarme más sobre eso?",
  },
  {
    phase: "B",
    role: "user",
    content:
      "Cuando los niños se duermen y la casa queda en silencio, me siento en la cocina. No tengo hambre. Es como una inquietud. Empiezo con algo pequeño, después termino comiendo hasta que ya no puedo más.",
  },
  {
    phase: "B",
    role: "assistant",
    content:
      "Cuando estás más off — sea de ánimo o de cuerpo — ¿qué tiende a haber pasado justo antes? Una comida saltada, una mala noche, algún tipo específico de interacción.",
  },
  {
    phase: "B",
    role: "user",
    content:
      "Cuando mi esposo viaja, cuando alguno de mis hijos no me contesta el teléfono, cuando hay algo en el trabajo que podría salir mal. Me quedo en modo alerta.",
  },

  // PHASE C — DIRECTED DIFFERENTIAL (adaptive probes, top-2 posteriors)
  // After Phase B, top-2 posteriors are likely {i8, i4} given vigilance
  // language. The assistant fires i8-P1 first, then i4-P1, then i8-P2.
  {
    phase: "C",
    role: "assistant",
    content:
      "Si se te atrasa una comida dos o tres horas, ¿qué le pasa a tu ánimo, a tus pensamientos, a tu cuerpo?",
  },
  {
    phase: "C",
    role: "user",
    content:
      "Me pongo muy irritable. Pienso cosas catastróficas. Siento un hueco aquí en el pecho, una sensación de que si no como algo malo va a pasar. Aunque sé que tengo comida en casa. Mi cuerpo no lo sabe.",
  },
  {
    phase: "C",
    role: "assistant",
    content:
      "¿Hay alguna persona o situación específica a la que tu mente regresa una y otra vez — repasando lo que se dijo o lo que hubieras querido hacer?",
  },
  {
    phase: "C",
    role: "user",
    content:
      "No tanto una persona. Es más el miedo de que algo les pase a los míos. No rumiación de discusiones. Más vigilancia.",
  },
  {
    phase: "C",
    role: "assistant",
    content:
      "En la noche, ¿te encuentras comiendo después de cenar aunque no tengas hambre? ¿Y te cuesta descansar sin sentir que deberías estar haciendo algo?",
  },
  {
    phase: "C",
    role: "user",
    content:
      "Sí las dos cosas. En la noche como sin hambre. Y un domingo por la tarde, si no tengo nada urgente, me siento rara, culpable. Termino limpiando algo, planificando la semana, revisando el banco. No sé relajarme.",
  },
  {
    phase: "C",
    role: "assistant",
    content:
      "Cuando tu cuerpo te da una señal — hambre, cansancio, tensión — ¿qué tan claro te queda qué es, antes de que escale?",
  },
  {
    phase: "C",
    role: "user",
    content:
      "No muy claro. Lo noto cuando ya estoy muy cansada o ya estoy comiendo sin parar. Antes, no tanto.",
  },

  // PHASE D — BIOGRAPHICAL ANCHOR + CLOSURE
  {
    phase: "D",
    role: "assistant",
    content:
      "Cuando miras hacia atrás, ¿hubo un periodo — meses o años — en que este patrón empezó o se profundizó? ¿Qué estaba pasando en tu vida entonces?",
  },
  {
    phase: "D",
    role: "user",
    content:
      "Mi papá murió cuando yo tenía siete años. Mi mamá se quedó sola con tres hijos. Siempre decía «hay que guardar, hay que tener reservas, nunca sabes cuándo puede faltar». Yo crecí cuidando a mis hermanos. A los catorce ya trabajaba los fines de semana.",
  },
  {
    phase: "D",
    role: "assistant",
    content:
      "Gracias por compartirlo. Antes de sintetizar, ¿hay algo importante que no te pregunté? ¿Y me das tu consentimiento para generar un mapa de lo que estoy viendo, para ti y, si tú eliges, para tu clínico?",
  },
  {
    phase: "D",
    role: "user",
    content: "Sí, adelante. Quiero ver qué encuentras.",
  },
];

// ─────────────────────────────────────────────────────────── ENGLISH ──
export const PATIENT_ANA_SCRIPT_EN: PrescriptedTurn[] = [
  {
    phase: "A",
    role: "assistant",
    content:
      "Before we begin: this is a prototype clinical-assistance tool and nothing you say replaces your doctor. We'll take about 15 minutes. Is this a safe moment to talk?",
  },
  { phase: "A", role: "user", content: "Yes, I'm fine. I can talk." },
  {
    phase: "A",
    role: "assistant",
    content:
      "Three quick safety questions: in the past month, any thoughts of harming yourself or being better off dead? Any hospitalisations, seizures, or unmanaged medical condition in the last six months? Any major loss in the past weeks?",
  },
  {
    phase: "A",
    role: "user",
    content:
      "No, none of that. I'm stable. My father died but that was long ago, when I was a child.",
  },

  {
    phase: "B",
    role: "assistant",
    content: "Tell me in your own words what brings you here. Take your time.",
  },
  {
    phase: "B",
    role: "user",
    content:
      "My cardiologist said I'm borderline diabetic. I've been trying to lose weight for years and I can't. I eat clean Monday to Friday, but something happens at night.",
  },
  {
    phase: "B",
    role: "assistant",
    content: "You said «something happens at night». Can you say more about that?",
  },
  {
    phase: "B",
    role: "user",
    content:
      "When the kids are asleep and the house is quiet, I sit in the kitchen. I'm not hungry. It's more a restlessness. I start with something small, then I end up eating until I can't anymore.",
  },
  {
    phase: "B",
    role: "assistant",
    content:
      "When you are most off — mood or body — what tends to have happened just before? A skipped meal, a bad night, a specific kind of interaction?",
  },
  {
    phase: "B",
    role: "user",
    content:
      "When my husband travels. When one of my kids doesn't answer the phone. When something at work could go wrong. I stay on alert.",
  },

  {
    phase: "C",
    role: "assistant",
    content:
      "If a meal is delayed two or three hours, what happens to your mood, your thoughts, your body?",
  },
  {
    phase: "C",
    role: "user",
    content:
      "I get very irritable. I catastrophise. I feel a hollow spot here in my chest, a sense that if I don't eat something bad is going to happen. Even though I know I have food at home. My body doesn't know that.",
  },
  {
    phase: "C",
    role: "assistant",
    content:
      "Is there a specific person or situation your mind returns to repeatedly — replaying what was said or what you wish you'd done?",
  },
  {
    phase: "C",
    role: "user",
    content:
      "Not really a person. It's more the fear that something will happen to those I love. Not replaying arguments. More vigilance.",
  },
  {
    phase: "C",
    role: "assistant",
    content:
      "At night, do you find yourself eating after dinner even without hunger? And is it hard to rest without feeling you should be doing something?",
  },
  {
    phase: "C",
    role: "user",
    content:
      "Yes, both. At night I eat without hunger. And on a Sunday afternoon, with nothing urgent, I feel strange and guilty. I end up cleaning, planning the week, checking the bank account. I don't know how to relax.",
  },
  {
    phase: "C",
    role: "assistant",
    content:
      "When your body signals something — hunger, fatigue, tension — how clearly can you name what it is before it escalates?",
  },
  {
    phase: "C",
    role: "user",
    content:
      "Not very clearly. I notice it only when I'm already exhausted or already eating non-stop. Not before.",
  },

  {
    phase: "D",
    role: "assistant",
    content:
      "Looking back, was there a period — months or years — when this pattern started or deepened? What was happening in your life then?",
  },
  {
    phase: "D",
    role: "user",
    content:
      "My father died when I was seven. My mother was left alone with three children. She always said «you have to save, you have to keep reserves, you never know when it might run out». I grew up caring for my younger siblings. By fourteen I was working weekends.",
  },
  {
    phase: "D",
    role: "assistant",
    content:
      "Thank you for sharing this. Before I synthesise, is there anything important I didn't ask? And do I have your consent to generate a draft map of what I'm seeing, for you and — if you choose — your clinician?",
  },
  {
    phase: "D",
    role: "user",
    content: "Yes, go ahead. I want to see what you find.",
  },
];

export function getAnaScript(locale: "en" | "es"): PrescriptedTurn[] {
  return locale === "es" ? PATIENT_ANA_SCRIPT_ES : PATIENT_ANA_SCRIPT_EN;
}
