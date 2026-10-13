'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const app=fs.readFileSync('app-v10.js','utf8');
const start=app.indexOf('function showFinalQuestion(){');
const end=app.indexOf('function showMatchWinner(){',start);
assert(start>=0&&end>start,'Debe encontrarse el bloque real de funciones de ronda final');
const productionFunctions=app.slice(start,end);

const player={name:'Jugador A',finalRoundScore:0,stats:{points:10}};
const other={name:'Jugador B',stats:{points:20}};
const ui={winnerTitle:{textContent:''},winnerText:{textContent:''},winnerStats:{innerHTML:'',querySelectorAll:()=>[]},winnerTopicResults:{innerHTML:''},winnerDialog:{showModal(){}}};
const sandbox={
 state:{players:[player,other],current:1,finalRoundPlayerIndex:0,finalRound:{active:true,index:0,score:0,answers:[],playerIndex:0,answerLocked:false,awarded:false},locked:false},
 FINAL_ROUND_COUNT:10,FINAL_ROUND_TARGET:300,
 FINAL_ROUND_BANK:Array.from({length:10},(_,i)=>({q:'Pregunta '+i,a:['A','B','C'],p:[20,10,0]})),
 $:id=>ui[id]||null,
 haptic:()=>{},saveGame:()=>{},setTimeout:()=>0,
 ensurePlayerStats:p=>p.stats,
 console
};
vm.createContext(sandbox);
vm.runInContext(productionFunctions,sandbox);

sandbox.answerFinal(0);
assert.strictEqual(sandbox.state.finalRound.score,20,'La respuesta válida debe sumar sus puntos');
assert.strictEqual(sandbox.state.finalRound.answers.length,1,'La respuesta válida debe registrarse una vez');
sandbox.answerFinal(1);
assert.strictEqual(sandbox.state.finalRound.score,20,'Un segundo clic no debe sumar puntos otra vez');
assert.strictEqual(sandbox.state.finalRound.answers.length,1,'Un segundo clic no debe duplicar el registro');

sandbox.state.finalRound.answerLocked=false;
sandbox.answerFinal(99);
assert.strictEqual(sandbox.state.finalRound.score,20,'Una opción fuera de rango no debe sumar puntos');
assert.strictEqual(sandbox.state.finalRound.answers.length,1,'Una opción inválida no debe registrarse');

sandbox.state.finalRound.score=120;
sandbox.finishFinalRound();
sandbox.finishFinalRound();
assert.strictEqual(player.finalRoundScore,120,'La ronda final debe asignarse al jugador elegible, no al jugador actual');
assert.strictEqual(player.stats.points,130,'La puntuación final solo debe agregarse una vez');
assert.strictEqual(other.stats.points,20,'No debe modificarse la puntuación del otro jugador');
assert.strictEqual(sandbox.state.finalRound.awarded,true,'La ronda debe quedar marcada como ya premiada');

sandbox.state.finalRound.active=false;
sandbox.answerFinal(0);
assert.strictEqual(sandbox.state.finalRound.score,120,'No deben aceptarse respuestas cuando la ronda final está cerrada');

console.log('✓ Comportamiento real: ronda final suma puntos, bloquea doble clic, rechaza opciones inválidas y premia al jugador correcto una sola vez.');
