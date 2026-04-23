/**
 * Las 20 Sensaciones Viscerales — catálogo canónico BV4
 *
 * Fuente: Tratado BV4, Dr. Miguel Ojeda Ríos.
 *   - Cap 9.1–9.4 (señal biológica, topografía, cascadas)
 *   - Cap 9.5 (carga alostática)
 *   - Apéndice A (tabla completa)
 *   - Apéndice B (referencia de improntas)
 *
 * Las sensaciones son señales biológicas primitivas — no emociones.
 * Cada una opera como capa 1 del modelo de 4 capas BV4:
 *     señal visceral (N3 profundo)
 *         → cascada fisiológica (N2)
 *             → manifestación somática (N3 superficie)
 *                 → emoción (N3/N4 interfaz)
 *
 * Esta es la capa sobre la que matemáticamente se puede trabajar:
 * la señal activa la cascada, y la cascada produce el síntoma
 * observable. El clasificador Bayesiano opera sobre las 20
 * sensaciones como componentes del GMM.
 *
 * IMPORTANTE: el vocabulario `sensation_id`, `name`, `mechanism`,
 * `imprints_primary`, etc. es canónico BV4. No cambiar sin
 * actualización del Tratado.
 */

export type SensationId =
  | "s1_abandono"
  | "s2_agresion"
  | "s3_vacio"
  | "s4_soledad"
  | "s5_frustracion"
  | "s6_impotencia"
  | "s7_insatisfaccion"
  | "s8_vulnerabilidad"
  | "s9_hambre"
  | "s10_persecucion"
  | "s11_amor_dificil"
  | "s12_angustia"
  | "s13_ira"
  | "s14_infelicidad"
  | "s15_desvalorizacion"
  | "s16_traicion"
  | "s17_rendicion"
  | "s18_casi_muerte"
  | "s19_humillacion"
  | "s20_desvalorizacion_estetica";

export type ImprintId =
  | "i1"
  | "i2"
  | "i3"
  | "i4"
  | "i5"
  | "i6"
  | "i7"
  | "i8"
  | "i9"
  | "i10"
  | "i11"
  | "i12"
  | "i13";

/**
 * Cascada bioquímica esperada por sensación.
 *
 * Cada eje es el *desvío esperado* respecto al valor basal poblacional.
 * Expresado como z-score esperado bajo la cascada activa (no valor
 * absoluto). Permite sumar múltiples sensaciones sin colisionar
 * escalas diferentes.
 *
 * Convención:
 *   +2.0 → elevación fuerte esperada
 *   +1.0 → elevación moderada
 *    0.0 → sin cambio esperado
 *   -1.0 → descenso moderado
 *   -2.0 → descenso fuerte
 *
 * Sólo se listan los ejes para los que la cascada documenta un
 * efecto. Los ejes ausentes en el objeto son neutrales (z=0).
 */
export type CascadeSignature = {
  // HPA
  cortisol_am?: number;
  cortisol_pm?: number;
  car?: number;
  // Metabolic
  hba1c?: number;
  homa_ir?: number;
  fasting_glucose?: number;
  fasting_insulin?: number;
  triglycerides?: number;
  hdl?: number;
  ldl?: number;
  leptin?: number;
  // Inflammation
  crp?: number;
  il6?: number;
  tnf_alpha?: number;
  // Thyroid
  tsh?: number;
  t3_free?: number;
  t4_free?: number;
  // Micronutrients
  ferritin?: number;
  vitamin_d?: number;
  b12?: number;
  homocysteine?: number;
  // Autonomic
  sdnn_hrv?: number;
  rmssd_hrv?: number;
  lf_hf_ratio?: number;
  // Body composition
  visceral_fat?: number;
  lean_mass_pct?: number;
  body_water_pct?: number;
  // Hormonal (reproductive)
  testosterone?: number;
  estradiol?: number;
  dhea_s?: number;
  // Additional markers documented in Cap 9
  aldosterone?: number;
  ghrelin?: number;
  catecholamines?: number;
  fibrinogen?: number;
};

/**
 * Zona corporal canónica según Tratado Cap 9.2 / Apéndice A.
 * Se usa como coordinada 3 del Context Engineering.
 */
export type BodyZone =
  | "ocular"
  | "oral_jaw"
  | "cervical_throat"
  | "thoracic_chest"
  | "dorsal_back"
  | "diaphragm_epigastric"
  | "abdominal"
  | "hepatobiliary"
  | "pelvic_genital"
  | "skin_face"
  | "articular_skeletal"
  | "renal_lumbar"
  | "peripheral_extremities"
  | "global_depletion"
  | "cardiovascular";

export type SensationCatalogEntry = {
  id: SensationId;
  number: number; // 1..20 según Apéndice A
  name_es: string;
  name_en: string;
  /** Señal biológica primitiva original (Apéndice A). */
  primitive_signal_es: string;
  primitive_signal_en: string;
  /** Conflicto biológico que señala. */
  biological_conflict_es: string;
  biological_conflict_en: string;
  /** Zona corporal preferente (Cap 9, Apéndice A). Orientación — no fija. */
  body_zones: BodyZone[];
  /**
   * Cascada esperada: desvío por eje bioquímico.
   * Referencias al Tratado y literatura por cada cascada en
   * el comentario arriba de cada entrada.
   */
  cascade: CascadeSignature;
  /** Improntas donde esta sensación aparece como primaria. */
  imprints_primary: ImprintId[];
  /** Improntas frecuentes secundarias. */
  imprints_secondary: ImprintId[];
  /**
   * Patrón narrativo característico — lo que Sonnet debería
   * detectar en el transcript para sugerir esta sensación.
   * No es una palabra exacta — es un patrón.
   */
  narrative_pattern_es: string;
  narrative_pattern_en: string;
};

/**
 * Helper interno para derivar z-score de tipo de carga alostática
 * tipo 2 (McEwen): la señal sigue activa crónicamente.
 * Escala aproximada, conservadora en v0.3 draft.
 */

export const SENSATIONS: Record<SensationId, SensationCatalogEntry> = {
  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #1 — Abandono
  // Señal: separación de la manada. Cascada HPA sostenida +
  // aldosterona (retención Na/H2O) + reprogramación epigenética
  // Lemche 2016 (HSD11B1, leptina, melanocortina, NPY).
  // Carga alostática tipo 2 McEwen 1998.
  // ──────────────────────────────────────────────────────────────
  s1_abandono: {
    id: "s1_abandono",
    number: 1,
    name_es: "Abandono",
    name_en: "Abandonment",
    primitive_signal_es: "Separación de la manada; pérdida de protección del grupo",
    primitive_signal_en: "Separation from the herd; loss of group protection",
    biological_conflict_es: "Pérdida de la fuente de recursos — emergencia metabólica",
    biological_conflict_en: "Loss of resource source — metabolic emergency",
    body_zones: ["abdominal", "global_depletion"],
    cascade: {
      cortisol_am: +1.8,
      cortisol_pm: +1.2,
      aldosterone: +1.5,
      body_water_pct: +1.2,
      visceral_fat: +1.3,
      hba1c: +0.9,
      homa_ir: +1.3,
      leptin: +1.5,
      triglycerides: +0.9,
      hdl: -0.8,
      ldl: +0.7,
      ghrelin: +1.2,
    },
    imprints_primary: ["i8"],
    imprints_secondary: ["i12", "i9"],
    narrative_pattern_es:
      "Pérdida identificable de una fuente que proveía (madre, pareja, grupo). 'Siempre me dejan'; 'no voy a tener lo que necesito'. Acumulación compulsiva, dificultad para soltar.",
    narrative_pattern_en:
      "Identifiable loss of a source that provided (mother, partner, group). 'They always leave me'; 'I won't have what I need'. Compulsive accumulation, difficulty letting go.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #2 — Agresión
  // Señal: invasión territorial. Cascada SAM → catecolaminas →
  // hepatotoxicidad (Joung 2019: radicales hidroxilo, TNF-α vía
  // Kupffer, IL-6 hepatocitos, hipoxia por vasoconstricción
  // esplácnica).
  // ──────────────────────────────────────────────────────────────
  s2_agresion: {
    id: "s2_agresion",
    number: 2,
    name_es: "Agresión",
    name_en: "Aggression",
    primitive_signal_es: "Territorio invadido; preparación para lucha",
    primitive_signal_en: "Territory invaded; preparation for fight",
    biological_conflict_es: "Defensa del espacio vital",
    biological_conflict_en: "Defense of vital space",
    body_zones: ["oral_jaw", "hepatobiliary", "thoracic_chest"],
    cascade: {
      catecholamines: +2.0,
      cortisol_am: +1.2,
      // hepatotoxicidad catecolaminérgica
      crp: +1.0,
      tnf_alpha: +1.3,
      il6: +1.2,
      lf_hf_ratio: +1.4,
      sdnn_hrv: -1.2,
      rmssd_hrv: -1.0,
    },
    imprints_primary: ["i4"],
    imprints_secondary: ["i2"],
    narrative_pattern_es:
      "Invasión aguda de los límites. Preparación motora de confrontación. Tono corporal alto, mandíbula apretada, puños cerrados. 'Me están invadiendo'; 'voy a explotar'.",
    narrative_pattern_en:
      "Acute boundary invasion. Confrontation motor preparation. High body tone, jaw clenched, fists closed. 'They're invading me'; 'I'm going to explode'.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #3 — Vacío
  // Señal: pérdida de cría/pareja. Cascada: depleción dopaminérgica
  // mesolímbica (SEEKING apagado, Panksepp), supresión inmune +
  // inflamación sistémica (Schleifer 1983, Knowles 2019), con
  // amplificación por supresión expresiva (Lopez 2020).
  // ──────────────────────────────────────────────────────────────
  s3_vacio: {
    id: "s3_vacio",
    number: 3,
    name_es: "Vacío",
    name_en: "Emptiness",
    primitive_signal_es: "Pérdida de cría o pareja; ausencia de vínculo central",
    primitive_signal_en: "Loss of offspring or mate; absence of central bond",
    biological_conflict_es:
      "Pérdida irreversible de vínculo esencial — SEEKING sin objeto",
    biological_conflict_en:
      "Irreversible loss of essential bond — SEEKING without object",
    body_zones: ["thoracic_chest", "cardiovascular"],
    cascade: {
      cortisol_am: +1.3,
      il6: +1.6,
      tnf_alpha: +1.5,
      crp: +1.2,
      // depleción dopaminérgica (difícil de medir directo, aproximado por anhedonia/HRV)
      sdnn_hrv: -1.2,
      rmssd_hrv: -1.3,
    },
    imprints_primary: ["i13"],
    imprints_secondary: ["i7", "i11"],
    narrative_pattern_es:
      "'Un hueco aquí dentro', mano sobre el esternón. Hubo alguien/algo que se fue sin reemplazo posible. Anhedonia — no puede buscar porque no hay qué buscar.",
    narrative_pattern_en:
      "'A hole in here', hand over the sternum. Someone/something left with no possible replacement. Anhedonia — can't search because there's nothing to search for.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #4 — Soledad
  // Señal: aislamiento del grupo. Cascada CTRA (Cole 2015):
  // regulación al alza de genes proinflamatorios, regulación a la
  // baja de antivirales/interferones; monocitopoyesis proinflamatoria.
  // Resistencia a glucocorticoides. IL-6, TNF-α, IL-1β, fibrinógeno↑.
  // Riesgo CV comparable a tabaquismo (Holt-Lunstad 2015).
  // ──────────────────────────────────────────────────────────────
  s4_soledad: {
    id: "s4_soledad",
    number: 4,
    name_es: "Soledad",
    name_en: "Loneliness",
    primitive_signal_es: "Aislamiento del grupo; pérdida de regulación social",
    primitive_signal_en: "Group isolation; loss of social regulation",
    biological_conflict_es:
      "Desconexión del sistema de regulación fisiológica externa",
    biological_conflict_en: "Disconnection from external physiological regulation",
    body_zones: ["thoracic_chest", "cardiovascular"],
    cascade: {
      il6: +1.8,
      tnf_alpha: +1.6,
      crp: +1.5,
      fibrinogen: +1.4,
      cortisol_am: +1.0,
      sdnn_hrv: -1.3,
      rmssd_hrv: -1.2,
    },
    imprints_primary: ["i12", "i8", "i13"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Aislamiento percibido — no físico necesariamente. Puede estar rodeado y sentirse solo. Puede no haber habido pérdida específica: la soledad puede haber estado siempre.",
    narrative_pattern_en:
      "Perceived isolation — not necessarily physical. May be surrounded and feel alone. There may not have been a specific loss: loneliness may have always been there.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #5 — Frustración
  // Señal: bloqueo en la caza. Activación simpática sostenida sin
  // descarga motora. Se acumula en músculos de la acción (Carra 2012:
  // bruxismo precedido por activación simpática cardíaca).
  // ──────────────────────────────────────────────────────────────
  s5_frustracion: {
    id: "s5_frustracion",
    number: 5,
    name_es: "Frustración",
    name_en: "Frustration",
    primitive_signal_es: "Bloqueo en la caza; objetivo alcanzable que se niega",
    primitive_signal_en: "Blockage in the hunt; reachable objective denied",
    biological_conflict_es:
      "Imposibilidad de completar una acción vital; energía movilizada sin descarga",
    biological_conflict_en:
      "Inability to complete a vital action; energy mobilized without discharge",
    body_zones: ["oral_jaw", "thoracic_chest", "peripheral_extremities"],
    cascade: {
      cortisol_am: +1.3,
      catecholamines: +1.5,
      lf_hf_ratio: +1.2,
      sdnn_hrv: -1.0,
    },
    imprints_primary: ["i4", "i5"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Energía movilizada que no encuentra descarga. Bruxismo, tensión en puños/antebrazos. A diferencia de agresión: no hay invasor — hay muro. 'No puedo terminar', 'algo me bloquea'.",
    narrative_pattern_en:
      "Mobilized energy that finds no discharge. Bruxism, tension in fists/forearms. Unlike aggression: no invader — a wall. 'I can't finish', 'something blocks me'.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #6 — Impotencia
  // Señal: parálisis de la presa. Shutdown vagal dorsal (PAG-vl,
  // Porges 2011, Roelofs 2017). Bradicardia, hipotensión, depleción
  // global. Diferente del freeze simpático — retiro completo.
  // ──────────────────────────────────────────────────────────────
  s6_impotencia: {
    id: "s6_impotencia",
    number: 6,
    name_es: "Impotencia",
    name_en: "Helplessness",
    primitive_signal_es: "Parálisis de presa; acción bloqueada",
    primitive_signal_en: "Prey paralysis; action blocked",
    biological_conflict_es: "Ausencia total de opciones de acción — shutdown dorsal",
    biological_conflict_en: "Total absence of action options — dorsal shutdown",
    body_zones: ["global_depletion"],
    cascade: {
      cortisol_am: -1.0,
      cortisol_pm: -0.8,
      sdnn_hrv: +0.5, // HRV puede parecer alta por dominancia dorsal
      rmssd_hrv: +0.8,
      lf_hf_ratio: -1.2,
      t3_free: -1.0,
      tsh: +1.0,
    },
    imprints_primary: ["i7"],
    imprints_secondary: ["i1", "i11"],
    narrative_pattern_es:
      "Sin energía para intentar. No es rendición — es parálisis. 'No puedo'; 'todo intento falla'. Desconexión del cuerpo, sensación de no habitarlo.",
    narrative_pattern_en:
      "No energy to try. Not surrender — paralysis. 'I can't'; 'every attempt fails'. Disconnection from the body, feeling of not inhabiting it.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #7 — Insatisfacción
  // Señal: hambre que no sacia. Grelina elevada crónica (Chuang-Perello
  // 2011 — grelina media food-reward por estrés social). Resistencia a
  // leptina. SEEKING activo sin desactivación por saciedad.
  // ──────────────────────────────────────────────────────────────
  s7_insatisfaccion: {
    id: "s7_insatisfaccion",
    number: 7,
    name_es: "Insatisfacción",
    name_en: "Dissatisfaction",
    primitive_signal_es: "Hambre que no sacia; necesidad que no se resuelve",
    primitive_signal_en: "Hunger that does not satiate; need that does not resolve",
    biological_conflict_es:
      "Disociación entre ingesta y saciedad — circuito recompensa desregulado",
    biological_conflict_en:
      "Dissociation between intake and satiety — reward circuit dysregulated",
    body_zones: ["diaphragm_epigastric", "abdominal"],
    cascade: {
      ghrelin: +1.8,
      leptin: +1.3, // resistencia: elevada pero ineficaz
      homa_ir: +1.0,
      visceral_fat: +1.0,
      cortisol_am: +0.8,
    },
    imprints_primary: ["i8", "i4"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Come pero no se sacia. Puede ser comida, compras, sexo, sustancias — búsqueda compulsiva sin punto de llegada. 'Nunca es suficiente'.",
    narrative_pattern_en:
      "Eats but is not satiated. May be food, shopping, sex, substances — compulsive search with no arrival point. 'It's never enough'.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #8 — Vulnerabilidad
  // Señal: exposición sin refugio. Cortisol + catecolaminas
  // sostenidos; amígdala sensibilizada, atrofia hipocampal y PFC
  // (McEwen 2007). Circuito ansiedad autoperpetuante.
  // ──────────────────────────────────────────────────────────────
  s8_vulnerabilidad: {
    id: "s8_vulnerabilidad",
    number: 8,
    name_es: "Vulnerabilidad",
    name_en: "Vulnerability",
    primitive_signal_es: "Sin refugio; cuerpo expuesto sin protección",
    primitive_signal_en: "Without refuge; body exposed without protection",
    biological_conflict_es: "Ausencia de protección — hipervigilancia difusa",
    biological_conflict_en: "Absence of protection — diffuse hypervigilance",
    body_zones: ["ocular", "abdominal"],
    cascade: {
      cortisol_am: +1.5,
      catecholamines: +1.5,
      sdnn_hrv: -1.2,
      lf_hf_ratio: +1.3,
    },
    imprints_primary: ["i2", "i6", "i1"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Hipervigilancia sin depredador identificado. Alerta omnidireccional. Insomnio de mantenimiento. Tensión muscular difusa.",
    narrative_pattern_en:
      "Hypervigilance without identified predator. Omnidirectional alert. Maintenance insomnia. Diffuse muscle tension.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #9 — Hambre
  // Señal: escasez real o percibida. Grelina crónica + lipogénesis +
  // resistencia a insulina + supresión tiroidea (reducción TMB) +
  // modificaciones epigenéticas metabólicas (Lemche 2016).
  // Produce síndrome metabólico completo.
  // ──────────────────────────────────────────────────────────────
  s9_hambre: {
    id: "s9_hambre",
    number: 9,
    name_es: "Hambre",
    name_en: "Hunger",
    primitive_signal_es: "Escasez de alimento; supervivencia en riesgo",
    primitive_signal_en: "Food scarcity; survival at risk",
    biological_conflict_es:
      "Escasez real o percibida de recursos para supervivencia",
    biological_conflict_en:
      "Real or perceived scarcity of survival resources",
    body_zones: ["abdominal"],
    cascade: {
      ghrelin: +1.6,
      hba1c: +1.4,
      homa_ir: +1.5,
      fasting_glucose: +1.2,
      fasting_insulin: +1.4,
      triglycerides: +1.3,
      hdl: -1.0,
      visceral_fat: +1.6,
      tsh: +1.0, // supresión tiroidea compensatoria
      t3_free: -1.0,
      leptin: +1.2,
    },
    imprints_primary: ["i8"],
    imprints_secondary: ["i12"],
    narrative_pattern_es:
      "'No va a alcanzar'. Acumular por si acaso. Es escasez del recurso, no pérdida de alguien. Se activa ante cambios económicos, mudanzas, inestabilidad material.",
    narrative_pattern_en:
      "'There won't be enough'. Stockpile just in case. Scarcity of the resource, not loss of someone. Activated by economic changes, moves, material instability.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #10 — Persecución
  // Señal: depredador identificado. Simpático máximo sostenido.
  // Puede transitar a hipocortisolismo paradójico (Griffin-Resick
  // 2005: supresión dex exagerada en TEPT crónico).
  // ──────────────────────────────────────────────────────────────
  s10_persecucion: {
    id: "s10_persecucion",
    number: 10,
    name_es: "Persecución",
    name_en: "Persecution",
    primitive_signal_es: "Presa acechada; amenaza que sigue",
    primitive_signal_en: "Hunted prey; threat that follows",
    biological_conflict_es: "Amenaza activa e identificada no atacada aún",
    biological_conflict_en: "Active and identified threat that has not attacked yet",
    body_zones: ["cervical_throat", "ocular", "cardiovascular"],
    cascade: {
      catecholamines: +2.0,
      cortisol_am: +1.8,
      sdnn_hrv: -1.5,
      lf_hf_ratio: +1.6,
    },
    imprints_primary: ["i1", "i2", "i6"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Depredador concreto. Escaneo direccional — cuello que gira, ojos que buscan. A diferencia de vulnerabilidad: aquí sabe de dónde viene el peligro.",
    narrative_pattern_en:
      "Concrete predator. Directional scanning — turning neck, searching eyes. Unlike vulnerability: here knows where danger comes from.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #11 — Amor difícil
  // Señal: vínculo con peligro. Liberación simultánea de oxitocina y
  // cortisol (Krause 2016). Apego ansioso — fisiología ambivalente.
  // ──────────────────────────────────────────────────────────────
  s11_amor_dificil: {
    id: "s11_amor_dificil",
    number: 11,
    name_es: "Amor difícil",
    name_en: "Difficult love",
    primitive_signal_es: "Vínculo con fuente de peligro; apego con amenaza",
    primitive_signal_en: "Bond with source of danger; attachment with threat",
    biological_conflict_es: "Dependencia y amenaza en la misma fuente — ambivalencia fisiológica",
    biological_conflict_en: "Dependence and threat in the same source — physiological ambivalence",
    body_zones: ["thoracic_chest", "cardiovascular"],
    cascade: {
      cortisol_am: +1.4,
      sdnn_hrv: -1.1,
      lf_hf_ratio: +1.2,
    },
    imprints_primary: ["i9", "i13", "i10"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Necesita y teme a la misma persona. Busca proximidad + anticipa rechazo. Alternancia excitación/colapso. Apego ansioso clásico.",
    narrative_pattern_en:
      "Needs and fears the same person. Seeks proximity + anticipates rejection. Excitation/collapse alternation. Classic anxious attachment.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #12 — Angustia
  // Señal: amenaza invisible. Activación simpática difusa no
  // focalizada. Contracción diafragmática crónica (Niu 2024: RGE
  // por diafragma). Opresión clásica epigástrica/torácica.
  // ──────────────────────────────────────────────────────────────
  s12_angustia: {
    id: "s12_angustia",
    number: 12,
    name_es: "Angustia",
    name_en: "Anguish",
    primitive_signal_es: "Amenaza invisible; peligro que no puede localizarse",
    primitive_signal_en: "Invisible threat; danger that cannot be located",
    biological_conflict_es: "Peligro sin objeto identificable — activación difusa",
    biological_conflict_en: "Danger without identifiable object — diffuse activation",
    body_zones: ["diaphragm_epigastric", "thoracic_chest"],
    cascade: {
      catecholamines: +1.4,
      cortisol_am: +1.2,
      sdnn_hrv: -1.0,
      lf_hf_ratio: +1.2,
    },
    imprints_primary: ["i1", "i2", "i5"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Opresión en pecho/epigastrio sin causa identificable. RGE funcional. 'Algo está mal pero no sé qué'. Diafragma contraído crónico.",
    narrative_pattern_en:
      "Chest/epigastric oppression without identifiable cause. Functional GERD. 'Something is wrong but I don't know what'. Chronic diaphragm contraction.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #13 — Ira
  // Señal: ofensa territorial no resuelta. Cascada hepatobiliar
  // crónica (Joung 2019). HTA sostenida, aterogénesis acelerada
  // (Kent-Shapiro 2009).
  // ──────────────────────────────────────────────────────────────
  s13_ira: {
    id: "s13_ira",
    number: 13,
    name_es: "Ira",
    name_en: "Rage",
    primitive_signal_es: "Defensa territorial; respuesta al daño ya ocurrido",
    primitive_signal_en: "Territorial defense; response to damage already done",
    biological_conflict_es: "Ofensa territorial no reparada — carga crónica",
    biological_conflict_en: "Unrepaired territorial offense — chronic load",
    body_zones: ["oral_jaw", "hepatobiliary", "cardiovascular"],
    cascade: {
      catecholamines: +1.8,
      cortisol_am: +1.3,
      tnf_alpha: +1.5,
      il6: +1.4,
      crp: +1.3,
      ldl: +1.0,
      lf_hf_ratio: +1.4,
    },
    imprints_primary: ["i4"],
    imprints_secondary: ["i2"],
    narrative_pattern_es:
      "Rumiación sobre agente específico. 'Necesito que pague'. A diferencia de agresión: no descarga motora — carga cognitiva sostenida. Hipocondrio derecho tenso.",
    narrative_pattern_en:
      "Rumination on specific agent. 'I need them to pay'. Unlike aggression: no motor discharge — sustained cognitive load. Tense right hypochondrium.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #14 — Infelicidad
  // Señal: territorio estéril — no hay qué buscar. Desactivación
  // progresiva dopaminérgica mesolímbica (Phillips 2023, Treadway-
  // Zald 2013). Atrofia hipocampal/PFC por cortisol crónico.
  // ──────────────────────────────────────────────────────────────
  s14_infelicidad: {
    id: "s14_infelicidad",
    number: 14,
    name_es: "Infelicidad",
    name_en: "Unhappiness",
    primitive_signal_es: "Territorio estéril; entorno que no nutre",
    primitive_signal_en: "Sterile territory; environment that does not nourish",
    biological_conflict_es: "Esterilidad del entorno vital — SEEKING desactivado",
    biological_conflict_en: "Sterility of life environment — SEEKING deactivated",
    body_zones: ["global_depletion"],
    cascade: {
      cortisol_am: +0.8,
      sdnn_hrv: -0.8,
      tsh: +0.5,
      t3_free: -0.5,
    },
    imprints_primary: ["i7", "i3", "i11"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Anhedonia sin objeto perdido. A diferencia de vacío: no hubo alguien — el territorio nunca ofreció. 'Nada me interesa'. Depleción motivacional global.",
    narrative_pattern_en:
      "Anhedonia without lost object. Unlike emptiness: there was no one — the territory never offered. 'Nothing interests me'. Global motivational depletion.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #15 — Desvalorización
  // Señal: posición jerárquica inferior. Cortisol máximo
  // (Dickerson-Kemeny 2004: evaluación social + incontrolabilidad).
  // Osteoclastogénesis cortisol-dependiente → osteoporosis.
  // ──────────────────────────────────────────────────────────────
  s15_desvalorizacion: {
    id: "s15_desvalorizacion",
    number: 15,
    name_es: "Desvalorización",
    name_en: "Devaluation",
    primitive_signal_es: "Posición inferior en jerarquía; ser visto como menor",
    primitive_signal_en: "Lower position in hierarchy; being seen as lesser",
    biological_conflict_es: "Pérdida de posición jerárquica; recursos reducidos",
    biological_conflict_en: "Loss of hierarchical position; reduced resources",
    body_zones: ["cervical_throat", "articular_skeletal"],
    cascade: {
      cortisol_am: +1.8,
      cortisol_pm: +1.2,
      tnf_alpha: +1.2,
      // osteoclastogénesis — no medido directo; proxy con biomarcadores óseos
    },
    imprints_primary: ["i3", "i5"],
    imprints_secondary: [],
    narrative_pattern_es:
      "'No soy suficiente'. Encogimiento corporal, cifosis. Dolor articular sin causa inflamatoria clara. Comparación constante.",
    narrative_pattern_en:
      "'I'm not enough'. Body shrinking, kyphosis. Joint pain without clear inflammatory cause. Constant comparison.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #16 — Traición
  // Señal: ataque desde dentro de la manada. Cortisol + contractura
  // paravertebral específica (Linton 2000). Dolor dorsal medio.
  // ──────────────────────────────────────────────────────────────
  s16_traicion: {
    id: "s16_traicion",
    number: 16,
    name_es: "Traición",
    name_en: "Betrayal",
    primitive_signal_es: "Ataque desde dentro de la manada; aliado que daña",
    primitive_signal_en: "Attack from within the herd; ally who harms",
    biological_conflict_es: "Ruptura del pacto de protección mutua desde el interior",
    biological_conflict_en: "Breakdown of mutual protection pact from within",
    body_zones: ["dorsal_back"],
    cascade: {
      cortisol_am: +1.5,
      crp: +1.0,
      il6: +1.0,
      sdnn_hrv: -1.0,
    },
    imprints_primary: ["i2", "i4"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Daño vino de aliado/vínculo cercano. 'Cuido la espalda'. Contractura paravertebral sin hallazgos imagenológicos. Imposibilidad de intimidad.",
    narrative_pattern_en:
      "Harm came from ally/close bond. 'I watch my back'. Paravertebral contracture without imaging findings. Impossibility of intimacy.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #17 — Rendición / Me quiero morir
  // Señal: programa de muerte. Shutdown vagal dorsal extremo
  // (Kozlowska 2015: collapsed immobility). NOTA CLÍNICA: requiere
  // evaluación de riesgo antes de cualquier intervención.
  // ──────────────────────────────────────────────────────────────
  s17_rendicion: {
    id: "s17_rendicion",
    number: 17,
    name_es: "Rendición",
    name_en: "Surrender",
    primitive_signal_es: "Programa de muerte; costo metabólico > beneficio",
    primitive_signal_en: "Death program; metabolic cost > benefit",
    biological_conflict_es: "Conclusión de inviabilidad vital — cierre programado",
    biological_conflict_en: "Conclusion of vital unviability — scheduled shutdown",
    body_zones: ["global_depletion"],
    cascade: {
      cortisol_am: -1.5,
      cortisol_pm: -1.2,
      tsh: +1.2,
      t3_free: -1.3,
      t4_free: -0.8,
    },
    imprints_primary: ["i7", "i11"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Aplanamiento afectivo total. 'No me importaría no despertar'. Bradicardia, hipotensión. REQUIERE EVALUACIÓN DE RIESGO antes de intervenir.",
    narrative_pattern_en:
      "Total affective flattening. 'I wouldn't mind not waking up'. Bradycardia, hypotension. REQUIRES RISK ASSESSMENT before intervening.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #18 — Casi muerte
  // Señal: roce con depredador. Amígdala sensibilizada permanente
  // (Shin-Rauch-Pitman 2006, Rauch-Shin-Phelps 2006). Reconsolidación
  // patológica. Opuesto a rendición: hiperactivación sostenida.
  // ──────────────────────────────────────────────────────────────
  s18_casi_muerte: {
    id: "s18_casi_muerte",
    number: 18,
    name_es: "Casi muerte",
    name_en: "Near death",
    primitive_signal_es: "Roce con depredador; supervivencia al límite",
    primitive_signal_en: "Brush with predator; survival at the edge",
    biological_conflict_es: "Proximidad experimentada de muerte — vigilancia permanente",
    biological_conflict_en: "Experienced proximity of death — permanent vigilance",
    body_zones: ["ocular", "cervical_throat", "thoracic_chest"],
    cascade: {
      catecholamines: +2.0,
      cortisol_am: +1.5,
      sdnn_hrv: -1.6,
      lf_hf_ratio: +1.8,
    },
    imprints_primary: ["i1", "i2"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Flashbacks sensoriales, pesadillas. Sobresalto exagerado. Se activa por estímulos que se parecen al evento original. Hipervigilancia extrema.",
    narrative_pattern_en:
      "Sensory flashbacks, nightmares. Exaggerated startle. Activated by stimuli resembling the original event. Extreme hypervigilance.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #19 — Humillación
  // Señal: expulsión de la manada. Cortisol máximo con inflamación
  // cutánea (Dickerson-Kemeny 2004 d=0.92). TNF-α, inflamación con
  // patrón dermatológico (Dickerson-Gruenewald-Kemeny 2004).
  // ──────────────────────────────────────────────────────────────
  s19_humillacion: {
    id: "s19_humillacion",
    number: 19,
    name_es: "Humillación",
    name_en: "Humiliation",
    primitive_signal_es: "Expulsión de la manada; degradación pública",
    primitive_signal_en: "Expulsion from the herd; public degradation",
    biological_conflict_es: "Pérdida de estatus social hasta la exclusión",
    biological_conflict_en: "Loss of social status to the point of exclusion",
    body_zones: ["skin_face", "cervical_throat"],
    cascade: {
      cortisol_am: +1.9,
      tnf_alpha: +1.6,
      il6: +1.5,
      crp: +1.4,
    },
    imprints_primary: ["i6", "i3"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Exhibición pública del rechazo. 'Me vieron y me rechazaron'. Expresión preferentemente cutánea (rostro, cuello, manos). Manifestaciones dermatológicas resistentes.",
    narrative_pattern_en:
      "Public display of rejection. 'They saw me and rejected me'. Preferentially cutaneous expression (face, neck, hands). Treatment-resistant dermatological manifestations.",
  },

  // ──────────────────────────────────────────────────────────────
  // Cap 9.4 #20 — Desvalorización estética
  // Señal: rechazo de apareamiento. Supresión de testosterona/
  // estradiol (Mehta-Josephs 2006, Smith-Apicella 2017). Cortisol↑ +
  // grasa visceral → ciclo retroalimentado.
  // ──────────────────────────────────────────────────────────────
  s20_desvalorizacion_estetica: {
    id: "s20_desvalorizacion_estetica",
    number: 20,
    name_es: "Desvalorización estética",
    name_en: "Aesthetic devaluation",
    primitive_signal_es: "Rechazo de apareamiento; no ser elegido",
    primitive_signal_en: "Mating rejection; not being chosen",
    biological_conflict_es: "Percepción de inadecuación corporal reproductiva",
    biological_conflict_en: "Perception of reproductive body inadequacy",
    body_zones: ["pelvic_genital", "skin_face"],
    cascade: {
      testosterone: -1.5,
      estradiol: -1.0,
      cortisol_am: +1.2,
      visceral_fat: +1.0,
      lean_mass_pct: -1.0,
    },
    imprints_primary: ["i3", "i6"],
    imprints_secondary: [],
    narrative_pattern_es:
      "Vergüenza corporal crónica. Evitación de exposición física. Disfunción sexual. Paradoja: 'se cuida más' pero se siente peor — la señal interpreta cualquier forma corporal como insuficiente.",
    narrative_pattern_en:
      "Chronic body shame. Avoidance of physical exposure. Sexual dysfunction. Paradox: 'takes more care' but feels worse — the signal interprets any body form as insufficient.",
  },
};

/** Todas las IDs en orden numérico del catálogo. */
export const ALL_SENSATION_IDS: SensationId[] = (
  Object.values(SENSATIONS) as SensationCatalogEntry[]
)
  .sort((a, b) => a.number - b.number)
  .map((s) => s.id);

/**
 * Tabla canónica sensación → improntas frecuentes.
 * Fuente: Apéndice A del Tratado.
 */
export function imprintsForSensation(
  s: SensationId,
): { primary: ImprintId[]; secondary: ImprintId[] } {
  const entry = SENSATIONS[s];
  return { primary: entry.imprints_primary, secondary: entry.imprints_secondary };
}

/**
 * Tabla inversa impronta → sensaciones donde aparece.
 * Se construye en tiempo de carga del módulo.
 */
export const SENSATIONS_BY_IMPRINT: Record<
  ImprintId,
  { primary: SensationId[]; secondary: SensationId[] }
> = (() => {
  const out = {} as Record<
    ImprintId,
    { primary: SensationId[]; secondary: SensationId[] }
  >;
  const allImprints: ImprintId[] = [
    "i1",
    "i2",
    "i3",
    "i4",
    "i5",
    "i6",
    "i7",
    "i8",
    "i9",
    "i10",
    "i11",
    "i12",
    "i13",
  ];
  for (const id of allImprints) out[id] = { primary: [], secondary: [] };
  for (const s of Object.values(SENSATIONS)) {
    for (const ip of s.imprints_primary) out[ip].primary.push(s.id);
    for (const is of s.imprints_secondary) out[is].secondary.push(s.id);
  }
  return out;
})();
