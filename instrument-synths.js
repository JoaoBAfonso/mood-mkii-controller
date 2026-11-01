// Evidence: DeepMind 12 manual §§16–17 (2016), MicroFreak 5.0.1 appendix D,
// TR-8S MIDI chart 1.10 + reference 3.00, PRO-VS MINI v2 guide pp.170–171.
// Values are wire values, not readback or reconstructed hardware patch defaults.
const choices = (...labels) => labels.map((label, value) => ({ value, label }));
const indexed = (max, prefix) => Array.from({ length: max + 1 }, (_, value) => ({ value, label: `${prefix} ${value}` }));
const range = (protocol, number, name, section, max = 127, physical = false, hint = 'Ajusta o valor enviado; o estado real do instrumento não é consultado.') =>
  ({ id: `${protocol}-${number}`, name, section, kind: 'range', protocol, number, min: 0, max, initial: 0, hint, physical, ...(protocol === 'nrpn' ? { dataBits: 14 } : {}) });
const menu = (number, name, section, options, hint) => ({
  ...range('nrpn', number, name, section, Math.max(...options.map((o) => o.value)), false, hint),
  kind: 'select', choices: options, initial: options[0].value,
});
const switchControl = (protocol, number, name, section, onValue = 1, physical = false, hint) => ({
  ...range(protocol, number, name, section, onValue, physical, hint), kind: 'toggle', onValue, offValue: 0,
});
const command = (number, name, hint, confirmation) => ({
  id: `cc-${number}`, name, section: 'Mensagens de execução', kind: 'action', protocol: 'cc', number,
  min: 0, max: 127, value: 0, hint, physical: false, ...(confirmation ? { confirmation } : {}),
});
const deepUrl = 'https://synthmanuals.com/manuals/behringer/deepmind_12/user_manual/deepmind_12_m_en.pdf';
const microUrl = 'https://downloads.arturia.net/products/microfreak/manual/microfreak_Manual_5_0_1_EN.pdf';
const microFaq = 'https://support.arturia.com/hc/en-us/articles/4405748052626-MicroFreak-General-Questions';
const trUrl = 'https://static.roland.com/assets/media/pdf/TR-8S_MIDIImpleChart_eng03_W.pdf';
const trMain = 'https://static.roland.com/assets/media/pdf/TR-8S_Reference_eng05_W.pdf';
const proUrl = 'https://cdn-media.empowertribe.com/07c681beb5724cb797eff24a67095bc7/QSG_BE_0722-ABF_PRO-VS-MINI_WW.pdf';

const deepControls = [];
const nr = (n, name, section, max = 255, physical = false, hint) => deepControls.push(range('nrpn', n, name, section, max, physical, hint));
const ns = (n, name, section, labels, hint) => deepControls.push(menu(n, name, section, labels, hint));
const nt = (n, name, section, physical = false, hint) => deepControls.push(switchControl('nrpn', n, name, section, 1, physical, hint));
for (let lfo = 0; lfo < 2; lfo++) {
  const start = lfo * 7, section = `LFO ${lfo + 1}`;
  nr(start, 'Velocidade', section, 255, true);
  nr(start + 1, 'Atraso / fade', section, 255, true);
  ns(start + 2, 'Forma', section, choices('Seno', 'Triângulo', 'Quadrada', 'Rampa ascendente', 'Rampa descendente', 'Sample & hold', 'Sample & glide'));
  nt(start + 3, 'Reinício pela tecla', section);
  nt(start + 4, 'Sincronizar com arpejo', section);
  // §17 contradicts its own LFO1 spread note: restrict address5 to the printed range.
  ns(start + 5, 'Modo de vozes', section, lfo ? [
    ...choices('Polifónico', 'Mono'),
    ...Array.from({ length: 254 }, (_, i) => ({ value: i + 2, label: `Spread ${i + 1}` })),
  ] : choices('Polifónico', 'Mono'));
  nr(start + 6, 'Suavização', section);
}
ns(14, 'Registo OSC 1', 'Osciladores', choices("16′", "8′", "4′"));
ns(15, 'Registo OSC 2', 'Osciladores', choices("16′", "8′", "4′"));
const envSources = choices('Manual', 'LFO 1', 'LFO 2', 'Envelope VCA', 'Envelope VCF', 'Envelope MOD');
ns(16, 'Fonte PWM · OSC 1', 'Osciladores', envSources);
ns(17, 'Fonte de timbre · OSC 2', 'Osciladores', envSources);
nt(18, 'Pulso OSC 1', 'Osciladores', true);
nt(19, 'Dente de serra OSC 1', 'Osciladores', true);
nt(20, 'Sync dos osciladores', 'Osciladores', true);
const pitchSources = choices('LFO 1', 'LFO 2', 'Envelope VCA', 'Envelope VCF', 'Envelope MOD', 'LFO 1 unipolar', 'LFO 2 unipolar');
nr(21, 'Modulação de altura OSC 1', 'Osciladores', 255, true);
ns(22, 'Fonte de altura OSC 1', 'Osciladores', pitchSources);
nr(23, 'Pressão → altura OSC 1', 'Expressão');
nr(24, 'Roda → altura OSC 1', 'Expressão');
nr(25, 'Profundidade PWM OSC 1', 'Osciladores', 255, true);
nr(26, 'Nível OSC 2', 'Osciladores', 255, true);
nr(27, 'Altura OSC 2', 'Osciladores', 255, true);
nr(28, 'Modulação de timbre OSC 2', 'Osciladores', 255, true);
nr(29, 'Modulação de altura OSC 2', 'Osciladores', 255, true);
nr(30, 'Pressão → altura OSC 2', 'Expressão');
nr(31, 'Roda → altura OSC 2', 'Expressão');
ns(32, 'Fonte de altura OSC 2', 'Osciladores', pitchSources);
nr(33, 'Nível de ruído', 'Osciladores', 255, true);
nr(34, 'Tempo de portamento', 'Expressão');
ns(35, 'Modo de portamento', 'Expressão', choices('Normal', 'Ligado por dedos', 'Velocidade fixa', 'Fixa ligada', 'Exponencial', 'Exponencial ligado', '+2 fixo', '−2 fixo', '+5 fixo', '−5 fixo', '+12 fixo', '−12 fixo', '+24 fixo', '−24 fixo'));
nr(36, 'Bend ascendente', 'Expressão', 24, false, 'Amplitude em semitons; não move a roda de pitch bend.');
nr(37, 'Bend descendente', 'Expressão', 24, false, 'Amplitude em semitons; não move a roda de pitch bend.');
ns(38, 'Destino da modulação OSC 1', 'Osciladores', choices('OSC 1 + 2', 'Só OSC 1'));
for (const [n, name, physical] of [
  [39, 'Corte passa-baixo', true], [40, 'Corte passa-alto', true], [41, 'Ressonância', true],
  [42, 'Envelope → filtro', true], [43, 'Velocidade → envelope do filtro', false],
  [44, 'Bend → corte', false], [45, 'LFO → filtro', true],
]) nr(n, name, 'Filtro', 255, physical);
ns(46, 'LFO do filtro', 'Filtro', choices('LFO 1', 'LFO 2'));
nr(47, 'Pressão → LFO do filtro', 'Filtro');
nr(48, 'Roda → LFO do filtro', 'Filtro');
nr(49, 'Seguimento do teclado', 'Filtro', 255, true);
ns(50, 'Polaridade do envelope', 'Filtro', choices('Negativa', 'Positiva'));
ns(51, 'Inclinação', 'Filtro', choices('4 polos', '2 polos'));
nt(52, 'Reforço de graves', 'Filtro', true);
for (const [start, env] of [[53, 'VCA'], [62, 'VCF'], [71, 'MOD']]) {
  for (const [i, stage] of ['Ataque', 'Decaimento', 'Sustain', 'Release'].entries()) nr(start + i, stage, `Envelope ${env}`, 255, true);
  ns(start + 4, 'Disparo', `Envelope ${env}`, choices('Tecla', 'LFO 1', 'LFO 2', 'Ciclo', 'Passo do sequenciador'));
  for (const [i, stage] of ['Ataque', 'Decaimento', 'Sustain', 'Release'].entries()) nr(start + 5 + i, `Curva · ${stage}`, `Envelope ${env}`, 255, true);
}
nr(80, 'Nível VCA', 'Amplificador', 255, true);
nr(81, 'Profundidade do envelope', 'Amplificador');
nr(82, 'Sensibilidade à velocidade', 'Amplificador');
nr(83, 'Dispersão panorâmica', 'Amplificador', 255, false, 'Centro em 128; extremos correspondem a −128 e +127.');
ns(84, 'Prioridade de notas', 'Vozes', choices('Mais grave', 'Mais aguda', 'Última'));
ns(85, 'Polifonia / uníssono', 'Vozes', choices('Poly', 'Uníssono 2', 'Uníssono 3', 'Uníssono 4', 'Uníssono 6', 'Uníssono 12', 'Mono', 'Mono 2', 'Mono 3', 'Mono 4', 'Mono 6', 'Poly 6', 'Poly 8'));
ns(86, 'Disparo das vozes', 'Vozes', choices('Mono', 'Novo disparo', 'Legato', 'One-shot'));
nr(87, 'Desafinação em uníssono', 'Vozes', 255, true);
for (const [n, name] of [[88, 'Deriva das vozes'], [89, 'Deriva dos parâmetros'], [90, 'Velocidade da deriva'], [91, 'Equilíbrio de portamento']]) nr(n, name, 'Vozes');
nt(92, 'Reinício OSC ao tocar', 'Osciladores');
const modSources = choices('Fonte 0 · não descrita', 'Pitch bend', 'Roda de modulação', 'Pedal contínuo', 'Sopro', 'Pressão', 'LFO 1', 'LFO 2', 'Envelope VCA', 'Envelope VCF', 'Envelope MOD', 'Número da nota', 'Velocidade da nota', 'Sequenciador', 'LFO 1 unipolar', 'LFO 2 unipolar', 'Fade LFO 1', 'Fade LFO 2', 'Velocidade note-off', 'Número da voz', 'CC X', 'CC Y', 'CC Z');
const modDestinationNames = [
  'Destino 0 · não descrito', 'Velocidade LFO 1', 'Atraso LFO 1', 'Suavização LFO 1', 'Forma LFO 1',
  'Velocidade LFO 2', 'Atraso LFO 2', 'Suavização LFO 2', 'Forma LFO 2',
  'Altura OSC 1 + 2', 'Altura OSC 1', 'Altura OSC 2', 'Modulação OSC 1', 'PWM OSC 1', 'Timbre OSC 2', 'Modulação OSC 2',
  'Portamento', 'Corte VCF', 'Ressonância VCF', 'Envelope VCF', 'LFO VCF', 'Tempos de todos os envelopes',
  'Todos os ataques', 'Todos os decaimentos', 'Todos os sustains', 'Todos os releases',
  'Tempos VCA', 'Tempos VCF', 'Tempos MOD', 'Curvas VCA', 'Curvas VCF', 'Curvas MOD',
  ...['VCA', 'VCF', 'MOD'].flatMap((env) => ['Ataque', 'Decaimento', 'Sustain', 'Release', 'Curva ataque', 'Curva decaimento', 'Curva sustain', 'Curva release'].map((name) => `${env} · ${name}`)),
  'VCA todas as vozes', 'VCA vozes ativas', 'Profundidade envelope VCA', 'Dispersão panorâmica', 'Pan VCA',
  'Nível OSC 2', 'Nível de ruído', 'Corte HPF', 'Desafinação uníssono', 'Deriva OSC', 'Deriva dos parâmetros', 'Velocidade deriva', 'Gate do arpejo', 'Suavização sequenciador',
  ...Array.from({ length: 8 }, (_, i) => `Profundidade matriz ${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => Array.from({ length: 12 }, (_, j) => `FX ${i + 1} · parâmetro ${j + 1}`)).flat(),
  ...Array.from({ length: 4 }, (_, i) => `Nível FX ${i + 1}`),
];
for (let bus = 0; bus < 8; bus++) {
  const n = 93 + bus * 3, section = `Matriz · ligação ${bus + 1}`;
  ns(n, 'Fonte', section, modSources);
  ns(n + 1, 'Destino', section, choices(...modDestinationNames));
  nr(n + 2, 'Profundidade', section, 255, false, '128 é neutro; valores menores invertem a modulação.');
}
nt(117, 'Ativar sequenciador', 'Sequenciador de controlo');
ns(118, 'Divisão', 'Sequenciador de controlo', choices('1/2', '3/8', '1/3', '1/4', '3/16', '1/6', '1/8', '3/32', '1/12', '1/16', '3/64', '1/24', '1/32', '3/128', '1/48', '1/64'));
ns(119, 'Comprimento', 'Sequenciador de controlo', Array.from({ length: 32 }, (_, value) => ({ value, label: `${value + 1} passos` })));
nr(120, 'Swing', 'Sequenciador de controlo', 25, false, 'Valor 0 = 50%; valor 25 = 75%.');
ns(121, 'Ciclo e reinício', 'Sequenciador de controlo', choices('Ciclo', 'Reinício por tecla', 'Ciclo + reinício'));
nr(122, 'Suavização', 'Sequenciador de controlo');
for (let i = 0; i < 32; i++) nr(123 + i, `Passo ${i + 1}`, 'Sequenciador de controlo', 255, false, '0 salta o passo; 1 = −127, 128 = neutro e 255 = +127.');
nt(155, 'Ativar arpejo', 'Arpejador', true);
ns(156, 'Padrão de notas', 'Arpejador', choices('Ascendente', 'Descendente', 'Vai e volta', 'Ascendente invertido', 'Descendente invertido', 'Vai e volta invertido', 'Ascendente alternado', 'Descendente alternado', 'Aleatório', 'Ordem tocada', 'Acorde'));
nr(157, 'Andamento', 'Arpejador', 255, true, '0 = 20 BPM; cada incremento acrescenta 1 BPM até 275. Só atua com relógio interno.');
ns(158, 'Divisão', 'Arpejador', choices('1/2', '3/8', '1/3', '1/4', '3/16', '1/6', '1/8', '3/32', '1/12', '1/16', '1/24', '1/32', '1/48'));
nt(159, 'Reinício pela tecla', 'Arpejador');
nr(160, 'Duração gate', 'Arpejador', 255, true);
nt(161, 'Hold', 'Arpejador', true);
ns(162, 'Padrão rítmico', 'Arpejador', [{ value: 0, label: 'Sem padrão' }, ...Array.from({ length: 64 }, (_, i) => ({ value: i + 1, label: i < 32 ? `Fábrica ${i + 1}` : `Utilizador ${i - 31}` }))]);
nr(163, 'Swing', 'Arpejador', 25, false, '0 = 50%; 25 = 75%.');
ns(164, 'Extensão', 'Arpejador', Array.from({ length: 6 }, (_, value) => ({ value, label: `${value + 1} oitavas` })));
ns(165, 'Ligações dos efeitos', 'Encaminhamento', choices('1 → 2 → 3 → 4', '(1 ∥ 2) → 3 → 4', '(1 ∥ 2) → (3 ∥ 4)', '1 ∥ 2 ∥ 3 ∥ 4', '(1 ∥ 2 ∥ 3) → 4', '1 → 2 → (3 ∥ 4)', '1 → (2 ∥ 3 ∥ 4)', '(1 → 2 → 3) ∥ 4', '3 → 4; retorno 4 → 1 → 2', '4; retorno 4 → 1 → 2 → 3'), 'As duas últimas ligações usam feedback. Baixa o volume antes de experimentar.');
const effects = choices('TC-DeepVRB', 'Ambience', 'Room Rev', 'VintageRev', 'Hall Rev', 'Chamber Rev', 'Plate Rev', 'Rich Plate', 'Gated Rev', 'Reverse', 'ChorusVerb', 'DelayVerb', 'FlangeVerb', '4Band EQ', 'Enhancer', 'FairComp', 'MulBndDist', 'RackAmp', 'EdisonEX1', 'Auto-Pan', 'NoiseGate', 'Delay', '3TapDelay', '4TapDelay', 'T-RayDelay', 'DecimDelay', 'ModDlyRev', 'Chorus', 'Chorus-D', 'Flanger', 'Phaser', 'MoodFilter', 'Dual Pitch', 'RotarySpkr');
for (let slot = 0; slot < 4; slot++) {
  const section = `Efeito ${slot + 1}`, start = 166 + slot * 13;
  ns(start, 'Algoritmo', section, effects, 'Carrega outro efeito neste slot; pode perder a edição anterior. A numeração MIDI começa em 0.');
  deepControls.at(-1).apply = (_state, _value, staleSet) => {
    for (let n = start + 1; n <= start + 12; n++) staleSet.add(`nrpn-${n}`);
    staleSet.add(`nrpn-${218 + slot}`);
  };
  for (let param = 0; param < 12; param++) nr(start + param + 1, `Parâmetro ${param + 1}`, section, 255, false, 'A função depende do algoritmo carregado (§9 do manual). Nem todos os efeitos usam os 12 parâmetros; confirma no visor, sem inferir unidades.');
  nr(218 + slot, 'Ganho de saída', section, 150, false, 'Intervalo comum documentado para os quatro slots; vigia o nível ao usar feedback.');
}
ns(222, 'Modo dos efeitos', 'Encaminhamento', choices('Insert', 'Send / retorno', 'Bypass'));
const ascii = indexed(127, 'ASCII').map(({ value, label }) => ({
  value, label: value === 0 ? 'Terminar nome' : value === 32 ? 'Espaço' : value > 32 && value < 127 ? String.fromCharCode(value) : label,
}));
for (let char = 0; char < 17; char++) ns(223 + char, `Carácter ${char + 1}`, 'Nome do programa', ascii, 'Byte ASCII; 0 termina o nome. São 16 caracteres mais terminador. Não guarda o programa.');
ns(240, 'Categoria', 'Programa', choices('Sem categoria', 'Baixo', 'Pad', 'Lead', 'Mono', 'Poly', 'Stab', 'Efeitos sonoros', 'Arpejo', 'Sequência', 'Percussão', 'Ambiente', 'Modular', 'Utilizador 1', 'Utilizador 2', 'Utilizador 3', 'Utilizador 4'));
const transpose = range('nrpn', 241, 'Transposição do programa', 'Programa', 176, false, '128 = sem transposição; intervalo de −48 a +48 semitons. Não transpõe o teclado global.');
transpose.min = 80; transpose.initial = 128;
deepControls.push(transpose);
for (const [n, name, section] of [
  [0, 'Banco · MSB', 'Programa'], [32, 'Banco · LSB', 'Programa'], [1, 'Roda de modulação', 'Expressão'],
  [2, 'Sopro', 'Expressão'], [4, 'Pedal contínuo', 'Expressão'], [7, 'Volume MIDI', 'Amplificador'],
  [8, 'Balanço MIDI', 'Amplificador'], [10, 'Pan MIDI', 'Amplificador'], [11, 'Expressão MIDI', 'Expressão'],
  [113, 'Passagem analógica', 'Encaminhamento'], [115, 'Matriz · eixo X', 'Expressão'],
  [116, 'Matriz · eixo Y', 'Expressão'], [117, 'Matriz · eixo Z', 'Expressão'],
]) deepControls.push(range('cc', n, name, section, 127, n === 1, n === 0 || n === 32 ? 'Bank Select reconhecido; o manual não fixa a relação entre os dois bytes e os bancos A–H. Não é um comando de guardar.' : undefined));
deepControls.push(switchControl('cc', 64, 'Pedal sustain', 'Expressão', 127));
for (const [n, name] of [[120, 'Silenciar áudio'], [121, 'Repor controladores'], [123, 'Libertar todas as notas'], [124, 'Desligar omni'], [125, 'Ligar omni'], [126, 'Modo mono'], [127, 'Modo poly']]) deepControls.push(command(n, name, 'Mensagem de modo MIDI reconhecida em §16.2; não é um restauro de fábrica.', n === 121 ? 'Repor os controladores de execução?' : undefined));
deepControls.push(switchControl('cc', 122, 'Local control', 'Mensagens de execução', 127, false, 'Pode desligar o teclado da síntese interna. Não altera as opções globais por SysEx.'));
deepControls.find((c) => c.id === 'cc-121').apply = (_state, _value, staleSet) => {
  for (const n of [1, 2, 4, 7, 8, 10, 11, 64, 115, 116, 117]) staleSet.add(`cc-${n}`);
};

const microControls = [
  [2, 'Spice', 'Sequência e arpejo'], [5, 'Glide', 'Expressão'], [9, 'Tipo de oscilador · valor MIDI', 'Oscilador digital'],
  [10, 'Wave', 'Oscilador digital'], [12, 'Timbre', 'Oscilador digital'], [13, 'Shape', 'Oscilador digital'],
  [23, 'Corte', 'Filtro analógico'], [24, 'Profundidade cíclica', 'Envelope cíclico'], [26, 'Envelope → filtro', 'Envelope'],
  [28, 'Hold cíclico', 'Envelope cíclico'], [29, 'Sustain', 'Envelope'], [83, 'Ressonância', 'Filtro analógico'],
  [91, 'Velocidade livre', 'Sequência e arpejo'], [92, 'Velocidade sincronizada · valor MIDI', 'Sequência e arpejo'],
  [93, 'Velocidade livre', 'LFO'], [94, 'Velocidade sincronizada · valor MIDI', 'LFO'],
  [102, 'Rise', 'Envelope cíclico'], [103, 'Fall', 'Envelope cíclico'], [105, 'Ataque', 'Envelope'], [106, 'Decaimento / release', 'Envelope'],
].map(([n, name, section]) => range('cc', n, name, section, 127, true,
  n === 9 ? 'Escolhe o motor digital. O apêndice D não publica os limites de cada motor: confirma o nome no visor; não se usam IDs de firmware inferidos.'
    : [10, 12, 13].includes(n) ? 'A função muda com o motor digital, incluindo fala, vocoder, wavetable e amostras. O visor mostra o significado atual.'
      : [92, 94].includes(n) ? 'A divisão depende do modo Sync do instrumento. O manual não especifica os patamares CC; o visor é a referência.'
        : undefined));
microControls.push(switchControl('cc', 64, 'Hold do teclado', 'Expressão', 127, true, 'CC64 é o hold do teclado documentado; não é o botão de escolha de sequência.'));

const drumRows = [
  ['BD', 'Bombo', 36, 35, 20, 23, 24, 96], ['SD', 'Caixa', 38, 40, 25, 28, 29, 97],
  ['LT', 'Tom grave', 43, 41, 46, 47, 48, 102], ['MT', 'Tom médio', 47, 45, 49, 50, 51, 103],
  ['HT', 'Tom agudo', 50, 48, 52, 53, 54, 104], ['RS', 'Aro', 37, 56, 55, 56, 57, 105],
  ['HC', 'Palmas', 39, 54, 58, 59, 60, 106], ['CH', 'Hi-hat fechado', 42, 44, 61, 62, 63, 107],
  ['OH', 'Hi-hat aberto', 46, 55, 80, 81, 82, 108], ['CC', 'Crash', 49, 61, 83, 84, 85, 109],
  ['RC', 'Ride', 51, 63, 86, 87, 88, 110],
];
const trControls = [
  [9, 'Shuffle', 'Ritmo'], [12, 'Nível da entrada externa', 'Entrada e efeitos'], [16, 'Nível delay', 'Entrada e efeitos'],
  [17, 'Tempo delay', 'Entrada e efeitos'], [18, 'Feedback delay', 'Entrada e efeitos'],
  [19, 'CTRL master FX', 'Entrada e efeitos'], [71, 'Accent', 'Ritmo'], [91, 'Nível reverb', 'Entrada e efeitos'],
].map(([n, name, section]) => range('cc', n, name, section, 127, true, n === 19 ? 'Controla o parâmetro já atribuído a MASTER FX CTRL. A atribuição e o tipo de efeito são escolhidos no hardware, não por este CC.' : undefined));
trControls.push(switchControl('cc', 15, 'Master FX ligado', 'Entrada e efeitos', 127, true));
for (const [id, name, , , tune, decay, level, ctrl] of drumRows) {
  for (const [n, label] of [[tune, 'Tune'], [decay, 'Decay'], [level, 'Level'], [ctrl, 'CTRL atribuído']]) trControls.push(range('cc', n, `${id} · ${label}`, name, 127, true,
    n === ctrl ? 'Controla a atribuição atual de CTRL desta pista. Usa CTRL SELECT / INST no TR-8S para escolher o destino; o CC não seleciona instrumentos nem algoritmos.' : 'A escala sonora depende do instrumento/ACB/FM/amostra do kit atual; este valor é MIDI, não uma unidade absoluta.'));
}
const proControls = [
  [1, 'Modulação', 'Expressão', 127, false], [5, 'Portamento', 'Expressão', 31, false],
  ...Array.from({ length: 4 }, (_, i) => [24 + i, `Onda ${'ABCD'[i]}`, `Oscilador ${'ABCD'[i]}`, 127, true]),
  [28, 'Profundidade LFO 2', 'LFO 2', 99, true], [47, 'Envelope → filtro', 'Filtro', 127, false],
  [54, 'Forma LFO 1 · valor MIDI', 'LFO 1', 127, false], [55, 'Forma LFO 2 · valor MIDI', 'LFO 2', 127, false],
  [70, 'Profundidade LFO 1', 'LFO 1', 99, true], [71, 'Ressonância', 'Filtro', 99, true],
  [72, 'Velocidade LFO 1', 'LFO 1', 99, true], [73, 'Velocidade LFO 2', 'LFO 2', 99, true],
  [74, 'Corte', 'Filtro', 99, true],
  ...['Amplitude', 'Filtro'].flatMap((section, env) => ['Ataque', 'Decaimento', 'Sustain', 'Release'].map((name, i) => [81 + env * 4 + i, name, `Envelope ${section}`, 99, true])),
  [91, 'Profundidade chorus', 'Efeito', 99, true], [92, 'Velocidade chorus', 'Efeito', 99, true],
  ...Array.from({ length: 4 }, (_, i) => [111 + i, `Afinação fina ${'ABCD'[i]}`, `Oscilador ${'ABCD'[i]}`, 99, true]),
  ...Array.from({ length: 3 }, (_, i) => [115 + i, `Afinação grossa ${'ABC'[i]}`, `Oscilador ${'ABC'[i]}`, 99, true]),
  [118, 'Afinação grossa · CC118 ambíguo', 'Afinação documentada', 99, false],
].map(([n, name, section, max, physical]) => range('cc', n, name, section, max, physical,
  n === 118 ? 'A tabela oficial repete “Voice C” no CC118. Não se afirma que seja a voz D: confirma no instrumento antes de usar.'
    : [54, 55].includes(n) ? 'A tabela CC cita triângulo, quadrada e serra, mas não fixa os patamares. O menu físico tem ainda rampa e S&H; não são inventados valores CC.'
      : [91, 92].includes(n) ? 'O manual identifica estes CC como chorus. O comportamento nos motores Ensemble/Reverb não tem escala publicada.'
        : n === 47 ? 'O CC tem intervalo 0–127, apesar de o menu do painel mostrar 0–99; usa o intervalo da tabela MIDI.'
          : undefined));
proControls.push({
  ...range('cc', 9, 'Motor de efeito', 'Efeito', 127),
  kind: 'select', choices: [{ value: 0, label: 'Chorus' }, { value: 43, label: 'Ensemble' }, { value: 85, label: 'Reverb' }],
  hint: 'Patamares oficiais: 0–42 Chorus, 43–84 Ensemble, 85–127 Reverb. Requer firmware v2.',
});
for (const control of proControls.filter((c) => c.number >= 24 && c.number <= 27)) {
  control.kind = 'select';
  control.choices = indexed(127, 'Onda');
  control.hint = 'Escolhe o índice da onda desta voz (0–127). A seleção de voz no painel não é necessária para enviar o CC dedicado.';
}

export const synthesizers = [
  {
    id: 'deepmind-12', name: 'DeepMind 12', brand: 'Behringer', category: 'synths',
    subtitle: 'Síntese analógica · 12 vozes · texturas e modulação',
    manualUrl: deepUrl, mainManualUrl: deepUrl, defaultChannel: 1,
    connection: 'USB class-compliant ou MIDI DIN IN. Em GLOBAL → CONNECTIVITY configura RX-CHANNEL e MIDI/USB-CTRL para NRPN na porta usada; PROG-CHANGE em RX ou RX-TX. Os seletores são CC99/98 e os dados CC6/38, sem ampliar a escala de 8 bits. Evita loops: o DeepMind retransmite alterações às outras portas. O volume físico continua a ser a proteção de nível.',
    appearance: { surface: '#303239', ink: '#eeeeeb', accent: '#e94942', layout: 'keyboard', knob: '#17191d' },
    notes: { enabled: true, first: 48, count: 24 }, pitchBend: true,
    presets: { count: 128, offset: 0 },
    controls: deepControls,
    limitations: [
      '§17 usa CC38 para os dados baixos, mesmo em seletores 0–1. Todos os descritores usam dataBits14 para enviar também CC6=0; o máximo efetivo permanece o indicado, normalmente 255.',
      'Não duplicamos os CC de síntese/FX já cobertos por NRPN. CC33 é modulação do filtro, não o byte fino da roda; os CC34–61 também têm funções próprias, não pares CC14.',
      'LFO1 NRPN5 tem range 0–1 na tabela mas menciona spread até255 nas notas: apenas Poly/Mono são expostos. NRPN61/70/79 repetem “Attack Curve”; as curvas Release são confirmadas em §8.8.3.',
      'Recall limitado a 128 posições por PC0–127 (§4.2.3 e §16.1). Seleciona banco A no hardware para os primeiros 128 presets; PC usa o banco atual. O instrumento tem 1024 programas em oito bancos, mas §16.2 não fixa como CC0/32 representam A–H, por isso não se anuncia recall dos 1024.',
      'Guardar, calibrar, volume físico, globals, Wi-Fi e dumps/readback não fazem parte desta superfície. Os globals não têm endereços NRPN publicados em §18; não são confundidos com parâmetros de programa.',
      'Os 12 parâmetros de cada FX têm funções dependentes do algoritmo; a troca do algoritmo não lê nem atualiza valores do hardware. O manual tem inconsistências entre CC X/Y/Z em §8.9 e §16.2; usam-se os CC115/116/117 da tabela MIDI.',
    ],
  },
  {
    id: 'microfreak', name: 'MicroFreak', brand: 'Arturia', category: 'synths', edition: 'Firmware 5',
    subtitle: 'Motores digitais · filtro analógico · exploração criativa',
    manualUrl: microUrl, mainManualUrl: microUrl, defaultChannel: 1,
    connection: 'USB MIDI ou adaptador MIDI TRS fornecido pela Arturia (tipo B) para a entrada MIDI. Em Utility → MIDI escolhe Input chan correspondente; evita Thru/Merge em loop. Sync Source deve corresponder a USB/MIDI para usar relógio externo. Knob send CCs só decide a transmissão dos knobs. Os valores locais são propostas de edição, não leitura do preset.',
    appearance: { surface: '#d8d4c6', ink: '#202529', accent: '#dc7936', layout: 'keyboard', knob: '#373838' },
    controls: microControls, notes: { enabled: true, first: 48, count: 24 }, pitchBend: true,
    presets: { count: 128, offset: 0 }, additionalManualUrls: [microFaq],
    limitations: [
      'Apêndice D documenta CC, não uma tabela NRPN. Não são inventados NRPN para matriz, destinos Assign, LFO Shape, modo do filtro, paraphonic ou menus de amostras.',
      'Tipo de oscilador e divisões Sync são valores MIDI crus: os intervalos de escolha por motor/divisão não são publicados no manual. Wave/Timbre/Shape mudam de função com o motor.',
      'FAQ oficial “How do the Program Changes work?” confirma receção USB/DIN e PC0–127 para presets1–128; os três bancos listados não identificam CC0/32. O manual5 confirma512 slots, mas não publica os bytes do quarto banco. Recall fica em128 posições do banco atual; seleciona primeiro banco no hardware. Não se promete acesso remoto aos512.',
      'FAQ oficial “MIDI Implementation Chart” identifica Pitchbend enviado/recebido; usa-se a mensagem MIDI standard, sem inferir a amplitude em semitons. O campo0–127 da FAQ não é tratado como uma escala NRPN ou CC.',
      'Save/Utility, escolha de sequência A/B, gravação de passos, Dice, modo do filtro e matriz não têm CC atribuídos neste manual. Samples/wavetables exigem MIDI Control Center. Transporte recebido continua não verificado: §12 descreve start/stop transmitidos, não uma coluna de receção.',
    ],
  },
  {
    id: 'tr-8s', name: 'TR-8S', brand: 'Roland', category: 'synths', edition: 'Reference 3.00',
    subtitle: '11 pistas · batidas e variações de timbre',
    manualUrl: trUrl, mainManualUrl: trMain, defaultChannel: 10,
    connection: 'MIDI DIN IN ou USB com o driver Roland necessário. Em UTILITY → MIDI liga Rx EditData e Rx Prog Chg; escolhe Pattern Ch para pads/padrões, ou Kit Ch para mudar kits por PC. Para transporte liga RxStartStop e seleciona TempoSync USB/MIDI/AUTO. Notas e notas ALT abaixo são os valores de fábrica, reatribuíveis em Inst Note. Não devolver USBMidiThru/Soft Thru à própria entrada.',
    appearance: { surface: '#272d31', ink: '#e6e8e7', accent: '#56d08a', layout: 'drum', knob: '#101719' },
    controls: trControls, presets: { count: 128, offset: 0 },
    notes: { enabled: true, pads: drumRows.flatMap(([id, name, note, alt]) => [{ note, name: `${id} · ${name}` }, { note: alt, name: `${id} · ALT` }]) },
    transport: { start: true, stop: true, continue: true },
    limitations: [
      'CC14 AUTO FILL ON e CC70 MANUAL TRIG são apenas transmitidos (LocalSw SURFACE): nunca são enviados como controlo remoto.',
      'Os CC CTRL96/97/102–110 e MASTER FX CTRL19 atuam nos destinos atribuídos no kit; o manual não atribui CC à escolha desses destinos.',
      'PC0–127 escolhe padrão em Pattern Ch ou kit em Kit Ch; se os canais coincidirem pode afetar ambos. Escolhe canais diferentes no hardware conforme a intenção.',
      'Não recebe pitch bend, SysEx, song position, all notes off ou reset controllers segundo esta tabela. Panic deve usar Note Off das notas tocadas.',
      'Seleção de instrumento/amostra/ACB/FM, saídas individuais, routing do kit, gravação TR-REC, variações A–H, mute e gravação em SD não têm mensagens recebidas dedicadas nesta tabela.',
    ],
  },
  {
    id: 'pro-vs-mini', name: 'PRO-VS MINI', brand: 'Behringer', category: 'synths', edition: 'Firmware 2',
    subtitle: 'Síntese vetorial híbrida · ondas em movimento',
    manualUrl: proUrl, mainManualUrl: proUrl, defaultChannel: 1,
    connection: 'USB-C class-compliant ou MIDI DIN IN. No menu FUNC → MENU escolhe MIDI RX e liga MIDI CC; sem essa opção os controladores externos ficam ignorados. Escolhe Sync Source USB ou MIDI no hardware se houver relógio externo. Liga a saída PHONES/áudio separadamente: USB transporta MIDI, não áudio.',
    appearance: { surface: '#272731', ink: '#ebe8e7', accent: '#e95c55', layout: 'wide', knob: '#14141a' },
    controls: proControls, notes: { enabled: true, first: 48, count: 24 },
    limitations: [
      'A tabela MIDI v2 só documenta estes 34 CC; não há NRPN verificado. CC118 repete a voz C em vez de identificar D: não se corrige o documento por suposição.',
      'Joystick X/Y, pontos/loop/repeat do envelope MIX, seletor envelope/LFO/voz, volume de saída e menu OSC ENGINE não têm CC publicados. Os controles de envelope enviados aqui são AMP/FILTER, não MIX.',
      'Os menus físicos têm cinco formas LFO; a tabela CC só cita três e não fornece patamares, por isso não se inventam seletores dessas formas.',
      'Andamento, swing, escala, sequenciador, arpejador, hold/chord, armazenamento e reset ficam no hardware. A QSG v2 publica uma tabela CC, não um chart com coluna de receção PC/bend/transporte: ter programas no visor não prova PC0–31/32 recebido. Presets MIDI permanecem não verificados, não declarados incompatíveis.',
      'Os novos motores Ensemble/Reverb têm seleção CC9 documentada, mas CC91/92 continuam nomeados Chorus. Nenhuma escala adicional é inferida.',
    ],
  },
];
