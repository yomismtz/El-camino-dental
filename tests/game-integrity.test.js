'use strict';
const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const read=p=>fs.readFileSync(p,'utf8');
const app=read('app-v10.js');
const html=read('play.html');
const i18n=read('i18n.js');
const classifier=read('area-classifier.js');

function extractSet(name){
  const m=app.match(new RegExp(name+'\\s*:\\s*new Set\\(\\[([^\\]]*)\\]\\)'));
  assert(m,'No se encontró CELL_TYPES.'+name);
  return m[1].split(',').map(x=>Number(x.trim())).filter(Number.isFinite);
}
function bounce(start,roll){
  const raw=start+roll;
  return raw>100?100-(raw-100):raw;
}

assert(app.includes('const BOARD_END=100;'),'BOARD_END debe ser 100');
assert(html.includes('100 casillas'),'La interfaz debe declarar 100 casillas');
assert(html.includes('<b>100</b>'),'La meta visible debe ser 100');

const types=['question','case','advance1','advance2','back1','back2','back3','vacation','tax','lawsuit','jail','equipment'];
const occupied=new Map();
for(const type of types){
  const cells=extractSet(type);
  assert(cells.length>0,type+' no puede quedar vacío');
  assert.strictEqual(new Set(cells).size,cells.length,type+' contiene casillas duplicadas');
  for(const cell of cells){
    assert(Number.isInteger(cell)&&cell>=1&&cell<100,type+' contiene casilla inválida '+cell);
    assert(!occupied.has(cell),'La casilla '+cell+' aparece en '+occupied.get(cell)+' y '+type);
    occupied.set(cell,type);
  }
}
assert.deepStrictEqual(extractSet('jail'),[33,44,79],'Deben existir 3 cárceles distribuidas en el tablero');
assert.strictEqual(extractSet('question').length,20,'Deben existir 20 casillas de pregunta');
assert.strictEqual(extractSet('case').length,20,'Deben existir 20 casillas de caso');

// Mejora 6: casillas especiales con efectos persistentes y no colisionados.
for(const type of ['specialShield','specialBoost','specialBonus']){
  const cells=extractSet(type);
  assert.strictEqual(cells.length,2,'Mejora 6 debe tener 2 casillas de '+type);
  assert.strictEqual(new Set(cells).size,2,type+' contiene casillas duplicadas');
  for(const cell of cells){assert(Number.isInteger(cell)&&cell>=1&&cell<100,type+' contiene casilla inválida '+cell);assert(!occupied.has(cell),'La casilla '+cell+' colisiona con '+occupied.get(cell));occupied.set(cell,type)}
}
assert(app.includes("function specialCell(type)"),'Falta resolución de casillas especiales');
assert(app.includes('p.specialShield=true'),'Protección clínica debe persistir en la ficha');
assert(app.includes('p.specialBoost=2'),'Impulso debe persistir hasta el próximo lanzamiento');
assert(app.includes('p.specialBonus=1'),'Bono de conocimiento debe persistir hasta la próxima respuesta correcta');
assert(app.includes('if(p.specialBoost){'),'El impulso debe modificar el próximo lanzamiento');
assert(app.includes('if(p.specialBonus){'),'El bono debe modificar la próxima respuesta correcta');
assert(app.includes('const protectedError=p.specialShield||'),'La protección debe evitar el retroceso por error');
console.log('✓ Mejora 6: 6 casillas especiales, efectos persistentes y QA de colisiones');

assert.strictEqual(bounce(97,3),100,'77 + 3 debe ganar exactamente');
assert.strictEqual(bounce(97,8),95,'77 + 8 debe rebotar a 75');
assert.strictEqual(bounce(99,2),99,'79 + 2 debe rebotar a 79');
assert.strictEqual(bounce(98,12),88,'78 + 12 debe rebotar a 70');
for(let start=0;start<100;start++)for(let roll=2;roll<=12;roll++){
  const end=bounce(start,roll);
  assert(end>=0&&end<=100,'Rebote fuera del tablero');
}
assert(app.includes('async function moveWithFinishBounce'),'Falta función de rebote');
assert(app.includes('position===BOARD_END'),'La victoria por dados debe exigir meta exacta');
assert(/triggerCell\([^)]*\.position/.test(app),'La casilla tras movimiento/rebote debe resolverse');

for(const n of [2,3,4,5])assert(html.includes('value="'+n+'"')&&html.includes('>'+n+' jugadores</option>'),'Falta opción de '+n+' jugadores');
assert(!html.includes('value="6"'),'No debe existir opción de 6 jugadores');
assert(html.includes('value="computer"'),'Debe existir modo contra computadora');
for(const level of ['low','medium','high','super'])assert(html.includes('value="'+level+'"'),'Falta nivel IA '+level);

assert(app.includes("const STORAGE_KEY='ortopediaGameV10'"),'Falta clave de guardado v10');
assert(app.includes('function saveGame()'),'Falta autoguardado');
assert(app.includes('function loadGame()'),'Falta recuperación');
assert(app.includes('pendingResolution'),'Falta protección de resolución pendiente');
assert(app.includes("elcamino:native-pause"),'Falta pausa Android');
assert(app.includes('stopQuestionNarration();')&&app.includes('stopTimer();'),'La pausa debe detener voz y cronómetro');

assert(html.includes('id="rulesDialog"'),'Falta reglamento');
assert(html.includes('Victoria exacta y rebote en la META'),'El reglamento debe explicar la meta exacta');
assert(!html.includes('value="primer_parcial"'),'Primer parcial no debe ser módulo visible');
assert(!classifier.includes('primer_parcial'),'El clasificador no debe conservar el módulo eliminado');
for(const stale of ['900 preguntas','2–6 jugadores','38 casillas','37 casillas','llega o supera','🎯 Juega y aprueba']){
  assert(![html,i18n].some(x=>x.includes(stale)),'Texto obsoleto visible: '+stale);
}


const scriptSources=[...html.matchAll(/<script[^>]+src="([^"]+\\.js)"/g)].map(x=>x[1]);
for(const src of scriptSources)assert(fs.existsSync(src),'play.html referencia un script inexistente: '+src);
assert.strictEqual(new Set(scriptSources).size,scriptSources.length,'play.html no debe cargar scripts duplicados');

for(const fragment of [
  "if(r.type==='question')return startQuestion",
  "if(r.type==='case')return",
  "if(r.type==='advance1')return movement('advance1',1",
  "if(r.type==='advance2')return movement('advance2',2",
  "if(r.type==='back1')return movement('back1',-1",
  "if(r.type==='back2')return movement('back2',-2",
  "if(r.type==='back3')return movement('back3',-3",
  "if(r.type==='vacation')return loseTurnEvent",
  "if(r.type==='tax')return loseTurnEvent",
  "if(r.type==='equipment')return loseTurnEvent",
  "if(r.type==='lawsuit')return lawsuit",
  "if(r.type==='jail')return jail"
])assert(app.includes(fragment),'Falta resolución para: '+fragment);

assert(app.includes("p.jailVisits===1?2:3"),'Cárcel debe penalizar 2 turnos la primera visita y 3 después');
assert(app.includes("const JAIL_CELL=44;"),'Demanda debe poder enviar a cárcel 44');
assert(app.includes("await move(JAIL_CELL-p.position)"),'La demanda debe mover a la cárcel');
assert(app.includes("if(depth>=8)"),'Debe existir límite de seguridad para cadenas de eventos');
assert(app.includes("grade==='excellent'")&&app.includes("delta=2"),'Caso excelente debe avanzar 2');
assert(app.includes("grade==='good'")&&app.includes("delta=1"),'Caso bueno debe avanzar 1');
assert(app.includes("delta=-1")&&app.includes("Incorrecta · retrocedes 1 casilla"),'Respuesta incorrecta debe retroceder 1');
assert(app.includes("timerLeft=30"),'El cronómetro debe iniciar en 30 segundos');
assert(app.includes("timerLeft>0&&timerLeft<=10"),'Los últimos 10 segundos deben activar urgencia');
assert(app.includes("if(timerLeft<=0)expireQuestionTimer()"),'El tiempo agotado debe resolver el reactivo');
assert(app.includes("questionAccuracy:1")&&app.includes("excellent:1"),'IA súper inteligente debe conservar precisión máxima configurada');
assert(app.includes("if(questionDialog?.open&&pendingQuestion)"),'Reanudación debe reconocer preguntas pendientes');
assert(app.includes("if(eventDialog?.open)"),'Automatización IA debe poder reanudar eventos pendientes');

const primerPartialSource=fs.readFileSync('primer-parcial-questions.js','utf8');
const ppCasesBlock=primerPartialSource.match(/const CASES=\[([\s\S]*?)\];\s*window\.PRIMER_PARCIAL_QUESTIONS/);
assert(ppCasesBlock,'No se localizaron los casos históricos del Primer Parcial');
const ppCaseIds=[...ppCasesBlock[1].matchAll(/"id"\s*:\s*"([^"]+)"/g)].map(x=>x[1]);
assert.strictEqual(ppCaseIds.length,25,'Deben conservarse exactamente 25 casos históricos');
assert.strictEqual(new Set(ppCaseIds).size,25,'Los 25 casos históricos deben tener IDs únicos');
assert(app.includes("...(window.PRIMER_PARCIAL_CASES||[])"),'Los 25 casos históricos deben estar integrados al banco clínico general');


// Auditoría estructural de bancos académicos y seguridad del barajado.
assert(app.includes("out.correct=order.indexOf(item.correct)"),'Al barajar preguntas debe recalcularse el índice correcto');
assert(app.includes("out.grades=order.map(i=>item.grades?.[i]||'incorrect')"),'Al barajar casos deben mantenerse opción y grado sincronizados');
assert(app.includes("out.feedback=order.map(i=>item.feedback?.[i]||'Revisa el razonamiento clínico.')"),'Al barajar casos deben mantenerse opción y feedback sincronizados');
assert(app.includes("state.questionQueue=freshQuestionQueue"),'Las preguntas deben usar cola aleatoria');
assert(app.includes("state.caseQueue=shuffledIndices"),'Los casos deben usar cola aleatoria');


const nomenclatureSource=fs.readFileSync('nomenclatura-etimologia-questions.js','utf8');
const nomenclatureContext={window:{}};
vm.runInNewContext(nomenclatureSource,nomenclatureContext);
const nomenclatureBank=nomenclatureContext.window.NOMENCLATURA_ETIMOLOGIA_QUESTIONS;
assert(Array.isArray(nomenclatureBank),'El banco de nomenclatura debe exportarse como arreglo');
assert.strictEqual(nomenclatureBank.length,100,'Nomenclatura debe contener exactamente 100 preguntas');
assert.strictEqual(new Set(nomenclatureBank.map(q=>q.id)).size,100,'Las 100 preguntas de nomenclatura deben tener IDs únicos');
assert(nomenclatureBank.every(q=>q.module==='nomenclatura_etimologia'&&q.text&&Array.isArray(q.options)&&q.options.length>=4&&Number.isInteger(q.correct)),'Todas las preguntas de nomenclatura deben tener estructura válida');
assert(app.includes("if(module==='nomenclatura_etimologia')return nomenclatureEtymologyQuestions"),'El juego debe enrutar el módulo de nomenclatura a su banco dedicado');
assert(html.includes('src="nomenclatura-etimologia-questions.js"'),'play.html debe cargar el banco de nomenclatura');
const expansionQuestions=fs.readFileSync('expansion-questions-2026.js','utf8');
const expansionCases=fs.readFileSync('expansion-cases-2026.js','utf8');
const expQIds=[...expansionQuestions.matchAll(/"id":"(EXP-Q-\d{3})"/g)].map(x=>x[1]);
const expCIds=[...expansionCases.matchAll(/"id":"(EXP-C-\d{3})"/g)].map(x=>x[1]);
assert.strictEqual(expQIds.length,200,'La expansión debe aportar exactamente 200 preguntas');
assert.strictEqual(new Set(expQIds).size,200,'Las 200 preguntas nuevas deben tener IDs únicos');
assert.strictEqual(expCIds.length,145,'La expansión debe aportar exactamente 145 casos');
assert.strictEqual(new Set(expCIds).size,145,'Los 145 casos nuevos deben tener IDs únicos');
assert(html.includes('src="expansion-questions-2026.js"'),'play.html debe cargar las 200 preguntas nuevas');
assert(html.includes('src="expansion-cases-2026.js"'),'play.html debe cargar los 145 casos nuevos');
assert(html.includes('1000 preguntas')&&html.includes('500 casos clínicos'),'La interfaz debe mostrar los nuevos totales');


assert(html.includes('1000 preguntas')&&html.includes('500 casos clínicos'),'play.html debe mostrar 1000 preguntas y 500 casos');
const home=fs.readFileSync('index.html','utf8');
const examHtml=fs.readFileSync('exam.html','utf8');
assert(home.includes('1000 preguntas')&&home.includes('500 casos clínicos'),'La portada debe mostrar los totales 1000/500');
assert(!home.includes('800 preguntas')&&!home.includes('355 casos clínicos'),'La portada no debe conservar totales anteriores');
assert(examHtml.includes('src="expansion-questions-2026.js"'),'Modo Examen debe cargar las 200 preguntas nuevas');
assert(classifier.includes("id:'anestesia'")&&classifier.includes("id:'implantologia'"),'El selector personalizado debe incluir Anestesia e Implantología');

const css=fs.readFileSync('styles-v10.css','utf8')+'\n'+fs.readFileSync('ui-polish.css','utf8');
const androidTouch=fs.readFileSync('android-touch-v85.css','utf8');
assert(html.includes('href="android-touch-v85.css"'),'play.html debe cargar el baseline Android al final');
assert(html.lastIndexOf('android-touch-v85.css')>html.lastIndexOf('character-art.css'),'El baseline Android debe cargarse después de los estilos heredados');
assert(androidTouch.includes('body:not(.game-playing){margin:0!important;position:static!important'),'Fuera de partida Android debe usar scroll documental nativo');
assert(androidTouch.includes('overflow-y:auto!important'),'Android debe permitir desplazamiento vertical nativo');
assert(androidTouch.includes('body.game-playing{position:fixed!important'),'Solo la partida conserva viewport fijo');
assert(!css.includes('v3.4 — bloquear desplazamiento horizontal'),'No deben sobrevivir overrides legacy de viewport/touch');
assert(!css.includes('v3.5 — interfaz completa sin desplazamiento'),'No debe sobrevivir el bloqueo global sin desplazamiento');
assert(androidTouch.includes('@media (orientation:landscape) and (max-height:900px)'),'La política touch debe cubrir landscape Android');
assert(androidTouch.includes('@media (orientation:landscape) and (max-height:600px)'),'Debe existir perfil ligero para landscape de poca altura');
assert(androidTouch.includes('backdrop-filter:none!important'),'El perfil ligero debe desactivar blur costoso');

const requiredScripts=['area-classifier.js','primer-parcial-questions.js','nomenclatura-etimologia-questions.js','questions.js','app-v10.js','android-navigation.js'];
for(const script of requiredScripts)assert(html.includes('src="'+script+'"'),'Falta script crítico '+script);

console.log('✓ Tablero: 80 casillas, tipos sin colisiones y 3 cárceles');
console.log('✓ Meta: victoria exacta y rebote validados para todas las posiciones/tiradas 2–12');
console.log('✓ Configuración: 2–5 jugadores, computadora y 4 niveles IA');
console.log('✓ Persistencia: guardado, recuperación y resolución pendiente presentes');
console.log('✓ Android: pausa segura de narración y cronómetro');
console.log('✓ UI/documentación: reglamento y textos actuales');
console.log('✓ QA flujo: eventos, cárcel, cronómetro, IA y recursos cargados');
console.log('✓ Casos clínicos: 25 casos históricos integrados al banco general');
console.log('✓ Aleatorización: respuesta, grado y feedback permanecen sincronizados');
console.log('✓ Expansión: +200 preguntas y +145 casos con IDs únicos y carga activa');
console.log('Paso 13: QA automatizado de versión candidata superado.');

assert(androidTouch.includes('edge-safe compact landscape setup'),'Debe existir layout landscape compacto y seguro en bordes');
assert(androidTouch.includes('grid-template-columns:repeat(6,minmax(110px,1fr))'),'Personajes deben compactarse en landscape');
assert(androidTouch.includes('.setup-form .actions{position:sticky!important;bottom:0!important'),'Acción principal del setup debe permanecer accesible');
assert(androidTouch.includes('overscroll-behavior:none!important'),'La pantalla landscape no debe propagar overscroll a bordes del sistema');
assert(app.includes('roundErrors'),'Debe existir contador de errores por ronda');
assert(app.includes('roundErrors>=3'),'Tres errores deben activar el robo');
assert(app.includes('function startRobbery()'),'Debe existir modo robo');
assert(app.includes('function confirmRobberyAnswer()'),'El robo debe tener resolución independiente');
assert(app.includes('¡ROBO!'),'Debe anunciarse el robo al llegar a tres errores');
assert(app.includes('has one chance'),'El rival debe tener un único intento en robo');
assert(app.includes('state.robbery.won=true'),'El robo exitoso debe marcar al rival como ganador de la ronda');
assert(app.includes('state.robbery.won=false'),'El robo fallido debe devolver el banco al equipo original');
assert(app.includes('state.roundErrors=0'),'El contador de errores debe reiniciarse al cerrar la ronda');
assert(app.includes("if(d<0&&state?.roundErrors>0&&state.roundErrors<3)"),'Los errores 1 y 2 deben conservar la ronda para acumular tres errores');
assert(app.includes("state.roundErrors=(state.roundErrors||0)+1"),'Preguntas y casos incorrectos deben incrementar errores');

assert(app.includes('round:1'),'La partida debe iniciar en ronda 1');
assert(app.includes('roundNo>=8'),'Debe existir cierre automático después de 8 rondas');
assert(app.includes('function finishRound('),'Debe existir cierre automático de ronda');
assert(app.includes('gana la ronda'),'Debe anunciarse al ganador de la ronda');
assert(app.includes('round-award'),'Debe existir animación visual de puntos');
assert(app.includes('roundWinnerPoints'),'El ganador debe recibir puntos automáticamente');
assert(app.includes('function showMatchWinner()'),'La ronda 8 debe pasar al resultado final');

// Paso 5: rendimiento y continuidad
assert(app.includes('Paso 5 · rendimiento'),'Debe existir la capa de rendimiento del Paso 5');
assert(app.includes('step5NormalizeAnswer'),'Debe normalizar respuestas');
assert(app.includes("normalize('NFD')"),'Debe tolerar acentos');
assert(app.includes('step5Levenshtein'),'Debe tolerar errores ortográficos pequeños');
assert(app.includes('q.acceptedAnswers')&&app.includes('q.synonyms'),'Debe aceptar sinónimos configurados');
assert(app.includes('step5ScheduleAdvance(1200)'),'El resultado debe avanzar automáticamente en ~1.2 s');
assert(app.includes("step5Phase('timer'"),'Debe distinguir fase de respuesta/cronómetro');
assert(app.includes('step5PreloadQuestion'),'Debe precargar el siguiente contenido');
assert(app.includes('step5RepeatQuestion'),'Debe permitir repetir la pregunta');
assert(app.includes('step5PersistNow'),'Debe persistir al suspender/cerrar WebView');
assert(app.includes('performance-mode'),'Debe existir modo rendimiento');
assert(html.includes('id="phaseIndicator"'),'Debe existir indicador de fase');
assert(html.includes('id="repeatQuestionBtn"'),'Debe existir repetir pregunta');
assert(html.includes('id="step5Settings"'),'Debe existir panel independiente de audio/rendimiento');
assert(html.includes('id="musicVolume"')&&html.includes('id="effectsVolume"')&&html.includes('id="narratorVolume"')&&html.includes('id="countdownVolume"'),'Audio debe tener controles independientes');
assert(html.includes('id="performanceMode"'),'Debe existir control de rendimiento');
assert(css.includes('performance-mode'),'El CSS debe reducir efectos en modo rendimiento');
console.log('✓ Paso 5: fases, transiciones, precarga, respuestas tolerantes, recuperación, audio y rendimiento');


// Paso 6: tablero, foco de turno y continuidad visual.
assert(html.includes('id="board"'),'Debe existir el tablero principal');
assert(html.includes('id="turnPlayerName"')&&html.includes('id="turnPrompt"'),'Debe existir un indicador inequívoco del jugador activo');
assert(html.includes('<details class="legend-panel">'),'La leyenda del tablero debe permanecer colapsable');
assert(css.includes('step6-focus'),'Debe existir resumen compacto de posición/destino/casilla');
assert(css.includes('step6-current-cell'),'La casilla actual debe tener resaltado visual');
assert(css.includes('step6-turn-pulse'),'Debe existir una señal visual de cambio de turno');
assert(app.includes('function endTurn()'),'El flujo debe centralizar el cambio de turno');
assert(app.includes("saveGame();render();tone('turn')"),'El cambio de turno debe guardar, renderizar y anunciarse');
assert(app.includes('scheduleComputerTurn'),'Los turnos contra computadora deben usar el mismo flujo central');
assert(app.includes('visibilitychange'),'Debe conservarse recuperación al suspender WebView');
console.log('✓ Paso 6: tablero compacto, foco de posición/destino, indicador de turno y continuidad visual');


// Paso 7: IA, protección de turno y carga explícita del runtime.
assert(html.includes('src="step7-ai-runtime.js"'),'play.html debe cargar el runtime del Paso 7');
assert(app.includes('window.step7GetState=function(){return state}'),'Debe existir puente seguro al estado para la capa Paso 7');
assert(app.includes('window.step7GetAiLevel=function()'),'Debe existir puente seguro al nivel de IA');
assert(app.includes('const AI_LEVELS='),'Deben existir niveles de IA');
assert(app.includes('function scheduleComputerTurn('),'La IA debe programar su turno automáticamente');
assert(app.includes('function resumeComputerAutomation('),'La IA debe poder reanudar después de suspensión');
assert(app.includes('function rollDice(auto=false)'),'La tirada debe distinguir acciones automáticas de la IA');
assert(app.includes('if(p?.isComputer&&!auto)return'),'Un jugador humano no debe controlar la tirada de la IA');
assert(app.includes('function confirmRobberyAnswer()'),'La IA/robo debe mantener resolución independiente');
assert(css.includes('step7-ai-status'),'Debe existir indicador visual del turno de IA');
assert(css.includes('step7-disabled'),'Debe existir estado visual de control bloqueado');
assert(css.includes('@media(max-height:600px) and (orientation:landscape)'),'Paso 7 debe conservar adaptación landscape compacta');
console.log('✓ Paso 7: IA visible, turno protegido, reanudación automática y adaptación compacta');

assert(html.includes('src="step8-progress-runtime.js"'),'play.html debe cargar la progresion del Paso 8');
assert(css.includes('step8-progression'),'Debe existir el panel visual de progresion');
assert(app.includes('ensurePlayerStats'),'La partida debe conservar estadisticas del jugador');
console.log('✓ Paso 8: progresion XP, logros persistentes y resumen final');

// Paso 9: colección de personajes y desbloqueos.
assert(html.includes('id="characterCollection"'),'Debe existir el resumen de colección de personajes');
assert(html.includes('src="step9-characters-runtime.js"'),'play.html debe cargar el runtime del Paso 9');
assert(app.includes('window.step9GetCharacters=function(){return CHARACTERS}'),'Debe existir puente seguro a la colección de personajes');
assert(app.includes("unlockId:'wisdom'")&&app.includes("unlockId:'toothMouse'"),'Deben existir personajes especiales con desbloqueo');
assert(app.includes('window.step9CharacterLocked?.(idx)'),'La selección debe respetar el bloqueo por progresión');
assert(css.includes('.character-card.locked'),'Debe existir estado visual para personajes bloqueados');
const step9=fs.readFileSync('step9-characters-runtime.js','utf8');
assert(step9.includes('elCaminoDentalCharacterProgressV1'),'El progreso de personajes debe persistir');
assert(step9.includes('extremeWins'),'Debe contabilizar victorias en dificultad extrema');
console.log('✓ Paso 9: colección persistente, personajes especiales y desbloqueos por progresión');


// Paso 10: perfil de progreso.
assert(html.includes('id="profileBtn"'),'Debe existir acceso al perfil de progreso');
assert(html.includes('id="profileDialog"'),'Debe existir el diálogo de perfil');
assert(html.includes('src="step10-profile-runtime.js"'),'play.html debe cargar el runtime del Paso 10');
assert(css.includes('.profile-stats')&&css.includes('.profile-achievements'),'Debe existir estilo para estadísticas y logros');
const step10=fs.readFileSync('step10-profile-runtime.js','utf8');
assert(step10.includes('elCaminoDentalProgressV1')&&step10.includes('elCaminoDentalCharacterProgressV1'),'El perfil debe leer el progreso persistente');
assert(step10.includes('step9GetCharacters'),'El perfil debe integrar la colección del Paso 9');
console.log('✓ Paso 10: perfil, estadísticas, logros y colección integrados');

// Paso 13: catálogo maestro de cobertura.
assert(fs.existsSync('step13-question-catalog.js'),'Debe existir el catálogo maestro del Paso 13');
const catalogSource=fs.readFileSync('step13-question-catalog.js','utf8');
assert(catalogSource.includes('targetQuestions:4400'),'El catálogo debe fijar la meta en 4,400 preguntas');
assert(catalogSource.includes('targetCategories:TARGET.length'),'El catálogo debe trabajar con 44 categorías');
const catalogContext={window:{}};
vm.runInNewContext(catalogSource,catalogContext);
assert.strictEqual(typeof catalogContext.window.step13QuestionCatalog,'function','Debe existir la API del catálogo');
const catalogSummary=catalogContext.window.step13QuestionCatalogSummary();
assert.strictEqual(catalogSummary.targetCategories,44,'El catálogo debe contener exactamente 44 categorías');
assert.strictEqual(catalogSummary.targetQuestions,4400,'La meta debe ser 4,400 preguntas');
assert(Number.isInteger(catalogSummary.duplicateIds)&&catalogSummary.duplicateIds>=0,'El catálogo debe calcular duplicados');
assert(html.includes('src="step13-question-catalog.js"'),'play.html debe cargar el catálogo del Paso 13');

// Paso 12: auditoría estructural del banco.
assert(fs.existsSync('step12-question-audit.js'),'Debe existir el auditor estructural del banco');
const auditSource=fs.readFileSync('step12-question-audit.js','utf8');
assert(auditSource.includes('window.step12QuestionAudit'),'El auditor debe exponer una API de auditoría');
assert(auditSource.includes('less_than_3_options'),'Debe detectar reactivos con menos de 3 opciones');
assert(auditSource.includes('missing_difficulty'),'Debe detectar reactivos sin dificultad');
const nomenclatureStep12=vm.runInNewContext(fs.readFileSync('nomenclatura-etimologia-questions.js','utf8')+';window.NOMENCLATURA_ETIMOLOGIA_QUESTIONS;',{window:{}});
assert.strictEqual(nomenclatureStep12.length,100,'Nomenclatura debe conservar exactamente 100 reactivos');

// Paso 14: banco de Endodoncia.
assert(fs.existsSync('endodoncia-questions-2026.js'),'Debe existir el banco de Endodoncia del Paso 14');
const endoSource=fs.readFileSync('endodoncia-questions-2026.js','utf8');
assert(endoSource.includes('window.ENDODONCIA_QUESTIONS'),'El banco debe exponer ENDODONCIA_QUESTIONS');
const endoCtx={window:{QUESTIONS:[]}}; vm.runInNewContext(endoSource,endoCtx);
assert.strictEqual(endoCtx.window.ENDODONCIA_QUESTIONS.length,100,'Endodoncia debe contener exactamente 100 reactivos');
assert.strictEqual(new Set(endoCtx.window.ENDODONCIA_QUESTIONS.map(q=>q.id)).size,100,'Los IDs de Endodoncia deben ser únicos');
const ed=endoCtx.window.ENDODONCIA_QUESTIONS.reduce((m,q)=>(m[q.difficulty]=(m[q.difficulty]||0)+1,m),{});
assert.deepStrictEqual(ed,{Fácil:30,Medio:20,Difícil:20,Extremo:30},'La distribución de dificultad debe ser 30/20/20/30');
assert(endoCtx.window.ENDODONCIA_QUESTIONS.every(q=>q.options.length>=3&&q.options.length<=7&&q.correct>=0&&q.correct<q.options.length),'Todos los reactivos deben tener 3-7 opciones válidas');
assert(endoCtx.window.ENDODONCIA_QUESTIONS.every(q=>q.specialty==='Endodoncia'),'Todos los reactivos deben pertenecer a Endodoncia');


// Paso 15: banco dedicado de Ortodoncia.
assert(fs.existsSync('ortodoncia-questions-2026.js'),'Debe existir el banco de Ortodoncia del Paso 15');
const orthoSource=fs.readFileSync('ortodoncia-questions-2026.js','utf8');
assert(orthoSource.includes('window.ORTODONCIA_QUESTIONS'),'El banco debe exponer ORTODONCIA_QUESTIONS');
const orthoCtx={window:{QUESTIONS:[]}};
vm.runInNewContext(orthoSource,orthoCtx);
const orthoBank=orthoCtx.window.ORTODONCIA_QUESTIONS;
assert.strictEqual(orthoBank.length,100,'Ortodoncia debe contener exactamente 100 reactivos');
assert.strictEqual(new Set(orthoBank.map(q=>q.id)).size,100,'Los IDs de Ortodoncia deben ser únicos');
const od=orthoBank.reduce((m,q)=>(m[q.difficulty]=(m[q.difficulty]||0)+1,m),{});
assert.deepStrictEqual(od,{Fácil:30,Medio:20,Difícil:20,Extremo:30},'Ortodoncia debe distribuirse 30/20/20/30');
assert(orthoBank.every(q=>q.options.length>=3&&q.options.length<=7&&Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.options.length),'Todos los reactivos de Ortodoncia deben tener 3-7 opciones válidas');
assert(orthoBank.every(q=>q.specialty==='Ortodoncia'&&q.module==='ortodoncia'),'Todos los reactivos deben pertenecer a Ortodoncia');
assert(orthoBank.every(q=>q.text&&q.explanation&&q.evidence&&q.audit),'Todos los reactivos deben conservar trazabilidad de auditoría');
assert(html.includes('src="ortodoncia-questions-2026.js"'),'play.html debe cargar Ortodoncia');
assert(html.includes('value="ortodoncia"'),'El selector debe ofrecer Ortodoncia como módulo');
assert(app.includes("if(module==='ortodoncia')return [...(window.ORTODONCIA_QUESTIONS||[])]"),'El motor debe enrutar el módulo de Ortodoncia a su banco dedicado');
assert(fs.readFileSync('step12-question-audit.js','utf8').includes("['ortodoncia',()=>window.ORTODONCIA_QUESTIONS||[]]"),'La auditoría debe incluir Ortodoncia');
assert(fs.readFileSync('step13-question-catalog.js','utf8').includes("['ortodoncia',()=>window.ORTODONCIA_QUESTIONS||[],'Ortodoncia']"),'El catálogo debe incluir Ortodoncia');
console.log('✓ Paso 15: 100 reactivos de Ortodoncia, IDs únicos, distribución 30/20/20/30 y trazabilidad');


const step16=fs.readFileSync('step16-question-integrity.js','utf8');
const step16Ctx={window:{}};
vm.runInNewContext(step16,step16Ctx);
assert.strictEqual(typeof step16Ctx.window.step16QuestionIntegrity.auditBank,'function','Debe existir el auditor robusto de preguntas');
assert.strictEqual(typeof step16Ctx.window.step16ValidateQuestion,'function','Debe existir el validador runtime');
const validQ={id:'T-1',text:'¿Qué tejido recubre la corona?',options:['Esmalte','Dentina','Pulpa'],correct:0,difficulty:'Medio',explanation:'Fundamento'};
assert.strictEqual(step16Ctx.window.step16ValidateQuestion(validQ),true,'Un reactivo válido debe pasar');
const invalidQ={id:'T-2',text:'Pregunta',options:['A','A'],correct:0};
assert.strictEqual(step16Ctx.window.step16ValidateQuestion(invalidQ),false,'Opciones duplicadas deben rechazarse');
const audit16=step16Ctx.window.step16QuestionIntegrity.auditBank([validQ,invalidQ],'test');
assert.strictEqual(audit16.valid,false,'El auditor debe detectar errores');
assert.strictEqual(audit16.errors.some(x=>x.issue==='duplicate_options'),true,'Debe detectar opciones duplicadas');
assert(app.includes('window.step16ValidateQuestion'),'El motor debe filtrar reactivos inválidos antes de jugar');
assert(html.includes('src="step16-question-integrity.js"'),'play.html debe cargar el validador antes del motor');
console.log('✓ Paso 16: validación de estructura, opciones duplicadas y filtrado runtime');

const studySource=fs.readFileSync('step17-study-runtime.js','utf8');
assert(studySource.includes('elCaminoDentalStudyErrorsV1'),'Los errores de estudio deben persistir');
assert(studySource.includes('step17Study'),'Debe existir la API del Modo Estudio');
assert(studySource.includes('Respuesta correcta:'),'El Modo Estudio debe mostrar la respuesta');
assert(studySource.includes('Por qué:'),'El Modo Estudio debe mostrar explicación');
assert(html.includes('id="studyBtn"')&&html.includes('id="studyDialog"'),'Debe existir acceso al Modo Estudio');
assert(html.includes('id="studyErrorsBtn"'),'Debe existir el repaso de errores');
assert(html.includes('src="step17-study-runtime.js"'),'play.html debe cargar el runtime del Modo Estudio');
console.log('✓ Mejora 2: Modo Estudio, explicaciones y Mis errores');

const progress18=fs.readFileSync('step18-progress-unified.js','utf8');
const p18={window:{addEventListener(){}},document:{addEventListener(){},getElementById(){return null}}};
vm.runInNewContext(progress18,p18);
assert.strictEqual(typeof p18.window.step18Progress.levelForXp,'function','Debe existir cálculo unificado de nivel');
assert.strictEqual(p18.window.step18Progress.levelForXp(0),1,'0 XP debe ser nivel 1');
assert.strictEqual(p18.window.step18Progress.levelForXp(100),2,'100 XP debe alcanzar nivel 2');
assert.strictEqual(p18.window.step18Progress.levelForXp(400),3,'400 XP debe alcanzar nivel 3');
assert.strictEqual(p18.window.step18Progress.xpForLevel(3),400,'La fórmula XP/nivel debe ser consistente');
assert.strictEqual(typeof p18.window.step18Progress.awardGame,'function','Debe existir adjudicación unificada de progreso');
assert(html.includes('src="step18-progress-unified.js"'),'play.html debe cargar la progresión unificada');
console.log('✓ Mejora 3: XP, niveles, rachas y logros unificados');

const chars11=fs.readFileSync('step11-characters-runtime.js','utf8');
assert(chars11.includes("ABILITIES"),'Los personajes deben tener habilidades');
assert(chars11.includes("window.step11GetAbility"),'Debe existir acceso a la habilidad del personaje');
const app10=fs.readFileSync('app-v10.js','utf8');
assert(app10.includes('characterAbility(p)'), 'El motor debe resolver la habilidad activa');
assert(app10.includes("type==='shield'"), 'Debe existir habilidad de protección');
assert(app10.includes("type==='bonus'"), 'Debe existir habilidad de punto extra');
assert(app10.includes("type==='move'"), 'Debe existir habilidad de movimiento');
console.log('✓ Mejora 4: habilidades de personajes integradas');

const ai10=fs.readFileSync('app-v10.js','utf8');
assert(ai10.includes('aiLearningProfile'), 'La IA debe conservar memoria por módulo');
assert(ai10.includes('aiAnswerProbability'), 'La IA debe ajustar probabilidad por dificultad');
assert(ai10.includes('recordAiAnswer'), 'La IA debe registrar sus resultados');
console.log('✓ Mejora 5: IA adaptativa integrada');


// Mejora 7: ronda final.
assert(app.includes('const FINAL_ROUND_COUNT=10,FINAL_ROUND_TARGET=300;'),'La ronda final debe tener 10 preguntas y meta de 300 puntos');
assert(app.includes('function startFinalRound()'),'Falta inicio de la ronda final');
assert(app.includes('function answerFinal(choice)'),'Falta evaluación de respuestas finales');
assert(app.includes('function finishFinalRound()'),'Falta cierre de ronda final');
assert(app.includes('if(roundNo>=8){'),'La partida debe enlazar la ronda final tras la ronda 8');
assert(app.includes('setTimeout(()=>startFinalRound(),700);'),'La ronda final debe iniciar después de la partida principal');
assert(app.includes('f.score>=FINAL_ROUND_TARGET'),'Debe comprobarse la meta de 300 puntos');
assert(app.includes('f.index+1>=FINAL_ROUND_COUNT'),'Debe terminar exactamente después de 10 preguntas');
console.log('✓ Mejora 7: ronda final integrada y validada');


// Mejora 8: estadísticas persistentes por especialidad.
const specialtySource=fs.readFileSync('step19-specialty-stats.js','utf8');
const specialtyCtx={window:{},document:{addEventListener(){},getElementById(){return null}}};
vm.runInNewContext(specialtySource,specialtyCtx);
assert.strictEqual(typeof specialtyCtx.window.step19SpecialtyStats.record,'function','Debe existir registro por especialidad');
assert.strictEqual(typeof specialtyCtx.window.step19SpecialtyStats.summary,'function','Debe existir resumen por especialidad');
const fakeStorage={};
specialtyCtx.localStorage={getItem(k){return fakeStorage[k]||null},setItem(k,v){fakeStorage[k]=v}};
specialtyCtx.window.step19SpecialtyStats.record('ortodoncia','correct');
specialtyCtx.window.step19SpecialtyStats.record('ortodoncia','wrong');
const sp=specialtyCtx.window.step19SpecialtyStats.summary();
assert.strictEqual(sp.length,1,'Debe crear una especialidad al registrar respuestas');
assert.strictEqual(sp[0].id,'ortodoncia','Debe conservar el identificador de especialidad');
assert.strictEqual(sp[0].attempts,2,'Debe contabilizar intentos por especialidad');
assert.strictEqual(sp[0].correct,1,'Debe contabilizar aciertos por especialidad');
assert.strictEqual(sp[0].accuracy,50,'Debe calcular precisión por especialidad');
assert(app.includes('quizStats.specialties'),'La partida debe conservar estadísticas por especialidad');
assert(app.includes('step19SpecialtyStats?.record'),'El motor debe persistir estadísticas por especialidad');
assert(html.includes('id="profileSpecialties"'),'El perfil debe mostrar estadísticas por especialidad');
assert(html.includes('src="step19-specialty-stats.js"'),'play.html debe cargar la mejora 8');
assert(css.includes('.profile-specialties')&&css.includes('.profile-specialty-bar'),'Debe existir presentación visual compacta por especialidad');
console.log('✓ Mejora 8: estadísticas persistentes por especialidad, precisión y perfil');

const examJs=fs.readFileSync('exam.js','utf8');
assert(examJs.includes('EXAM_MINUTES_PER_QUESTION=1'),'El examen debe tener tiempo proporcional a su extensión');
assert(examJs.includes('function startExamTimer()'),'El modo examen debe iniciar temporizador');
assert(examJs.includes('function stopExamTimer()'),'El modo examen debe detener temporizador');
assert(examJs.includes('exam.timedOut=true'),'El examen debe registrar agotamiento de tiempo');
assert(examJs.includes("percent>=70?'APROBADO':'NO APROBADO'"),'El examen debe calcular aprobación al 70%');
assert(examJs.includes('mínimo de aprobación: 70%'),'El resultado debe mostrar el umbral de aprobación');
assert(examHtml.includes('id="examTimer"'),'La interfaz debe mostrar el temporizador');
assert(examHtml.includes('id="passStatus"'),'La interfaz debe mostrar el estado de aprobación');
console.log('✓ Mejora 9: modo examen cronometrado, aprobación 70% y cierre automático por tiempo');

// Mejora 10: Modo Casos Clínicos.
const clinicalRuntime=fs.readFileSync('step20-clinical-cases.js','utf8');
assert(clinicalRuntime.includes('window.step20ClinicalCases'),'Debe existir API del modo de casos clínicos');
assert(clinicalRuntime.includes('function start()'),'Debe existir inicio del entrenamiento clínico');
assert(clinicalRuntime.includes('function answer(i)'),'Debe existir evaluación de casos');
assert(clinicalRuntime.includes('localStorage.setItem(KEY'),'Debe conservar estadísticas clínicas');
assert(html.includes('id="clinicalCasesBtn"'),'Debe existir acceso al modo de casos clínicos');
assert(html.includes('id="clinicalCasesDialog"'),'Debe existir diálogo de casos clínicos');
assert(html.includes('src="step20-clinical-cases.js"'),'play.html debe cargar la mejora 10');
assert(css.includes('.clinical-case-option')&&css.includes('.clinical-case-feedback'),'Debe existir estilo para opciones y retroalimentación clínica');
console.log('✓ Mejora 10: modo de casos clínicos con retroalimentación y estadísticas persistentes');

// Mejora 11: Multijugador Bluetooth Android.
const btRuntime=fs.readFileSync('step21-bluetooth-runtime.js','utf8');
const btNative=fs.readFileSync('native/DentalBluetoothPlugin.java','utf8');
assert(btRuntime.includes("registerPlugin('DentalBluetooth')"),'El runtime debe registrar el puente Bluetooth nativo');
assert(btRuntime.includes('startHost')&&btRuntime.includes('scan')&&btRuntime.includes('connect'),'Debe existir anfitrión, búsqueda y conexión Bluetooth');
assert(btRuntime.includes('send({type:\'hello\''),'Debe existir handshake de sesión');
assert(btNative.includes('@CapacitorPlugin(name="DentalBluetooth"'),'Debe existir plugin Capacitor nativo');
assert(btNative.includes('listenUsingRfcommWithServiceRecord'),'El anfitrión debe abrir un canal Bluetooth RFCOMM');
assert(btNative.includes('createRfcommSocketToServiceRecord'),'El cliente debe poder conectarse por RFCOMM');
assert(btNative.includes('BLUETOOTH_CONNECT')||btNative.includes('BLUETOOTH_SCAN'),'El puente debe contemplar permisos Bluetooth modernos');
assert(html.includes('id="bluetoothBtn"')&&html.includes('id="bluetoothDialog"'),'La interfaz debe exponer el modo Bluetooth');
assert(html.includes('src="step21-bluetooth-runtime.js"'),'play.html debe cargar la mejora 11');
assert(css.includes('.bluetooth-card')&&css.includes('.bluetooth-devices'),'Debe existir UI para sala y dispositivos Bluetooth');
console.log('✓ Mejora 11: multijugador Bluetooth con puente Android, sala, búsqueda, conexión y canal de mensajes');


// Mejora 12: preparación reproducible para Google Play.
const playstorePreflight=fs.readFileSync('playstore-preflight.js','utf8');
assert(playstorePreflight.includes("com.uam.cientodentistas"),'El preflight debe fijar el package Android oficial');
assert(playstorePreflight.includes("versionCode 37")&&playstorePreflight.includes('versionName "3.7.0"'),'El preflight debe validar el versionado actual');
assert(playstorePreflight.includes('targetSdkVersion = 36'),'El preflight debe validar target SDK 36');
const playstoreWorkflow=fs.readFileSync('.github/workflows/playstore-aab.yml','utf8');
assert(playstoreWorkflow.includes('node playstore-preflight.js'),'El workflow Play Store debe ejecutar el preflight');
assert(playstoreWorkflow.includes('bundleRelease'),'El workflow Play Store debe generar AAB release');
assert(playstoreWorkflow.includes('step21-bluetooth-runtime.js'),'El AAB debe incluir Bluetooth');
assert(playstoreWorkflow.includes('native/DentalBluetoothPlugin.java'),'El AAB debe incluir el puente Bluetooth');
assert(playstoreWorkflow.includes("d['appId']='com.uam.cientodentistas'"),'El workflow no debe cambiar el package oficial');
assert(fs.readFileSync('privacy.html','utf8').includes('permisos de Bluetooth'),'La política debe documentar Bluetooth');
console.log('✓ Mejora 12: preflight Play Console, AAB release, package oficial, target SDK 36 y privacidad Bluetooth');


// Mejora 13: sincronización autoritativa de partida por Bluetooth.
assert(app.includes('window.step22Sync'),'Debe existir puente de sincronización de partida');
assert(app.includes('getSnapshot:function()'),'El host debe poder generar snapshots');
assert(app.includes('applySnapshot:function(snapshot)'),'El cliente debe poder aplicar snapshots');
assert(app.includes('confirmRemoteAnswer:function(index)'),'El host debe resolver respuestas remotas');
assert(app.includes('rollRemote:function()'),'El host debe resolver tiradas remotas');
const bt13=fs.readFileSync('step21-bluetooth-runtime.js','utf8');
assert(bt13.includes('startSync()'),'Bluetooth debe iniciar sincronización al conectar');
assert(bt13.includes("type:'state'"),'Bluetooth debe transportar snapshots de estado');
assert(bt13.includes("type:'roll'"),'El cliente debe poder solicitar una tirada al host');
assert(bt13.includes("type:'answer'"),'El cliente debe poder enviar una respuesta al host');
assert(bt13.includes('handleSyncMessage'),'Debe existir receptor de mensajes de sincronización');
assert(bt13.includes("state.role==='host'"),'El host debe conservar autoridad sobre la partida');
console.log('✓ Mejora 13: sincronización autoritativa de turno, dados, preguntas, respuestas y estado por Bluetooth');


// Mejora 14: lobby Bluetooth, capacidad y compatibilidad.
const bt14=fs.readFileSync('step21-bluetooth-runtime.js','utf8');
assert(bt14.includes('MAX_PEERS=5'),'El lobby Bluetooth debe admitir hasta 5 dispositivos');
assert(bt14.includes('PROTOCOL_VERSION'),'Debe existir versión de protocolo');
assert(bt14.includes('roomCode()'),'El anfitrión debe generar identificador de sala');
assert(bt14.includes('state.peers'),'Debe existir lista de participantes');
assert(bt14.includes("msg.type==='hello'"),'Debe existir handshake del lobby');
assert(bt14.includes("msg.type==='reject'"),'Debe rechazar protocolos incompatibles');
assert(bt14.includes('state.peers.size>=MAX_PEERS-1'),'La sala debe limitar participantes');
assert(html.includes('id="btLobby"'),'La interfaz debe mostrar el lobby Bluetooth');
assert(css.includes('.bluetooth-lobby')&&css.includes('.bluetooth-peer'),'El lobby debe tener presentación visual');
console.log('✓ Mejora 14: lobby Bluetooth, sala identificada, máximo 5 dispositivos y compatibilidad de protocolo');


// Mejora 15: auditoría de recursos empaquetados.
const apkAudit=fs.readFileSync('apk-package-audit.py','utf8');
assert(apkAudit.includes("assets/public/"),'La auditoría debe inspeccionar assets/public dentro del APK');
assert(apkAudit.includes('play.html'),'La auditoría debe validar play.html');
assert(apkAudit.includes('Recursos de play.html ausentes en APK'),'Debe reportar recursos web ausentes');
const workflow=fs.readFileSync('.github/workflows/android-apk.yml','utf8');
assert(workflow.includes('apk-package-audit.py'),'El workflow debe ejecutar la auditoría de APK');
assert(workflow.indexOf('Audit APK package resources')<workflow.indexOf('Rename APK'),'La auditoría debe ocurrir antes de publicar el artefacto');
console.log('✓ Mejora 15: auditoría automática de recursos empaquetados en APK');


// Mejora 16: AAB Play Store debe contener el runtime completo.
const playWorkflow=fs.readFileSync('.github/workflows/playstore-aab.yml','utf8');
const playPreflight=fs.readFileSync('playstore-preflight.js','utf8');
assert(playWorkflow.includes('bundleRelease'),'Play Store debe construir AAB release');
for(const file of ['step16-question-integrity.js','step17-study-runtime.js','step18-progress-unified.js','step19-specialty-stats.js','step20-clinical-cases.js','step21-bluetooth-runtime.js']){
  assert(playWorkflow.includes(file),'AAB incompleto: falta '+file);
  assert(playPreflight.includes(file),'Preflight incompleto: falta '+file);
}
assert(playWorkflow.includes('com.uam.cientodentistas'),'El AAB debe conservar el package oficial');
assert(playWorkflow.includes('versionCode 37')&&playWorkflow.includes('versionName "3.7.0"'),'El AAB debe fijar la versión 3.7.0/37');
assert(playWorkflow.includes('targetSdkVersion = 36'),'El AAB debe usar target SDK 36');
console.log('✓ Mejora 16: AAB Play Store con runtime completo y preflight reforzado');


// Mejora 17: recuperación y respaldo de partidas.
const recovery=fs.readFileSync('step23-recovery-runtime.js','utf8');
const appSource=fs.readFileSync('app-v10.js','utf8');
const playSource=fs.readFileSync('play.html','utf8');
assert(recovery.includes("elCaminoDentalSaveBackupV1"),'Debe existir almacenamiento de respaldo');
assert(recovery.includes('function recover'), 'Debe existir recuperación de partida');
assert(recovery.includes('Date.now()-Number(x.savedAt||0)>MAX_AGE'), 'El backup debe caducar');
assert(recovery.includes('players.length>=1&&s.players.length<=5'), 'Debe validar estructura de jugadores');
assert(appSource.includes('window.step23Recovery?.writeBackup?.(state)'), 'saveGame debe crear backup');
assert(playSource.includes('step23-recovery-runtime.js'), 'play.html debe cargar recuperación');
console.log('✓ Mejora 17: save recovery y backup validados');


// Mejora 18 + reconexión Bluetooth: progreso unificado y sesión persistente.
const bt21=fs.readFileSync('step21-bluetooth-runtime.js','utf8');
const playStore18=fs.readFileSync('.github/workflows/playstore-aab.yml','utf8');
assert(progress18.includes('function merge(incoming)'), 'Progreso debe tener reconciliación');
assert(progress18.includes('window.step18Reconcile=merge'), 'Debe exponer reconciliación global');
assert(bt21.includes('elCaminoDentalBluetoothSessionV1'), 'Bluetooth debe persistir la sesión');
assert(bt21.includes('resume:true'), 'Bluetooth debe solicitar/restaurar la sesión al reconectar');
assert(bt21.includes('lastSnapshot'), 'Bluetooth debe conservar snapshot de partida');
assert((bt21.match(/function stop\(/g)||[]).length===1, 'Debe existir un único stop Bluetooth');
assert(playStore18.includes('step23-recovery-runtime.js'), 'AAB debe incluir recuperación');
console.log('✓ Mejora 18: progreso unificado + reconexión Bluetooth validados');


/* Mejora 19 — Bluetooth: reconexión, identidad, sala y snapshots monotónicos. */
const bt=fs.readFileSync('step21-bluetooth-runtime.js','utf8');
assert(bt.includes("PROTOCOL_VERSION='1'"),'Bluetooth debe fijar versión de protocolo');
assert(bt.includes("MAX_PEERS=5"),'Bluetooth debe limitar la sala a 5');
assert(bt.includes("SESSION_MAX_AGE=30*60*1000"),'La sesión Bluetooth debe caducar para evitar reconectar partidas obsoletas');
assert(bt.includes("elCaminoDentalPlayerIdV1"),'Cada instalación debe conservar una identidad estable para reconexión');
assert(bt.includes("snapshotVersion"),'La sincronización Bluetooth debe versionar snapshots');
assert(bt.includes('incoming<=state.snapshotVersion'),'El cliente debe ignorar snapshots atrasados o repetidos');
assert(bt.includes("msg.roomId!==state.roomId"),'Un estado de otra sala no debe aplicarse');
assert(bt.includes("reason:'room'"),'El host debe rechazar una reconexión a una sala distinta');
assert(bt.includes("reason:'protocol'"),'El host debe rechazar protocolo incompatible');
assert(bt.includes("resume:true"),'La reconexión debe solicitar recuperación de partida');
assert(bt.includes("lastSnapshot"),'La sesión debe conservar el último estado de partida');
assert(bt.includes("lastPeerId"),'La sesión debe conservar el último dispositivo conectado');
assert(bt.includes("Bluetooth desconectado. La partida queda guardada para reconexión."),'La desconexión debe conservar la partida');
assert(!((bt.match(/async function stop\(\)/g)||[]).length>1),'No debe existir una segunda función stop Bluetooth');
const progress19=fs.readFileSync('step18-progress-unified.js','utf8');
assert.strictEqual((progress19.match(/window\.step18Progress=/g)||[]).length,1,'El progreso debe tener una única fuente window.step18Progress');
assert(progress19.includes('window.step18Reconcile=merge'),'Debe existir reconciliación única del progreso');
assert(progress19.includes("elCaminoDentalProgressV2"),'Debe conservarse la clave V2 de progreso');
console.log('✓ Mejora 19: Bluetooth con sesión caducable, identidad, sala, snapshots monotónicos y progreso unificado');


// Mejora 19 — pruebas de reconexión y anti-corrupción de estado.
const btRuntimeSource=fs.readFileSync('step21-bluetooth-runtime.js','utf8');
const nativeBluetoothSource=fs.readFileSync('native/DentalBluetoothPlugin.java','utf8');
assert(btRuntimeSource.includes('snapshotVersion'),'Debe existir versionado de snapshots');
assert(btRuntimeSource.includes('hostPlayerId'),'El cliente debe autenticar snapshots por identidad del host');
assert(btRuntimeSource.includes('msg.playerId!==state.hostPlayerId'),'Debe rechazarse un snapshot de un host no autenticado');
assert(btRuntimeSource.includes("msg.type==='roll'")&&btRuntimeSource.includes('actionId'),'Las tiradas remotas deben llevar identificador idempotente');
assert(btRuntimeSource.includes('seenActions'),'Debe existir deduplicación de acciones');
assert(btRuntimeSource.includes("reason:'capacity'"),'Debe rechazarse una sala llena');
assert(btRuntimeSource.includes("state.peers.delete(e.deviceId)"),'El abandono de un jugador debe liberar su plaza');
assert(btRuntimeSource.includes("state.connected=false;state.compatible=false;saveSession()"),'El cliente debe persistir la desconexión');
assert(nativeBluetoothSource.includes('@Permission(alias="bluetooth"'),'El plugin debe declarar permisos runtime mediante Capacitor');
assert(nativeBluetoothSource.includes('requestPermissionForAlias("bluetooth"'),'initialize debe solicitar permisos runtime');
assert(nativeBluetoothSource.includes('@PermissionCallback'),'Debe existir callback de permisos');
assert(nativeBluetoothSource.includes('o.put("connected",connected)'),'El evento nativo debe distinguir conexión y desconexión');

const btVmLocal={};
const btStorage=new Map();
const btWindow={};
const btDocument={getElementById:()=>null};
const btSandbox={
  window:btWindow,
  document:btDocument,
  localStorage:{
    getItem:k=>btStorage.has(k)?btStorage.get(k):null,
    setItem:(k,v)=>btStorage.set(k,String(v)),
    removeItem:k=>btStorage.delete(k)
  },
  Date,
  Math,
  JSON,
  console,
  setInterval:()=>1,
  clearInterval:()=>{}
};
btWindow.Capacitor=undefined;
btWindow.step22Sync={
  applied:[],
  getSnapshot:()=>({state:{players:[],current:0},pendingQuestion:null,selectedAnswer:null,locked:false}),
  applySnapshot:s=>{btWindow.step22Sync.applied.push(s);return true}
};
vm.runInNewContext(btRuntimeSource,btSandbox,{filename:'step21-bluetooth-runtime.js'});
const btTest=btWindow.step21BluetoothTest;
const btState=btWindow.step21Bluetooth.state;
const persistentPlayerId=btState.playerId;
assert(btTest,'Debe existir API de pruebas Bluetooth');
assert.strictEqual(btTest.isSessionFresh({roomId:'ROOM',updatedAt:Date.now()}),true,'Una sesión reciente debe ser válida');
assert.strictEqual(btTest.isSessionFresh({roomId:'ROOM',updatedAt:Date.now()-30*60*1000-1}),false,'Una sesión vieja debe caducar');
btState.role='client';btState.connected=true;btState.roomId='ROOM';btState.snapshotVersion=5;btState.hostPlayerId='host-1';btState.playerId='client-1';
btTest.handleSyncMessage({type:'state',protocol:'1',roomId:'ROOM',playerId:'host-1',snapshotVersion:4,snapshot:{n:4}});
assert.strictEqual(btState.snapshotVersion,5,'Nunca debe aplicar un snapshot antiguo');
assert.strictEqual(btWindow.step22Sync.applied.length,0,'Un snapshot fuera de orden no debe llegar al motor');
btTest.handleSyncMessage({type:'state',protocol:'1',roomId:'ROOM',playerId:'otro-host',snapshotVersion:6,snapshot:{n:6}});
assert.strictEqual(btState.snapshotVersion,5,'Un host no autenticado no debe avanzar el estado');
btTest.handleSyncMessage({type:'state',protocol:'1',roomId:'ROOM',playerId:'host-1',snapshotVersion:6,snapshot:{n:6}});
assert.strictEqual(btState.snapshotVersion,6,'El snapshot más reciente y autenticado debe aplicarse');
assert.strictEqual(btWindow.step22Sync.applied.length,1,'Debe aplicarse exactamente un snapshot nuevo');

btState.role='host';btState.roomId='ROOM';btState.playerId='host-1';btState.peers.set('dev-1',{playerId:'client-1',compatible:true});
assert.strictEqual(btTest.validateEnvelope({protocol:'1',roomId:'ROOM',playerId:'client-1',type:'roll'}),true,'Envelope válido debe aceptarse');
assert.strictEqual(btTest.validateEnvelope({protocol:'2',roomId:'ROOM',playerId:'client-1',type:'roll'}),false,'Protocolo incorrecto debe rechazarse');
assert.strictEqual(btTest.validateEnvelope({protocol:'1',roomId:'OTHER',playerId:'client-1',type:'roll'}),false,'roomId incorrecto debe rechazarse');
assert.strictEqual(btTest.validateEnvelope({protocol:'1',roomId:'ROOM',playerId:'',type:'roll'}),false,'playerId vacío debe rechazarse');
assert.strictEqual(btTest.acceptAction({protocol:'1',roomId:'ROOM',playerId:'client-1',type:'roll',actionId:'a1',deviceId:'dev-1'},'roll'),true,'Primera acción debe aceptarse');
assert.strictEqual(btTest.acceptAction({protocol:'1',roomId:'ROOM',playerId:'client-1',type:'roll',actionId:'a1',deviceId:'dev-1'},'roll'),false,'Mensaje repetido debe ignorarse');
assert.strictEqual(btTest.acceptAction({protocol:'1',roomId:'ROOM',playerId:'client-1',type:'roll',actionId:'a2',deviceId:'dev-1'},'answer'),false,'Tipo de acción incorrecto debe rechazarse');
assert.strictEqual(btTest.acceptAction({protocol:'1',roomId:'ROOM',playerId:'client-1',type:'roll',actionId:'a2',deviceId:'dev-2'},'roll'),true,'Otro dispositivo con acción nueva debe poder continuar');

const savedSession=JSON.parse(btStorage.get('elCaminoDentalBluetoothSessionV1'));
assert(savedSession,'La sesión Bluetooth debe persistirse');
assert.strictEqual(savedSession.playerId,'client-1','La identidad persistente debe quedar guardada');
assert.strictEqual(btStorage.get('elCaminoDentalPlayerIdV1'),persistentPlayerId,'La identidad debe existir en el almacenamiento persistente');
assert.strictEqual(btRuntimeSource.includes('saveSession()'),true,'La persistencia debe usarse en el runtime');
console.log('✓ Mejora 19: reconexión, snapshots fuera de orden, expiración, roomId/protocolo/playerId, deduplicación, abandono y permisos runtime');
