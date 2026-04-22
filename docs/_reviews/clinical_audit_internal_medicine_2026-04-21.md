---
review_type: "AI-generated clinical self-audit"
reviewer_agent: "Claude Opus 4.7, role-prompted as internal medicine / endocrinology / functional medicine specialist"
authority: "None — technical audit only. Not a human peer review. Not clinical validation."
review_date: "2026-04-21"
files_reviewed: ["i1_desacople.md", "i4_fijacion_externa.md", "i7_hibernacion.md", "i8_reserva.md"]
human_reviewer: "Dr. Miguel Ojeda Rios (pending)"
---

# Auditoría Clínica Automatizada — Firmas de Improntas i1, i4, i7, i8

> ⚠️ **Importante — naturaleza de este documento**
>
> Este informe fue generado por un **agente de inteligencia artificial (Claude Opus 4.7)** al que se le asignó un **rol simulado** de médico internista con subespecialidad en endocrinología y medicina funcional. **No es la opinión de una persona real ni de un profesional certificado**. Es una auditoría técnica automatizada cuyo propósito es detectar inconsistencias numéricas, contradicciones internas y problemas de discriminabilidad en las firmas clínicas antes de cerrar el MVP del hackathon.
>
> **La validación clínica formal corresponde al autor humano del proyecto (Dr. Miguel Ojeda Rios)**, quien es la única autoridad clínica del marco BV4 subyacente. Las referencias bibliográficas citadas son fuentes estándar de la literatura científica revisada; no implican que un experto humano las haya verificado en este documento.
>
> Los números de línea refieren a los archivos de firmas tal como existían al 2026-04-21.

---

## Resumen ejecutivo

- **Solidez global: medio-alta.** La arquitectura de 10 dimensiones está bien pensada, las referencias canónicas (McEwen, Porges, Panksepp, Klengel/Binder, Thayer, Heim/Fries) son las correctas, y cada impronta tiene una identidad fisiológica reconocible. Un endocrinólogo lector medio reconocería el perfil en 4 de 4 casos sin ayuda.
- **Punto más fuerte:** i7 Hibernación está excepcionalmente bien capturada — la nota explícita de "RMSSD elevada NO es salud" (l.88) es clínicamente precisa y evita el error de interpretación más frecuente. i8 Reserva es igualmente coherente internamente.
- **Punto más débil:** i1 Desacople tiene una **contradicción interna no resuelta** entre cortisol matutino 20.5 μg/dL y "flattening index" 0.65 (sección 2, l.48-50). Un eje con cortisol tan alto matutino Y CAR +7.0 Y rigidez 0.65 es fisiológicamente borderline — la rigidez alta implica pérdida de diferencia AM/PM, lo que suele correlacionar con cortisol PM elevado + CAR reducida, no con CAR exagerada. Este nodo debe aclararse (ver hallazgo i1-2).
- **Riesgo de discriminabilidad:** i1 vs i8 se superponen en > 5 dimensiones numéricas (cortisol matutino idéntico 20.5, HDL ~42, HRV casi clavado, visceral fat 14 vs 15). La separación descansa casi en un solo número: CAR diurnal rigidity (0.65 idéntico entre i1 e i8). **Esto es un problema estructural que explica por qué el clasificador debe pedir valores de interocepción/arquetipo narrativo para converger.**
- **Over-confidence probable:** los σ de HbA1c en i8 (±0.3) y fasting glucose en i8 (±8) son demasiado estrechos y generan la posterior 0.973 artificialmente. Con σ endocrinológicamente realistas (±0.45 y ±12) la posterior bajaría a un rango más defendible (0.75-0.85).
- **Recomendación global:** MVP puede avanzar con **6-8 ajustes numéricos críticos** (enumerados en "Must-fix"). Ningún defecto es bloqueante conceptual. La arquitectura resiste.

---

## Hallazgos por impronta

### i1 Desacople
**Nivel de solidez: medio-alto**

**Fortalezas**:
- Buena incorporación del subgrupo hipocortisolémico (Yehuda 2005) como nota explícita en l.48 y en "labs discrepancies" l.170. Es una distinción clínicamente real.
- Autonomic balance internamente coherente: dominancia simpática 0.72 con bimodalidad dorsal 0.16 refleja adecuadamente el patrón descrito por Kozlowska (2015) y Porges.
- HRV (SDNN 28 / RMSSD 18 / LF/HF 3.2) plenamente coherente con PTSD crónico; matches con meta-análisis Thayer 2012.
- Arquitectura de sueño realista: SWS 10%, REM 14%, latencia 35 min — consistente con PSG de TEPT (Mellman 2007).

**Observaciones críticas**:
- **i1-1 (HPA incoherencia interna).** Sección 2 (l.47-51): cortisol matutino **20.5 μg/dL**, CAR **+7.0 Δ**, flattening index **0.65**. En endocrinología clásica, flattening 0.65 describe ritmo aplanado (pérdida de caída vespertina), lo cual suele coexistir con CAR *disminuida*, no exagerada. El enunciado actual sostiene simultáneamente "hipervigilancia con CAR+ exagerada" y "ritmicidad aplanada", lo que típicamente son dos fenotipos distintos (reactivo vs. exhausto). Propuesta: reducir flattening a **0.45 ±0.15** para la fase reactiva, o bien mantener 0.65 y reducir CAR a **4.0-5.0 Δμg/dL**. Sin este ajuste, el perfil HPA de i1 e i8 queda casi indistinguible.
- **i1-2 (HbA1c 5.9 con HOMA-IR 2.9).** Sección 3 (l.59-60): HbA1c 5.9 ±0.5 y HOMA-IR 2.9 ±0.9. La combinación es plausible pero la σ de HbA1c es generosa (±0.5 es amplia); con fasting glucose 102 ±12, el sistema admite glucemia hasta 114 mg/dL con HbA1c 5.4 — clínicamente implausible. Sugiero **HbA1c 5.8 ±0.35** para tightening sin perder realismo.
- **i1-3 (TG 165 / HDL 42 sin enzimas hepáticas).** Dislipidemia típica pero sin ALT/GGT — no bloqueante, pero una sola variable hepática (GGT) permitiría diferenciar i1 de i4 (donde GGT debería ser más elevada por la cadena hepatobiliar).

**Observaciones menores**:
- **i1-4 (rs2254298 OXTR, l.120).** Etiquetado como [INFER] correctamente. La literatura de rs2254298 y disociación es débil; el prior +0.20 es generoso. Considerar reducir a +0.15 o marcar para curación.
- **i1-5 (COMT Val158Met +0.35, l.113).** El rationale dice "catabolismo lento" — esto aplica al alelo **Met**, no al Val. Aclarar en el rationale: "Met/Met: catabolismo lento de catecolaminas prolonga respuesta simpática". Esta aclaración falta y causaría confusión en revisión.
- **i1-6 (microbiota).** F/B 2.5 + Bacteroides-dominant: combinación internamente inconsistente con la literatura clásica (F/B elevada implica Firmicutes-dominant, no Bacteroides). Revisar.

---

### i4 Fijación Externa
**Nivel de solidez: medio**

**Fortalezas**:
- Separación conceptual clara frente a i1 ("simpático dirigido vs difuso") bien argumentada y traducible a números (LF/HF 4.2 vs 3.2).
- Latencia de sueño 55 min como firma específica diferencial — muy buena elección clínica; es exactamente lo que describiría un paciente con hostilidad rumiante.
- TNF-α 3.2 pg/mL desproporcionado vs CRP/IL-6: hipótesis razonable, literatura de hostilidad crónica (Suarez, Mostofsky) lo respalda parcialmente. Marcado [INFER] con honestidad.
- Incorporación de PAS 138 y LDL 145 en nota (l.68) — clínicamente imprescindible para el arquetipo RAGE.

**Observaciones críticas**:
- **i4-1 (COMT dirección ambigua).** Sección 8 (l.122): el texto señala a la vez Val/Val **y** Met/Met como posibles explicaciones, con [CONFIRMAR]. En literatura de agresividad reactiva, la evidencia apunta consistentemente a **Val158** (catabolismo rápido prefrontal → menor control top-down sobre amígdala). Met se asocia a mayor ansiedad, no a hostilidad. Recomendación firme: eliminar la ambigüedad y comprometerse con Val como alelo i4.
- **i4-2 (CAR 8.5 con flattening 0.45).** CAR 8.5 Δμg/dL es muy alto — percentil > 90 en literatura normativa (Pruessner). Combinado con flattening 0.45 (ritmicidad relativamente conservada) da un fenotipo reactivo nítido, lo cual es coherente con i4. Sin embargo, CAR 8.5 > i8 (7.5) > i1 (7.0) establece un orden que debería justificarse explícitamente; actualmente el ordenamiento parece arbitrario.
- **i4-3 (Perfil cardiovascular "flotante").** La nota l.68 añade PAS 138 y LDL 145 pero no están en las 10 dimensiones del schema. Si el parser no los lee, no alimentan la clasificación. **Decisión MVP:** o se añade "cardiovascular" como 11ª dimensión (o se incorpora al bloque metabólico), o estos valores son decorativos. Recomiendo incorporarlos al bloque metabólico como campos opcionales.
- **i4-4 (HOMA-IR 2.3 + fasting 97 + HbA1c 5.7).** Coherencia interna aceptable. Pero TG 185 + HDL 40 implican dislipidemia aterogénica franca; en esa constelación HbA1c 5.7 es el límite inferior de lo que uno esperaría — sugiero subir media a **5.8 ±0.4** para consistencia.

**Observaciones menores**:
- **i4-5 (MAOA-uVNTR +0.45).** El prior más alto del set. Defendible (Caspi 2002), pero +0.45 es agresivo para una variante con GxE dependiente de maltrato infantil. Considerar +0.35 o mantener +0.45 solo si hay evidencia biográfica de exposición temprana.
- **i4-6 (Microbiota Firmicutes-dominant + F/B 3.0).** Consistente internamente (a diferencia de i1). Bien.
- **i4-7 (Awakenings 4 ±2).** Con latencia 55 min y SWS 11%, awakenings 4 es moderado. Sería más coherente 5-6 por rumiación nocturna activa. No bloqueante.

---

### i7 Hibernación
**Nivel de solidez: alto**

**Fortalezas**:
- **Pitfall de RMSSD explícito** (l.88 + labs discrepancies l.175). Éste es el acierto clínico más importante de las cuatro firmas. Un internista inexperto leería RMSSD 45 ms como "HRV sana" — la nota lo previene explícitamente. Conservar tal cual.
- HPA perfectamente coherente: cortisol 9.0, CAR 1.0, flattening 0.78, reactividad 1.3 — fenotipo Fries/Heim canónico de hipocortisolismo. Sin objeciones.
- Metabólico "low-normal" internamente armonioso: HbA1c 5.0 + HOMA-IR 1.2 + fasting 85 + TG 110 + HDL 55. Este cuadro es precisamente el del paciente de CFS/depresión atípica bien descrito.
- Selección genética centrada en DIO2, MTHFR, NDUFS3, NR3C1 (BclI), FKBP5 es exactamente el eje mitocondrial-tiroideo-glucocorticoide esperado.
- Evaluación de riesgo suicida señalada en l.155 y l.228 — **responsabilidad clínica que debe preservarse en producción**.

**Observaciones críticas**:
- **i7-1 (SDNN 52 ±25).** σ ±25 sobre media 52 (CoV ~48%) es enorme y refleja bimodalidad real. El problema operativo: un Bayesiano gaussiano multivariante con σ tan amplia penaliza poco los outliers, lo que resta poder discriminante en i7 vs pacientes con HRV alta sana. Propuesta: modelar i7-HRV como mezcla de dos gaussianos (subfase dorsal-alta vs subfase agotamiento), o reducir σ a ±15 aceptando que la subfase agotamiento queda fuera de ±1σ.
- **i7-2 (Treg/Th17 0.70 con cortisol bajo).** Sección 4: el ratio Treg/Th17 = 0.70 se presenta como "desbalance pro-inflamatorio". Fisiopatológicamente, hipocortisolismo (cortisol 9.0) debería **reducir** el freno glucocorticoideo sobre Th17 y producir un ratio aún más bajo (p.ej. 0.55-0.60). 0.70 es ambiguo — en algunos papers de depresión, 0.70 está en rango limítrofe. Precisar: ¿la dirección es claramente pro-inflamatoria o conservada? Si autoinmunidad es la expresión clínica esperada (Hashimoto, lupus), Th17 relativamente elevado es consistente — pero entonces el número debería ser **0.55 ±0.15** para reflejarlo sin ambigüedad.
- **i7-3 (NDUFS3 rs4147929).** Marcado [INFER rsID]. Mi conocimiento no valida rs4147929 como variante canónica de NDUFS3 ligada a fatiga. Verificar — posiblemente se buscaba una variante de NDUFS1/NDUFS7 o una SNP de complejo I mejor documentada (p.ej. en MT-ND genes). Si no se puede validar, retirar del MVP y reemplazar por **TOMM40** o **PPARGC1A (rs8192678)** que tienen evidencia más sólida en fatiga metabólica.
- **i7-4 (Sleep latency 12 ±8 vs SWS 25%).** Latencia corta con SWS elevada describe bien hipersomnia no-restaurativa. No hay objeción; pero awakenings 1 ±1 es quizás optimista — pacientes con SFC frecuentemente reportan > 2 despertares nocturnos. Considerar 2 ±1.5.

**Observaciones menores**:
- **i7-5 (Body water 53% con hipoperfusión).** Razonable; mantener.
- **i7-6 (FTO +0.20).** Incluir FTO en i7 es defendible por su rol en regulación energética central, pero el rationale actual es débil. Reducir a +0.15 o retirar — FTO pesa más en i8.

---

### i8 Reserva
**Nivel de solidez: medio-alto**

**Fortalezas**:
- Arquetipo clínico (l.163) muy bien escrito — captura con precisión el fenotipo de paciente con predicción de escasez. Utilizable tal cual en material educativo.
- Metabolic block (HbA1c 6.0, HOMA-IR 3.0, fasting 104, TG 175, HDL 42) es internamente coherente y clínicamente canónico del síndrome metabólico cortisol-mediado (Bjorntorp, Rosmond).
- SNPs enfocados en FTO/MC4R/LEPR/PPARG + OXTR + FKBP5: mapeo eje metabólico + vincular + HPA, bien argumentado.
- Hiperfagia nocturna como síntoma cardinal, con CAR exagerada como firma HPA diferencial frente a i7 — lógica clínica sólida.

**Observaciones críticas**:
- **i8-1 (σ demasiado estrechos).** Tabla de la sección 3: HbA1c ±0.3, fasting glucose ±8, HOMA-IR ±0.6, HDL ±6. Comparado con variabilidad intra-individual documentada (CoV de HbA1c intra-sujeto ~3-4% = ±0.2 sobre 6.0, pero inter-sujeto con la misma condición es 8-12% = ±0.5-0.7), estos σ reflejan variabilidad analítica, no poblacional. **Consecuencia directa:** el patient_001 cae en |Z| < 0.4 en 7/7 variables simultáneas, lo cual es prácticamente determinista. Recomiendo: HbA1c ±0.45, fasting ±12, HOMA-IR ±0.9, HDL ±8. Con estas σ la posterior de i8 bajaría del 0.973 reportado a ~0.80-0.85, que es defendible clínicamente.
- **i8-2 (CAR 7.5 con flattening 0.65).** Misma tensión que en i1 (observación i1-1): CAR exagerada + flattening alto es el fenotipo "eje rígidamente encendido" descrito en el archivo (l.54, l.182). Este fenotipo *existe* en literatura de burnout con rigidez (Miller 2007), pero debería argumentarse: "la rigidez en i8 no es por aplanamiento sino por pérdida de plasticidad con amplitud conservada". Añadir esta nota explícita evita que un endocrinólogo marque el ítem como incoherente.
- **i8-3 (Treg/Th17 0.75).** Muy cerca del rango de control sano (~0.80-0.90). Para i8 con inflamación visceral genuina esperaría 0.65-0.70. Ajustar a **0.68 ±0.15**.
- **i8-4 (body water 54% + retención hidrosalina leve).** La nota "retención hidrosalina compensada" es clínicamente correcta, pero body water 54% es medio-bajo — si hay retención genuina esperaríamos 56-58%. Reconsiderar o aclarar (agua total vs. intersticial vs. intracelular).

**Observaciones menores**:
- **i8-5 (Visceral fat 15% ±4).** Rango razonable. Si la intención clínica es capturar "adiposidad visceral desproporcionada al IMC", considerar añadir un parámetro derivado tipo visceral-to-total-fat ratio que es más específico.
- **i8-6 (Sleep latency 22 ±8 con awakenings 2.5).** Coherente. Awakenings 2.5 bien calibrado para hiperfagia nocturna.
- **i8-7 (ADRB3 rs4994 +0.25).** Defendible. No objeciones.

---

## Discriminabilidad cruzada

### Matriz de riesgo de superposición

| Par | Dimensiones con solapamiento problemático | Dimensiones que discriminan bien |
|---|---|---|
| **i1 vs i4** | HbA1c (5.9 vs 5.7), HDL (42 vs 40), visceral fat (14 vs 11), SDNN (28 vs 32), cortisol matutino (20.5 vs 19.5) | LF/HF (3.2 vs 4.2), sleep latency (35 vs 55), TNF-α (2.5 vs 3.2), autonomic fractions |
| **i1 vs i7** | Muy buena separación — HPA invertido, HRV invertido, metabólico opuesto | Casi todas las dimensiones |
| **i1 vs i8** | **Severa superposición**: cortisol (20.5 idéntico), CAR (7.0 vs 7.5), flattening (0.65 idéntico), HDL (42 idéntico), HOMA-IR (2.9 vs 3.0), visceral fat (14 vs 15), LF/HF (3.2 vs 2.7) | Únicamente sleep architecture (i1 más fragmentada), interocepción (i1 más disociativa), y SNP set |
| **i4 vs i7** | Excelente separación | Todas las dimensiones |
| **i4 vs i8** | HbA1c (5.7 vs 6.0), TG (185 vs 175), HDL (40 vs 42), cortisol (19.5 vs 20.5), F/B (3.0 idéntico) | LF/HF (4.2 vs 2.7), sleep latency (55 vs 22), HOMA-IR (2.3 vs 3.0), visceral fat (11 vs 15), TNF-α |
| **i7 vs i8** | Ninguna problemática | Todas las dimensiones — opuestos polares |

**Hallazgo central:** el par **i1 vs i8** es el punto débil estructural del sistema. Ambos son "sympathetic-HPA-elevated" con metabólico similar. La distinción depende casi exclusivamente de arquitectura del sueño (fragmentación en i1 vs mantenimiento con despertar temprano en i8) e interocepción (disociativa vs controladora). Recomendación: **amplificar numéricamente las diferencias** en variables intermedias:
- En i1, reducir HOMA-IR a 2.5 y dejar fasting glucose 100 (el perfil es más adrenérgico-PTSD que cortisol-visceral).
- En i1, bajar visceral fat a 11-12% (la disociación clásica no cursa con visceral prominente; la obesidad visceral es marcadora de i8).
- En i1, subir CAR a 8.0 y flattening a 0.55 (más reactivo); en i8 mantener CAR 7.5 pero flattening 0.70 (más rígido).

Con estos tres movimientos la distancia de Mahalanobis i1↔i8 crece sustancialmente y la posterior se vuelve genuinamente informativa.

### Dimensiones con mayor poder discriminante (orden de utilidad)

1. **HPA reactivity amplitude** — i1 (3.5) / i4 (5.0) / i7 (1.3) / i8 (2.8). Excelente separador.
2. **LF/HF ratio** — i1 (3.2) / i4 (4.2) / i7 (0.7) / i8 (2.7). Muy buen separador si se añade i4.
3. **Morning cortisol** — i1 (20.5) / i4 (19.5) / i7 (9.0) / i8 (20.5). Bueno para aislar i7; inútil para i1 vs i8.
4. **Sleep latency** — i1 (35) / i4 (55) / i7 (12) / i8 (22). Cuatro niveles separables.
5. **Treg/Th17** — valores 0.65 / 0.60 / 0.70 / 0.75: demasiado cercanos entre sí (σ ±0.15-0.18). **Actualmente no discrimina**; considerar retirar del vector operativo o reforzar diferencias.
6. **Visceral fat % + lean mass %** — composición corporal separa i7/i8 de i1/i4 razonablemente; dentro del par i1/i8 falla.

---

## Preocupaciones globales

### Over-confidence en σ
Los σ están calibrados por analogía más que por datos poblacionales. En i8 particularmente, HbA1c ±0.3 y fasting ±8 son estrechos para variabilidad inter-individual esperada. Con estos σ, un paciente cuyos labs caen en la media exacta produce posteriors > 0.95 por construcción gaussiana. **Un σ realista debería estar en 10-12% de la media en biomarcadores metabólicos, no 5%.** Esta es la explicación fisiopatológicamente más probable del reportado 0.973 — no es que el clasificador sea brillante, es que los σ están apretados.

### Dimensiones clínicamente críticas ausentes
- **Presión arterial (sistólica/diastólica).** Ausente en las cuatro firmas. En i4 es cardinal (hipertensión sistólica reactiva), en i8 limítrofe, en i7 hipotensión ortostática, en i1 labilidad. Su omisión es una pérdida de discriminabilidad gratuita.
- **GGT/ALT.** Hepatobiliar es central en i4; su ausencia deja el "eje hepatobiliar" del RAGE como narrativo, no mensurable.
- **TSH, T3 libre, T4 libre.** i7 las menciona en "labs discrepancies" pero no en schema numérico. Debería cuantificarse (especialmente T3 libre y T3/T4 ratio como proxy de DIO2).
- **Ferritina.** Marcador consistentemente bajo en i7; central en arquetipo clínico y ausente en schema.
- **Vitamina D (25-OH).** Aparece en patient_001 labs pero no en ninguna firma — discrepancia menor.
- **Aldosterona / renina** (solo relevante si se quiere medir retención hidrosalina en i8).
- **Frecuencia cardíaca en reposo.** Dato barato, captador independiente del tono autonómico, y ausente.

### Alta varianza inter-rater esperada
Si se entrega este documento a 10 internistas experimentados, los puntos de mayor desacuerdo previsibles serían:

1. **Cortisol matutino μg/dL vs nmol/L en turno matutino vs despertar.** No se especifica el método (saliva vs suero; al despertar vs 8am). Diez internistas darían valores muy distintos según el método asumido. **Especificar: "cortisol sérico a las 08:00" o "cortisol salival al despertar".**
2. **Flattening index escala 0-1.** Definición no canónica; distintos autores (Kraemer, Adam, Saxbe) usan métricas distintas (pendiente de regresión, diurnal slope, ratio awakening/bedtime). Especificar la fórmula exacta.
3. **"Reactivity amplitude fold".** ¿Fold sobre qué baseline? ¿TSST? ¿cold pressor? ¿psicosocial? Alta variabilidad.
4. **Treg/Th17 ratio.** Métodos de citometría no estandarizados; rangos normativos varían por laboratorio.
5. **Priors de SNP "+0.XX".** Sin definir la base matemática (log-odds, probabilidad absoluta, factor multiplicador), cada revisor los interpreta distinto.
6. **F/B ratio.** Método 16S vs shotgun genera valores discrepantes; rangos normativos disputados en la literatura desde 2018.

---

## Recomendaciones priorizadas

### Must-fix antes del MVP (bloqueantes)

1. **Resolver la contradicción HPA de i1**: cortisol alto + CAR exagerada + flattening 0.65 no es un fenotipo único. Decidir entre (a) fase reactiva (flattening 0.45) o (b) fase exhausta (CAR 4.0). Sin esta decisión i1 es incoherente.
2. **Ampliar σ metabólicos de i8**: HbA1c ±0.45, fasting glucose ±12, HOMA-IR ±0.9, HDL ±8. Esto calibra la posterior del clasificador a rangos defendibles.
3. **Especificar método de medición de cortisol y fórmula de flattening index** en un apéndice compartido por las 4 firmas.
4. **Desambiguar COMT en i4**: comprometerse con Val158 como alelo dominante i4 (agresividad reactiva — Caspi 2002). Eliminar referencia a Met/Met.
5. **Verificar rs4147929 NDUFS3 en i7** o reemplazar por variante con evidencia (PPARGC1A rs8192678).
6. **Distanciar numéricamente i1 de i8** en al menos 2 dimensiones: visceral fat i1 a 11-12%, HOMA-IR i1 a 2.5, CAR i1 a 8.0 (ver sección discriminabilidad).

### Should-fix para rigor clínico

7. Añadir **presión arterial (PAS/PAD)** como 11ª dimensión operativa o como subcampo en "autonomic balance". Sin PA la firma de i4 está amputada.
8. Corregir microbiota de i1 (F/B 2.5 + Bacteroides-dominant es internamente contradictorio).
9. Ajustar Treg/Th17 de i8 a 0.68 y de i7 a 0.55 para reflejar mejor los estados glucocorticoideos respectivos.
10. Añadir TSH + T3 libre como dimensión numérica en i7 (actualmente solo narrativa).
11. Retirar o reducir prior de FTO en i7 (+0.15 o eliminar); mantener fuerte en i8.
12. Alinear "Body awareness" escala: en las 4 firmas el ítem usa la escala 0-5, pero la dispersión realista de una escala de 5 niveles discretos es aproximadamente ±0.8-1.0; varios σ (i7 ±0.6, i8 ±0.7) están apretados.

### Nice-to-have para fase 2

13. Integrar ferritina, vitamina D, FC reposo como dimensiones secundarias opcionales con imputación por marginalización.
14. Sustituir Gaussian único en i7-HRV por mezcla de dos componentes (subfase dorsal vs agotamiento).
15. Añadir GGT + ALT como marcadores específicos de i4.
16. Formalizar "prior elevation +0.XX" como log-OR con IC95% en un glosario, y referenciar meta-análisis cuando existan.
17. Modelar el subgrupo hipocortisolémico de i1 explícitamente (mezcla 80/20 hiper/hipo) para evitar falsos negativos en PTSD crónico de larga data.
18. Añadir un parámetro "aldosterona" o "retención hidrosalina" explícito en i8 si se desea dar soporte a la narrativa cortisol-aldosterona del mecanismo.

---

## Evaluación del caso del paciente 001

El patient_001 aporta siete variables numéricas (HbA1c 6.1, HOMA-IR 3.2, fasting 104, TG 178, HDL 41, cortisol 22, SDNN 32) más HRV (RMSSD 19, LF/HF 2.8), interocepción baja y narrativa biográfica coherente con pérdida paterna a los 7 años + figura materna de escasez.

**Consistencia cuantitativa con i8:** los siete labs caen dentro de |Z| < 0.4 bajo los σ propuestos en la firma. Cualitativamente la narrativa es casi un libro de texto de i8. **Clasificación como i8 es clínicamente correcta.**

**Posterior 0.973:** no defendible numéricamente. El paciente cumple con i8, pero también es compatible con i1 en siete variables metabólicas (porque i1 e i8 se superponen fuertemente en ese bloque). La distinción viene por CAR (no medida en el paciente), por arquitectura del sueño (no medida), y por la narrativa (medida, y a favor de i8). Con σ realistas y honrando la ambigüedad con i1, una posterior realista sería:

- **i8: 0.72-0.82** (dominante, sólidamente argumentada).
- **i1: 0.10-0.18** (residual, compatible con fase de disociación que el archivo señala como impronta secundaria).
- **i10 Vinculación: 0.04-0.08** (compatible con la narrativa de proveedora).
- **Resto: < 0.05 acumulado**.

**Diagnóstico del exceso de confianza:** los σ metabólicos demasiado estrechos multiplican 7 verosimilitudes muy altas bajo i8, producto que domina el espacio. Con σ corregidos el producto cae, i1 e i10 recuperan masa, y la posterior se vuelve clínicamente honesta. **Un posterior 0.97 en un sistema con 13 clases sobre 7 medidas es estadísticamente sospechoso.** Un revisor de *Psychoneuroendocrinology* lo marcaría como over-fitting de los σ.

**Recomendación operativa para el demo:** o se corrigen los σ y se acepta posterior ~0.78 (más defendible y pedagógicamente más honesto — permite al clínico ver que "hay un 20% de evidencia hacia otros modelos"), o se mantiene 0.97 solo si se admite explícitamente que el clasificador está calibrado para priorizar decisión clínica sobre incertidumbre honesta. La primera opción sería la preferible en un paper formal; la segunda puede ser aceptable en un MVP si se documenta.

---

## Opinión final de la auditoría

Desde la perspectiva del rol simulado (medicina interna + endocrinología), estas cuatro firmas son un **buen primer borrador operativo** — no un producto publicable en endocrinología clínica, pero sí una base técnica defendible para un MVP y una conversación clínica honesta. La estructura de 10 dimensiones está correctamente pensada, las referencias son canónicas, y el autor muestra sensibilidad clínica notable (p.ej. la precaución suicida en i7, el pitfall de RMSSD, la disociación cortisol-metabólico en i4). El vocabulario clínico es preciso, y las integraciones entre Polyvagal, Active Inference y medicina alostática son coherentes internamente.

Los puntos débiles son identificables y arreglables: un par i1/i8 demasiado cercano, σ sobreoptimistas en i8 que producen posteriors infladas, una contradicción HPA en i1 que hay que resolver, y ~6 ajustes menores (COMT, NDUFS3, Treg/Th17, microbiota i1, PA ausente, COMT en i4). Ninguno es conceptualmente bloqueante.

**Recomiendo que el MVP proceda con ajustes menores (puntos 1-6 de "Must-fix")**. El sistema puede mostrar el paciente 001 con una posterior corregida en torno a 0.78 y ganar en honestidad clínica lo que pierde en espectáculo. Un revisor de journal lo recibiría con la crítica habitual — pediría validación con cohorte real, σ derivados de datos y no de analogía, y especificación metodológica —, pero no lo rechazaría por razones de fondo. La arquitectura conceptual resiste. Lo que falta es el rigor numérico de una segunda iteración.

*— Auditoría automatizada (Claude Opus 4.7 con rol clínico simulado), 2026-04-21. Pendiente de revisión humana por el Dr. Miguel Ojeda Rios.*
