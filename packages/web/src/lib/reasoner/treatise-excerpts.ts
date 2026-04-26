/**
 * Treatise Excerpts — extractos destilados del marco clínico
 *
 * Nota: el Tratado BV4 completo es IP del Dr. Miguel Ojeda Ríos y no
 * forma parte del repositorio público. Este archivo contiene sólo
 * descripciones mecanicistas por impronta — los patrones defensivos
 * operacionalizados dentro del marco Active Inference. Este contenido
 * es análogo a lo que cualquier clínico con entrenamiento en medicina
 * somática reconocería en la literatura (Porges, Levine, van der Kolk,
 * McEwen) ahora aplicado a 13 categorías discretas de prior predictivo.
 *
 * Estos extractos se cargan como contexto al reasoner Opus 4.7 con
 * prompt caching activo. Son ~8k tokens. En producción con casos
 * reales del autor, el razonamiento profundiza leyendo el Tratado
 * completo localmente.
 */

export type ImprintExcerpt = {
  id: string;
  name_es: string;
  mechanism: string;
  shock_originario: string;
  prediccion_implicita: string;
  triple_expresion: {
    somatica: string;
    conductual: string;
    vivencial: string;
  };
  diferenciales: string[];
  zona_canonica: string;
};

export const IMPRINT_EXCERPTS: ImprintExcerpt[] = [
  {
    id: "i1",
    name_es: "Desacople",
    mechanism:
      "Fragmentación de la experiencia ante impacto que supera la ventana de tolerancia. La corteza prefrontal medial se desconecta funcionalmente de la amígdala; el hipocampo reduce actividad bajo cortisol; la experiencia se almacena en pedazos sensoriales sin narrativa coherente. Mediado por complejo dorsal del vago (Porges). Condición de posibilidad de muchas otras improntas (disociación peritraumática como predictor único más potente de PTSD crónico, Ozer 2003).",
    shock_originario:
      "Evento súbito sin anticipación — accidente, agresión imprevista, noticia abrupta, cirugía bajo anestesia insuficiente, desbordamiento temprano sin co-regulación (procedimientos neonatales, separación post-parto). La subitedad, no el contenido, es el criterio.",
    prediccion_implicita:
      "En cualquier momento puede venir un impacto súbito; si estoy integrado cuando llegue, será insoportable.",
    triple_expresion: {
      somatica:
        "Simpáticotonia sostenida; pies y manos frías; sobresalto exagerado; sueño fragmentado; cefalea tensional; bruxismo; HbA1c elevada; HRV reducida.",
      conductual:
        "Episodios de disociación, despersonalización, hipervigilancia, fobias a estímulos sensoriales del evento.",
      vivencial:
        "'No estoy realmente aquí.' 'Una parte de mí se quedó en ese momento.' Pérdida del observador interno.",
    },
    diferenciales: [
      "vs i2: impacto súbito e impersonal (i1) vs traición vincular dirigida (i2)",
      "vs i7: fragmentación con funcionamiento (i1) vs apagado global sin energía (i7)",
      "vs i6: fragmentación involuntaria (i1) vs invisibilidad activa por vergüenza (i6)",
      "vs i5: no acceso a fragmentos (i1) vs acceso sin canal de salida (i5)",
      "vs i9: confusión por fragmentación interna (i1) vs confusión por fusión con otro (i9)",
    ],
    zona_canonica: "Ocular, cervical, pies fríos, periferia desconectada",
  },
  {
    id: "i2",
    name_es: "Acorazamiento",
    mechanism:
      "Blindaje neuromuscular paravertebral y occipital tras traición vincular. Recalibración de neurocepción (Porges): figuras previamente seguras pasan a amenaza potencial. Sistema simpático genera tensión muscular crónica como preparación defensiva permanente para ataque desde la retaguardia. Betrayal trauma (Freyd 1996): el organismo dependiente del agresor no puede registrar la traición conscientemente; la almacena como programa somático de blindaje.",
    shock_originario:
      "Traición de figura de apego primaria; traición en vínculo de intimidad adulta; negligencia emocional sostenida. Criterio: dependencia que impide huir + confianza que hizo la espalda expuesta.",
    prediccion_implicita:
      "Si bajo la guardia, me atacarán por la espalda otra vez.",
    triple_expresion: {
      somatica:
        "Dolor crónico dorsal-occipital; contracturas paravertebrales sin hallazgos imagenológicos; ATM; cefalea tensional con banda occipital; trapecios elevados permanentemente.",
      conductual:
        "Hipervigilancia de intenciones del otro, control en relaciones, pruebas de lealtad, dificultad para recibir cuidado.",
      vivencial:
        "'Siempre me reservo algo.' 'La confianza total es ingenua.' Imposibilidad de intimidad sostenida.",
    },
    diferenciales: [
      "vs i1: traición con agente (i2) vs impacto súbito sin agente (i1)",
      "vs i3: evita al otro por peligro (i2) vs se evita a sí mismo por insuficiencia (i3)",
      "vs i4: busca protección (i2) vs busca justicia (i4)",
      "vs i13: blinda entrada general (i2) vs sella centro cardiaco tras pérdida específica (i13)",
      "vs i6: presente y blindado (i2) vs intenta no estar (i6)",
    ],
    zona_canonica:
      "Trapecios, espalda dorsal, base del cráneo, hombros elevados",
  },
  {
    id: "i3",
    name_es: "Retracción",
    mechanism:
      "Inhibición conductual mediada por núcleo dorsal del rafe (Seligman, indefensión aprendida). Corteza cingulada anterior procesa rechazo social como dolor físico (Eisenberger 2003). A nivel celular, mecanotransducción: cifosis crónica inactiva TAZ/YAP en osteoblastos (Dupont 2011), osteopenia por retracción. El N4 quiere exponerse; el N3 lo impide.",
    shock_originario:
      "Insuficiencia ante figura de evaluación inapelable; vergüenza por lo que se es, no por lo que se hizo; negación de legitimidad de existir. Dos polos: rendimiento y existencia.",
    prediccion_implicita:
      "Si me expongo, seré encontrado insuficiente y rechazado.",
    triple_expresion: {
      somatica:
        "Cifosis dorsal, hombros caídos, dolor lumbar, osteopenia prematura sin causa metabólica, articulaciones de soporte deterioradas.",
      conductual:
        "Perfeccionismo paralizante, procrastinación, autosabotaje (enfermarse antes del examen), evitación de evaluación, dificultad para recibir elogios.",
      vivencial:
        "'No soy suficiente.' 'No doy la talla.' Vergüenza anticipatoria permanente.",
    },
    diferenciales: [
      "vs i4: internaliza culpa (i3) vs externaliza (i4)",
      "vs i2: se evita a sí mismo (i3) vs protege del otro (i2)",
      "vs i5: miedo al juicio (i3) vs canal de salida cerrado (i5)",
      "vs i7: quiere pero no se expone (i3) vs ya no quiere (i7)",
      "vs i9: sabe lo que quiere pero no cree merecerlo (i3) vs no sabe sin el otro (i9)",
    ],
    zona_canonica: "Columna lumbar, articulaciones soporte, postura encogida",
  },
  {
    id: "i4",
    name_es: "Fijación Externa",
    mechanism:
      "Redirección crónica de energía (sistema RAGE de Panksepp) hacia agente identificable. Agresión redirigida sin descarga motora produce hepatotoxicidad catecolaminérgica directa (Joung 2019): radicales hidroxilo en hepatocitos, TNF-α vía células de Kupffer, IL-6 en hepatocitos, hipoxia por vasoconstricción esplácnica.",
    shock_originario:
      "Daño identificable con agente claro; variantes: sin-agente (rabia difusa), incorporación transgeneracional (carga rabia de ancestro).",
    prediccion_implicita:
      "Soltar al culpable hace que el dolor pierda sentido; la demanda abierta es lo que valida lo vivido.",
    triple_expresion: {
      somatica:
        "Disfunción hepatobiliar, hipocondrio derecho tenso, bruxismo, HTA sostenida, marcadores inflamatorios persistentes, triglicéridos altos.",
      conductual:
        "Rumiación crónica sobre agente, resentimiento, demanda de justicia que no se resuelve con reparación.",
      vivencial:
        "'La vida es injusta.' 'Alguien tiene que pagar.' Energía activada al hablar del daño.",
    },
    diferenciales: [
      "vs i3: externaliza culpa (i4) vs la internaliza (i3)",
      "vs i2: busca justicia (i4) vs busca protección (i2)",
      "vs i5: energía busca salida (i4) vs energía bloqueada (i5)",
    ],
    zona_canonica: "Mandíbula, hipocondrio derecho, antebrazos, puños",
  },
  {
    id: "i5",
    name_es: "Compresión",
    mechanism:
      "Cierre del canal expresivo. Van der Kolk (2014): área de Broca reduce actividad en activación traumática. Eje HPT sensible a supresión expresiva sostenida (Goerlich-Votinov 2023): cortisol crónico suprime conversión T4→T3. Tres vías: prohibición, ausencia de receptor, traición del relato.",
    shock_originario:
      "Prohibición directa de expresión; ausencia de receptor sostenida ('emitir no sirve porque nadie llega'); traición del relato (lo contado fue distorsionado o usado en contra).",
    prediccion_implicita:
      "(Prohibición) Si expreso, seré castigado. (Ausencia) Si expreso, nadie va a llegar.",
    triple_expresion: {
      somatica:
        "Disfunción tiroidea, faringitis recurrente, globo faríngeo funcional, rinitis crónica, cefalea tensional, ronquera con carga emocional.",
      conductual:
        "Comunicación oblicua (insinúa vs afirma), guarda secretos con facilidad, ira contenida con estallidos impredecibles (vía prohibición), abandono del intento de pedir (vía ausencia).",
      vivencial:
        "'Sé lo que siento pero algo me impide decirlo.' 'Tengo razón y nadie me hace caso.'",
    },
    diferenciales: [
      "vs i2: cierra salida (i5) vs blinda entrada (i2)",
      "vs i3: canal cerrado (i5) vs miedo al juicio (i3)",
      "vs i8: quiere conectar pero sin canal (i5) vs prefiere no necesitar (i8)",
      "vs i6: no ser oído (i5) vs no ser visto (i6)",
    ],
    zona_canonica: "Garganta, tiroides, cervical anterior, cefalea",
  },
  {
    id: "i6",
    name_es: "Camuflaje",
    mechanism:
      "Invisibilización defensiva tras ultraje con testigo cómplice. Eisenberger (2012): humillación activa corteza cingulada anterior e ínsula como dolor físico. Piel (mismo origen ectodérmico que SNC) expresa estado: mastocitos liberan histamina bajo estrés crónico; barrera epidérmica se debilita. Coactivación paradójica dorsal-vagal + simpático (Porges).",
    shock_originario:
      "Violación de dignidad con agresor identificable; agresión auditiva sostenida; cuidador como fuente simultánea de protección y amenaza; bullying sostenido. Testigo silencioso consolida la internalización.",
    prediccion_implicita:
      "(Capa 1) Si me ven, me destruyen. (Capa 2) Si alguien ve lo que me hicieron, tampoco va a decir nada.",
    triple_expresion: {
      somatica:
        "Dermatitis atópica, psoriasis, vitíligo, acné crónico resistente, rubor facial incontrolable, hiperhidrosis, cifosis con hombros cerrados hacia adelante.",
      conductual:
        "Minimización de presencia, conformismo, perfeccionismo como control de exposición, estallidos de ira comprimida en contextos aparentemente seguros.",
      vivencial:
        "'Yo soy el error.' 'Si supieran lo que me hicieron sentirían vergüenza de mí.' Vergüenza tóxica post-ultraje.",
    },
    diferenciales: [
      "vs i3: 'soy el error' (i6) vs 'no doy la talla' (i3) — vergüenza tóxica vs insuficiencia",
      "vs i5: evita ser visto (i6) vs no puede hablar (i5)",
      "vs i7: esfuerzo activo por no ser visto (i6) vs ya no hay energía (i7)",
      "vs i4: internaliza ataque (i6) vs lo mantiene afuera como demanda (i4)",
      "vs i2: reduce superficie (i6) vs blinda presencia (i2)",
    ],
    zona_canonica: "Piel, cara, cuello, manos, cifosis torácica",
  },
  {
    id: "i7",
    name_es: "Hibernación",
    mechanism:
      "Shutdown dorsal-vagal completo mediado por PAG-vl (Kozlowska 2015). Bradicardia, hipotensión, colapso metabólico. Eje HPT suprimido. Panksepp: colapso del sistema SEEKING. Frontera entre defensa activa y post-rendición. PRECAUCIÓN: requiere evaluación de riesgo (ideación pasiva).",
    shock_originario:
      "Período prolongado de intentos fracasados; 'apagado progresivo no elegido'. El sistema evaluó que ninguna acción disponible es viable.",
    prediccion_implicita:
      "Las condiciones no van a mejorar; todo esfuerzo es inútil.",
    triple_expresion: {
      somatica:
        "Fatiga crónica profunda, hipotensión, bradicardia, anhedonia, hipotiroidismo subclínico, enfermedad autoinmune activa, fibromialgia.",
      conductual:
        "Piloto automático, cumplimiento mínimo, ausencia de interés, no es flojera — la energía literalmente no está.",
      vivencial:
        "'La vida no tiene sentido.' 'No tengo razones para movilizarme.'",
    },
    diferenciales: [
      "vs i1: apagado global (i7) vs fragmentación funcionante (i1)",
      "vs i11: sin energía (i7) vs energía repartida entre programas (i11)",
      "vs i3: ya no quiere (i7) vs quiere pero no se expone (i3)",
      "vs i10: sin energía para empezar (i7) vs se detiene antes de completar (i10)",
    ],
    zona_canonica: "Depleción global, sin localización específica",
  },
  {
    id: "i8",
    name_es: "Reserva",
    mechanism:
      "Circuito PANIC/GRIEF (Panksepp) activado por separación temprana. Eje HPA crónico eleva cortisol → aldosterona → retención renal de Na/H2O. Reprogramación epigenética de HSD11B1, leptina, melanocortina, NPY (Lemche 2016, Tyrka 2012). Perfil metabólico orientado al almacenamiento.",
    shock_originario:
      "Separación/ausencia prolongada de cuidador principal antes de los 6 años; escasez sostenida de recursos (afecto, atención, material).",
    prediccion_implicita:
      "Si suelto lo que tengo, me quedo sin lo que necesito para sobrevivir.",
    triple_expresion: {
      somatica:
        "Retención de líquidos, acumulación visceral, HbA1c pre-diabético, HOMA-IR elevado, HDL bajo, hambre nocturna.",
      conductual:
        "Dificultad para soltar objetos/costumbres, acumulación compulsiva, hambre nocturna, necesidad de saber que hay reservas disponibles.",
      vivencial:
        "'Algún día me voy a quedar sin nada.' Miedo difuso a la escasez afectiva y material.",
    },
    diferenciales: [
      "vs i9: escasez de recursos (i8) vs disolución de identidad (i9)",
      "vs i12: escasez material/afectiva (i8) vs pérdida de territorio (i12)",
      "vs i13: sigue buscando con reserva (i8) vs corazón sellado (i13)",
    ],
    zona_canonica: "Abdomen, acumulación visceral, cadena prensión",
  },
  {
    id: "i9",
    name_es: "Confluencia",
    mechanism:
      "Ausencia de diferenciación identitaria. Circuitos de autorregulación (PFC medial, ínsula, cingulada) se desarrollaron con dependencia funcional del otro (Siegel 2012). Sistema de neuronas espejo (Rizzolatti) hiperactivado. HRV reducida en inseguridad vincular. Frecuente instalación intrauterina.",
    shock_originario:
      "Simbiosis sin individuación; identidad no aceptada (género, temperamento, orientación no bienvenidos); impronta intrauterina (ambiente emocional hostil pre-natal).",
    prediccion_implicita: "Si existo separado del otro, desaparezco.",
    triple_expresion: {
      somatica:
        "Arritmias funcionales, taquicardia ante separación, HRV reducida, Takotsubo en casos extremos.",
      conductual:
        "Codependencia, dificultad para decidir solo, relaciones tóxicas repetitivas, pérdida de identidad al terminar vínculos.",
      vivencial:
        "'No sé quién soy cuando estoy solo.' No duelo — inexistencia al perder el vínculo.",
    },
    diferenciales: [
      "vs i8: pérdida de identidad (i9) vs pérdida de recursos (i8)",
      "vs i13: corazón abierto sin límites (i9) vs corazón cerrado (i13)",
      "vs i11: fusión con presencia (i9) vs fusión con ausencia (i11)",
      "vs i3: no tiene yo consolidado (i9) vs yo que se esconde (i3)",
    ],
    zona_canonica: "Pecho, corazón, cardiovascular",
  },
  {
    id: "i10",
    name_es: "Vinculación",
    mechanism:
      "Síntoma mantenido como forma de pertenecer. Aprendizaje implícito temprano (amígdala, ganglios basales). Efecto nocebo hiperactivo (Wittkamp 2024, Karacaoglu 2024): el sistema nervioso amplifica activamente señales de daño; genera 'predicciones de no-curación' que bloquean respuesta al tratamiento.",
    shock_originario:
      "Lealtad somática (enfermarse junto al enfermo); duelo no completado (el síntoma mantiene vivo al ausente); lugar vincular (enfermedad como lugar en sistema familiar).",
    prediccion_implicita:
      "Si sano, los pierdo o los traiciono.",
    triple_expresion: {
      somatica:
        "Enfermedad crónica refractaria, recaídas programadas en mejoría, respuesta paradójica a tratamiento, síntomas que replican a familiar.",
      conductual:
        "Autosabotaje terapéutico, abandono de tratamiento al funcionar, búsqueda de nuevos tratamientos sin completar ninguno.",
      vivencial:
        "'No merezco sanar.' Culpa ante mejoría. 'Si sano ¿qué pasa con él/ella?'",
    },
    diferenciales: [
      "vs i7: se detiene justo antes de completar (i10) vs no tiene energía para empezar (i7)",
      "vs i11: síntoma propio por lealtad (i10) vs síntoma ajeno incorporado (i11)",
      "vs i3: autosabotaje por lealtad (i10) vs por miedo al juicio (i3)",
    ],
    zona_canonica: "Zona del síntoma que el sistema mantiene activo",
  },
  {
    id: "i11",
    name_es: "Superposición",
    mechanism:
      "Operación simultánea de dos biografías. Yehuda (2015): marcas epigenéticas transgeneracionales (FKBP5). Gemelo evanescente (36% embarazos gemelares): organismo sobreviviente registra ausencia a nivel celular. Activación crónica del sistema PANIC/GRIEF sin objeto consciente; desregulación de serotonina/norepinefrina sin precipitante.",
    shock_originario:
      "Gemelo perdido en gestación; información transgeneracional no procesada; biografía incorporada por lealtad implícita a ancestro.",
    prediccion_implicita:
      "Si diferencio lo mío de lo del otro, lo traiciono o lo pierdo definitivamente.",
    triple_expresion: {
      somatica:
        "Fatiga crónica sin causa médica, depresión endógena sin precipitante, alteraciones circadianas, síntomas sin correlato biográfico.",
      conductual:
        "Tristeza crónica 'siempre he sido así', aniversarios dolorosos sin causa consciente, afinidad inexplicable con épocas/lugares/temas.",
      vivencial:
        "'No sé por qué estoy triste, mi vida está bien.' Presencia interna no identificada. 'Cargo algo que no es mío.'",
    },
    diferenciales: [
      "vs i10: sufrimiento ajeno cargado (i11) vs fidelidad al propio síntoma (i10)",
      "vs i7: energía repartida (i11) vs sin energía (i7)",
      "vs i9: ausencia (i11) vs presencia (i9)",
    ],
    zona_canonica: "Carga difusa sin localización, ritmos circadianos",
  },
  {
    id: "i12",
    name_es: "Desarraigo",
    mechanism:
      "Emergencia territorial permanente. Sistema PANIC/GRIEF + estrés extremo. Túbulo colector renal retiene agua/sodio bajo ADH/aldosterona. Estrés crónico de alta intensidad asociado a ERC (UK Biobank 2024). Modelo: vasopresina → V2 → AQP2 → retención.",
    shock_originario:
      "Pérdida de territorio físico; exclusión del grupo o rol; identidad sin territorio (hijos de migrantes, múltiples mudanzas).",
    prediccion_implicita:
      "No hay suelo seguro, la emergencia es permanente.",
    triple_expresion: {
      somatica:
        "Retención extrema de líquidos, disfunción renal funcional, edema, alteraciones metabólicas por estrés crónico.",
      conductual:
        "Nomadismo, dificultad para enraizarse, búsqueda permanente de un lugar.",
      vivencial:
        "'No soy de aquí ni de allá.' Exiliado interno. 'En otro lugar estaré mejor.'",
    },
    diferenciales: [
      "vs i8: escasez de suelo (i12) vs escasez afectiva (i8)",
      "vs i7: emergencia permanente (i12) vs apagado (i7)",
      "vs i9: sin lugar (i12) vs sin identidad (i9)",
    ],
    zona_canonica: "Pies, cadena de soporte, zona renal, lumbar",
  },
  {
    id: "i13",
    name_es: "Encapsulamiento",
    mechanism:
      "Sellado del centro emocional tras impacto directo. Locus coeruleus emite descarga masiva de noradrenalina → β-adrenérgicos cardíacos → taquicardia/arritmias. En extremos, Takotsubo (toxicidad catecolaminérgica ápex ventricular sin obstrucción coronaria). Sistema reduce sensibilidad del circuito para proteger de segunda tormenta catecolaminérgica. PRECAUCIÓN: máxima gentileza; temporalidad lenta.",
    shock_originario:
      "Impacto directo a vínculo de pareja; pérdida irreemplazable (hijo, primer amor); desilusión radical (lo amado se revela distinto de lo creído).",
    prediccion_implicita:
      "Si abro el corazón otra vez, el impacto será insoportable.",
    triple_expresion: {
      somatica:
        "Arritmias, taquicardia paroxística, dolor precordial funcional, HTA funcional, HRV reducida, antecedente o sospecha de Takotsubo.",
      conductual:
        "Evitación de intimidad profunda, vínculos a distancia del centro, dificultad para volver a amar con intensidad.",
      vivencial:
        "'Ya no me vuelvo a enamorar así.' Nostalgia crónica por amor perdido. Corazón sellado.",
    },
    diferenciales: [
      "vs i9: corazón sellado tras pérdida (i13) vs nunca hubo yo separado (i9)",
      "vs i2: sella centro (i13) vs blinda entrada (i2)",
      "vs i8: cerró el circuito (i13) vs sigue acumulando (i8)",
    ],
    zona_canonica: "Zona precordial, pericardio, cardiovascular",
  },
];

/**
 * Genera el bloque de sistema de texto para cargar el Tratado en
 * contexto cacheado del reasoner. Compactado para mantenerse bajo
 * 10k tokens.
 */
export function renderTreatiseContext(): string {
  const parts: string[] = [
    "# Tratado BV4 — Extractos Canónicos de las 13 Improntas de Supervivencia",
    "",
    "Cada impronta es un ciclo defensivo interrumpido que se instaló como programa biológico activo. El marco operativo es Active Inference: la impronta es un prior predictivo rígido que dirige la alostasis. El trabajo clínico identifica el prior, lo visibiliza al paciente, y restaura la agencia del sistema para actualizarlo.",
    "",
  ];
  for (const i of IMPRINT_EXCERPTS) {
    parts.push(`## ${i.id} — ${i.name_es}`);
    parts.push(`**Mecanismo**: ${i.mechanism}`);
    parts.push(`**Shock originario**: ${i.shock_originario}`);
    parts.push(`**Predicción implícita**: ${i.prediccion_implicita}`);
    parts.push(`**Expresión somática**: ${i.triple_expresion.somatica}`);
    parts.push(`**Expresión conductual**: ${i.triple_expresion.conductual}`);
    parts.push(`**Expresión vivencial**: ${i.triple_expresion.vivencial}`);
    parts.push(`**Zona canónica**: ${i.zona_canonica}`);
    parts.push(`**Diferenciales clave**:`);
    for (const d of i.diferenciales) parts.push(`- ${d}`);
    parts.push("");
  }
  parts.push(
    "## Criterio de clasificación",
    "",
    "1. La impronta se instala por shock originario que interrumpe el ciclo defensivo. La firma resultante es multimodal (somática+conductual+vivencial).",
    "2. Identificación requiere convergencia entre al menos dos canales: narrativa del shock, firma somática observable, predicción implícita detectable, patrón conductual crónico.",
    "3. Co-activaciones son frecuentes: i1+i2 (traición súbita), i3+i5 (crítica+silencio), i8+i9 (abandono temprano), i2+i13 (traición+pérdida amorosa).",
    "4. Cualquier hipótesis debe poder defenderse citando fragmentos específicos del caso que apoyan el diagnóstico y explicando qué diferenciales descarta y cómo.",
  );
  return parts.join("\n");
}
