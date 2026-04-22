---
patient_id: "patient_001"
dominant_imprint: "i8"
secondary_imprint: "i1"
age: 47
sex: "F"
status: "skeleton-demo-priority"
used_in_demo: true
author: "Dr. Miguel Ojeda Rios"
last_updated: "2026-04-21"
---

# Paciente sintético 001 — Caso i8 Reserva (demo del hackathon)

> **Este es el paciente que aparece en el video demo de 3 minutos.** Caso diseñado por el autor con base en patrones clínicos reales agregados — NO es un paciente real. Biografía, síntomas, labs y narrativa son sintéticos.

## Perfil demográfico

- Mujer, 47 años.
- Arquitecta en ejercicio.
- Dos hijos adolescentes.
- IMC 29.3, circunferencia de cintura 96 cm.

## Motivo de consulta

"Vengo porque tengo la glucosa en el límite y mi cardióloga me dijo que si no hago algo me voy a hacer diabética. Llevo 10 años haciendo dieta y nunca bajo. Además siempre estoy cansada y como por las noches sin hambre real."

## Historia vincular / biográfica

*[Por llenar en detalle — hipótesis de patrón i8:]*
- Madre ansiosa con historia de migración, siempre hablaba de "lo que puede pasar".
- Muerte abrupta de padre a los 7 años.
- Familia tuvo período de escasez económica entre los 7 y 14 años.
- Paciente se hizo responsable de cuidar hermanos menores.
- Patrón adulto: "proveedora" en su familia actual, dificultad para delegar.

## Firma multimodal esperada

### Labs actuales (reales que trae el paciente)

*[Rellenar con valores consistentes con i8 parcialmente manifestada — algunos en rango, otros discordantes]*

| Parámetro | Valor reportado | Estado |
|---|---|---|
| HbA1c | 6.1 | pre-diabético |
| Glucosa ayuno | 104 | alterada |
| HOMA-IR | 3.2 | elevado |
| Triglicéridos | 178 | elevado |
| HDL | 41 | bajo |
| LDL | 135 | limítrofe |
| PCR | 2.8 | bajo grado |
| TSH | 3.1 | normal-alto |
| Cortisol matutino | 22 μg/dL | elevado |
| Vitamina D | 22 ng/mL | insuficiente |

### HRV simulada (para demo)

- SDNN: 32 ms (reducida para edad).
- RMSSD: 19 ms.
- LF/HF: 2.8.

### Interocepción auto-reportada (4 ítems)

| Ítem | Respuesta 0-5 |
|---|---|
| "Siento cuando mi cuerpo está cansado antes de desplomarme" | 1 |
| "Puedo distinguir hambre real de hambre emocional" | 1 |
| "Confío en las señales de mi cuerpo" | 2 |
| "Cuando me relajo, siento que algo malo puede pasar" | 4 |

### Pearlin Mastery Scale (5 ítems, invertida donde aplica)

| Ítem | Respuesta 1-5 |
|---|---|
| "Hay poco que yo pueda hacer para cambiar cosas importantes en mi vida" | 4 |
| "A veces me siento empujado/a por la vida" | 5 |
| "Tengo poco control sobre lo que me pasa" | 3 |
| "Puedo hacer casi cualquier cosa que me proponga" | 2 |
| "Lo que me pase en el futuro depende principalmente de mí" | 2 |

Score de agencia inicial: **bajo** (prevalece sensación de falta de control).

---

## Narrativa de entrevista (10-12 turnos)

Secuencia de turnos conversacionales pregrabada que el sistema procesa en el demo. Se muestra a Claude Haiku 4.5 como conductor de la entrevista; Claude Sonnet 4.6 extrae priors al cierre.

### Turno 1 — sistema abre

> **Sistema:** ¿Qué te trae hoy? Tómate el tiempo que quieras para contarme.

### Turno 2 — paciente

> **Paciente:** Pues vengo porque tengo la glucosa en el límite. Mi cardióloga me dijo que si sigo así me hago diabética. Y llevo años intentando bajar de peso y no puedo. Como sano entre semana pero en las noches no me aguanto.

### Turno 3 — sistema

> **Sistema:** Cuando dices que en las noches no te aguantas — ¿puedes contarme cómo es eso? ¿Qué pasa antes de que empieces a comer?

### Turno 4 — paciente

> **Paciente:** Mira, llego cansada del trabajo, termino de atender a los niños, superviso la tarea, y cuando ya todos están dormidos, me siento en la cocina. No tengo hambre física. Es como si necesitara algo. Empiezo con un pan, luego galletas, luego lo que haya. Como hasta que ya no puedo más.

### Turno 5 — sistema

> **Sistema:** Gracias por decirlo así de claro. Cuando dices "necesitara algo" — ¿qué sensación es? ¿Dónde la sientes?

### Turno 6 — paciente

> **Paciente:** *(pausa)* Es como un hueco aquí en el pecho. Y una inquietud de que si no como... no sé, algo malo va a pasar. Es raro. Yo sé que tengo comida. Pero cuerpo no lo sabe.

### Turno 7 — sistema

> **Sistema:** "Mi cuerpo no lo sabe". Eso es clínicamente muy valioso. Déjame preguntarte otra cosa: cuando alguien a quien quieres se aleja un poco — un hijo que no te llama, tu pareja distraído — ¿qué pasa en tu cuerpo?

### Turno 8 — paciente

> **Paciente:** Me agito. Pienso que algo les pasó. Me cuesta dormir. Si mi esposo sale de viaje, aunque sea dos días, me cuesta comer bien. Es tonto, ¿no?

### Turno 9 — sistema

> **Sistema:** No, no es tonto. Tu sistema responde a la separación igual que respondía cuando eras niña. Cuéntame: cuando eras pequeña, ¿cómo era tu casa? ¿Qué recuerdas de tu madre, de tu papá?

### Turno 10 — paciente

> **Paciente:** Mi papá murió cuando yo tenía 7 años. Mi mamá se quedó sola con tres hijos. Hubo años difíciles — ella siempre decía "hay que guardar, hay que tener reservas, nunca sabes cuándo puede faltar". Yo crecí cuidando a mis hermanos. A los 14 ya trabajaba los fines de semana.

### Turno 11 — sistema

> **Sistema:** Gracias por compartirlo. Una última pregunta — cuando finalmente estás descansando un domingo por la tarde, sin nada urgente que hacer, ¿cómo te sientes?

### Turno 12 — paciente

> **Paciente:** Rara. Culpable. Como que algo estoy dejando de hacer. No puedo disfrutarlo. Termino limpiando algo, planificando la semana, revisando el banco. No sé relajarme.

---

## Priors esperados que el sistema debe inferir

El `PriorExtractor` (Sonnet 4.6) debe detectar:

1. **Predicción de escasez inminente** (alta evidencia — turno 6, 10).
2. **Predicción de pérdida vincular** (evidencia directa — turno 8).
3. **Predicción de obligación permanente** (evidencia — turno 12).
4. **Incapacidad de registrar suficiencia** ("mi cuerpo no lo sabe" — turno 6).
5. **Mapping a impronta dominante**: **i8 Reserva** con posterior > 0.70.
6. **Impronta secundaria**: posible **i10 Vinculación** (obligación como forma de pertenencia) o leve **i1 Desacople** (desconexión del cuerpo).

## Firma predicha vs labs reales — discrepancias para el demo

Discrepancias que el sistema debe mostrar al clínico:

| Dimensión | Esperado por firma i8 | Reportado | Discrepancia | Significado clínico |
|---|---|---|---|---|
| Cortisol matutino | elevado (>18) | 22 | ✅ consistente | |
| HbA1c | 5.8-6.3 | 6.1 | ✅ consistente | |
| HOMA-IR | 2.5-3.5 | 3.2 | ✅ consistente | |
| HRV SDNN | 28-36 | 32 | ✅ consistente | |
| Vit D | no predicha específicamente | 22 (baja) | ⚠️ nueva info | Puede reforzar CAR aplanada; comorbilidad |
| LDL | no predicha específicamente | 135 | ⚠️ nueva info | Factor CV adicional |

## SNPs priorizados (lo que el clínico ve)

Top 10 posteriores que el sistema genera dado i8 + fenotipo:

1. FTO rs9939609 (OR 1.6 para obesidad visceral).
2. MC4R rs17782313 (OR 1.4 para hiperfagia).
3. LEPR rs1137101 (OR 1.5 para resistencia leptina).
4. ADRB2 rs1042713 (OR 1.3 para baja lipolisis).
5. PPARG rs1801282 (OR 1.4 para adipogénesis).
6. OXTR rs53576 (OR 1.3 para apego ansioso).
7. FKBP5 rs1360780 (OR 1.4 para reactividad HPA).
8. MTHFR C677T (OR 1.2 para metilación).
9. ADRB3 rs4994 (OR 1.3 para termogénesis).
10. LEP rs7799039 (OR 1.2 para regulación leptina).

---

## Programa nutricional salutogénico — borrador que el clínico valida

*[Por completar — estructura: alimentos, ritmos, experimentos de flexibilidad, suplementos/nutracéuticos, intervenciones de actualización de predicción.]*

### Principio rector

No restricción calórica. El sistema predice escasez — restringir calorías **refuerza la predicción**. Estrategia: **instalar experiencias de suficiencia somática** + modular rutas metabólicas por genotipo inferido.

### Alimentos prioritarios
- Proteína suficiente en cada comida (señal de saciedad mecánica).
- Grasas completas (MUFA, omega-3) — mejor sensibilidad leptina.
- Fibra fermentable — SCFA production.

### Ritmo de alimentación
- NO ayuno intermitente agresivo en fase inicial (refuerza predicción de escasez).
- 3 comidas con horario estable + snack vespertino.
- Cena temprana (antes de 19:30) para trabajar antojo nocturno.

### Experimento de flexibilidad
- Semana 1-2: práctica de "mesa puesta" — la paciente pone la mesa para sí misma como para invitada. Instala señal de suficiencia somática.
- Semana 3-4: introducir 5 min después de cada comida sin hacer nada.

### Nutracéuticos/suplementos (validados por clínico)
- Vitamina D 5000 UI.
- Magnesio glicinato 400 mg nocturno (CAR modulation).
- Omega-3 EPA/DHA 2g.
- Myo-inositol 2g/d (sensibilidad insulina).
- Ashwagandha 600 mg/d (modulación HPA rígida).

### Intervención de actualización de predicción
- Ejercicio de interocepción guiada 5 min/día: registro de señales de suficiencia.
- Referencia a trabajo somático con explorador BV4 si está disponible.

---

## Panel de agencia — esperado tras una sesión con el sistema

Pre vs post: la paciente debería mover al menos 1 punto en al menos 2 ítems tras ver su propio mapa predictivo. No es outcome de intervención completa — es outcome del acto de **ver el propio sistema**.

| Ítem | Pre | Post (esperado) |
|---|---|---|
| Mastery 1 | 4 | 3 |
| Mastery 2 | 5 | 4 |
| Interocepción 4 "relajarme es peligroso" | 4 | 3 |

Delta de agencia mínimo esperado para demo: **+1.5 puntos agregados**.
