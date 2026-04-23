/**
 * Synthetic patient "Ana" — i8 Reserva case.
 *
 * Reproducible demo patient. The prescripted turns ensure the video demo
 * renders identically every time; the real-time mode still allows free
 * conversation if the operator chooses it.
 */

export type PrescriptedTurn = {
  role: "assistant" | "user";
  content: string;
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
  labs: {
    hba1c: 6.1,
    homa_ir: 3.2,
    fasting_glucose: 104,
    triglycerides: 178,
    hdl: 41,
    cortisol_morning: 22,
    sdnn: 32,
    crp: 2.8,
    vitamin_d: 22,
  },
  expected_imprint: "i8",
  expected_posterior_range: [0.78, 0.92] as const,
};

export const PATIENT_ANA_SCRIPT_ES: PrescriptedTurn[] = [
  {
    role: "assistant",
    content:
      "Hola. ¿Qué te trae hoy? Tómate el tiempo que quieras para contarme.",
  },
  {
    role: "user",
    content:
      "Vengo porque tengo la glucosa en el límite. Mi cardióloga me dijo que si sigo así me hago diabética. Llevo años intentando bajar de peso y no puedo. Como sano entre semana, pero en las noches no me aguanto.",
  },
  {
    role: "assistant",
    content:
      "Cuando dices que en las noches no te aguantas — ¿qué pasa antes de que empieces a comer?",
  },
  {
    role: "user",
    content:
      "Llego cansada del trabajo. Termino con los niños. Cuando todos duermen, me siento en la cocina. No tengo hambre física. Es como si necesitara algo. Empiezo con un pan, luego galletas, luego lo que haya.",
  },
  {
    role: "assistant",
    content:
      "Cuando dices «necesitara algo» — ¿qué sensación es, dónde la sientes en el cuerpo?",
  },
  {
    role: "user",
    content:
      "Es como un hueco aquí en el pecho. Una inquietud. Como si algo malo fuera a pasar si no como. Yo sé que tengo comida. Pero mi cuerpo no lo sabe.",
  },
  {
    role: "assistant",
    content:
      "«Mi cuerpo no lo sabe». Eso es importante. Cuando alguien a quien quieres se aleja — un hijo que no llama, tu pareja distraído — ¿qué pasa en tu cuerpo?",
  },
  {
    role: "user",
    content:
      "Me agito. Pienso que algo les pasó. Me cuesta dormir. Si mi esposo viaja dos días, me cuesta comer bien. ¿Es tonto?",
  },
  {
    role: "assistant",
    content:
      "No, no lo es. ¿Cómo era tu casa cuando eras pequeña? ¿Qué recuerdas de tu madre, de tu padre?",
  },
  {
    role: "user",
    content:
      "Mi padre murió cuando yo tenía siete años. Mi mamá se quedó sola con tres hijos. Siempre decía «hay que guardar, hay que tener reservas, nunca sabes cuándo puede faltar». Yo crecí cuidando a mis hermanos. A los catorce ya trabajaba los fines de semana.",
  },
  {
    role: "assistant",
    content:
      "Gracias. Una última: cuando estás descansando un domingo por la tarde, sin nada urgente, ¿cómo te sientes?",
  },
  {
    role: "user",
    content:
      "Rara. Culpable. Como que algo estoy dejando de hacer. No puedo disfrutarlo. Termino limpiando algo, planeando la semana, revisando el banco. No sé relajarme.",
  },
];

export const PATIENT_ANA_SCRIPT_EN: PrescriptedTurn[] = [
  {
    role: "assistant",
    content: "Hi. What brings you here today? Take your time.",
  },
  {
    role: "user",
    content:
      "My cardiologist said I'm on the edge of diabetes. I've been trying to lose weight for years, can't. I eat clean Monday to Friday but at night I can't stop myself.",
  },
  {
    role: "assistant",
    content:
      "When you say you can't stop yourself at night — what happens right before you start eating?",
  },
  {
    role: "user",
    content:
      "I come home exhausted. I finish with the kids. When everyone's asleep I sit in the kitchen. I'm not physically hungry. It's like I need something. I start with bread, then cookies, then whatever's around.",
  },
  {
    role: "assistant",
    content:
      "When you say «I need something» — what's the sensation, where do you feel it in your body?",
  },
  {
    role: "user",
    content:
      "It's like a hollow feeling here in my chest. A restlessness. Like something bad is going to happen if I don't eat. I know I have food. But my body doesn't know that.",
  },
  {
    role: "assistant",
    content:
      "«My body doesn't know that». That matters. When someone you love pulls away a little — a child who doesn't call, a distracted partner — what happens in your body?",
  },
  {
    role: "user",
    content:
      "I get agitated. I think something happened to them. I can't sleep. If my husband travels for two days I can barely eat. Is that silly?",
  },
  {
    role: "assistant",
    content:
      "No, it's not. What was home like when you were small? What do you remember about your mother, your father?",
  },
  {
    role: "user",
    content:
      "My father died when I was seven. My mother was alone with three kids. She always said, «you have to save, you have to keep reserves, you never know when it'll run out». I grew up taking care of my younger siblings. By fourteen I was working weekends.",
  },
  {
    role: "assistant",
    content:
      "Thank you. One last question: when you're finally resting on a Sunday afternoon, nothing urgent to do, how do you feel?",
  },
  {
    role: "user",
    content:
      "Strange. Guilty. Like I'm letting something slip. I can't enjoy it. I end up cleaning, planning the week, checking the bank account. I don't know how to relax.",
  },
];

export function getAnaScript(locale: "en" | "es"): PrescriptedTurn[] {
  return locale === "es" ? PATIENT_ANA_SCRIPT_ES : PATIENT_ANA_SCRIPT_EN;
}
