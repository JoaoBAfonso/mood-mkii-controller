const choices = (labels, first = 0) => labels.map((label, index) => ({ value: first + index, label }));
const range = (number, name, section, max = 127, initial = 64, hint = '', physical = false) => ({
  id: `cc-${number}`, name, section, kind: 'range', protocol: 'cc', number,
  min: 0, max, initial, physical, hint: hint || 'Ajusta este parâmetro no pedal; o valor apresentado é local, não uma leitura do hardware.',
});
const select = (number, name, section, options, initial = options[0].value, hint = '', physical = false) => ({
  ...range(number, name, section, Math.max(...options.map((option) => option.value)), initial, hint, physical),
  min: Math.min(...options.map((option) => option.value)), kind: 'select', choices: options,
});
const toggle = (number, name, section, onValue = 127, offValue = 0, hint = '', physical = false) => ({
  ...range(number, name, section, Math.max(onValue, offValue), offValue, hint, physical), kind: 'toggle', onValue, offValue,
});
const action = (number, name, section, value = 127, hint = '', physical = false) => {
  const control = { ...range(number, name, section, 127, 0, hint, physical), kind: 'action', value };
  delete control.initial;
  return control;
};
const toggleBypass = (state, value, stale) => {
  if (stale?.has('cc-101')) return state;
  if (Number.isInteger(state['cc-101'])) state['cc-101'] = state['cc-101'] >= 64 ? 0 : 127;
  return state;
};
const appearance = (surface, ink, accent, layout = 'wide') => ({ surface, ink, accent, layout, knob: '#292929' });
const rawBankPreset = (count, skipManual = false) => (channel, slot) => {
  if (!Number.isInteger(channel) || channel < 1 || channel > 16 ||
      !Number.isInteger(slot) || slot < 1 || slot > count) throw new RangeError('Canal ou preset inválido.');
  let program = slot - 1;
  if (skipManual && program >= 127) program++;
  return [[0xb0 + channel - 1, 0, Math.floor(program / 128)], [0xc0 + channel - 1, program % 128]];
};
const sourceAudio = 'https://cdn.shopify.com/s/files/1/0938/1593/0953/files/';

const sl2 = {
  id: 'boss-sl-2', name: 'SL-2', brand: 'BOSS', category: 'pedals', visualization: 'slicer',
  subtitle: 'Recortes rítmicos sincronizados com o teu palco.',
  manualUrl: 'https://static.roland.com/manuals/sl-2/eng/33861479.html',
  mainManualUrl: 'https://static.roland.com/manuals/sl-2/eng/index.html',
  defaultChannel: 1,
  connection: 'Liga uma interface MIDI ao MIDI IN de 3,5 mm com o cabo BOSS BMIDI-5-35 ou equivalente compatível. Não confundas MIDI IN com CTL/EXP. Configura o canal no arranque: tipo DUAL (4), restantes knobs no máximo, pedal pressionado ao ligar; VARIATION 1–10 escolhe canal 1–10 e 11 recebe todos. USB não é uma porta MIDI deste pedal.',
  appearance: appearance('#24adac', '#102a2a', '#efdf66', 'compact'),
  controls: [
    range(16, 'EXP · nível do efeito', 'Expressão', 127, 64, 'Controla o nível do som processado como um pedal de expressão; não altera a seleção de padrões.'),
    range(80, 'Efeito · comando bruto', 'Pedal', 127, 0, 'O manual atribui CC80 ao ligar/desligar, mas não define os intervalos de valores. Verifica a resposta no teu hardware; não é apresentado como um estado confirmado.', true),
    action(81, 'Tap tempo', 'Performance', 127, 'O intervalo entre mensagens determina o andamento. É ignorado enquanto o pedal segue MIDI Clock.', true),
  ],
  transport: { start: true, stop: true, continue: true },
  limitations: [
    'Somente CC16, CC80 e CC81 estão documentados. BALANCE, ATTACK, DUTY, TEMPO, tipo e VARIATION são ajustes físicos, não CCs adicionais.',
    'Tipos físicos: SINGLE (1/2), DUAL (3/4), TREMOLO (5), HARMONIC (6), SFX (7/8); cada tipo oferece 11 variações. Não há seleção remota documentada dos 88 padrões nem presets por Program Change.',
    'OUTPUT MODE e atribuições CTL/EXP são configurados no hardware. A sincronização recebe F8/FA/FB/FC; Start reinicia o padrão. O tempo de MIDI Clock não é guardado.',
    'A documentação oficial não especifica valores on/off de CC80; não se assume o limiar 64.',
  ],
};

const deco = {
  id: 'strymon-deco-v2', name: 'Deco', edition: 'v2', brand: 'Strymon', category: 'pedals', visualization: 'tape',
  subtitle: 'Saturação e duas máquinas de fita numa só textura.',
  manualUrl: 'https://www.strymon.net/manuals/Deco_v2_UserManual_RevD.pdf',
  mainManualUrl: 'https://www.strymon.net/manuals/Deco_v2_UserManual_RevD.pdf',
  defaultChannel: 1,
  connection: 'Usa USB-C MIDI com o pedal alimentado, ou EXP/MIDI de 6,35 mm com Strymon MIDI EXP/MIDI OUT compatível. Para TRS, configura EXP/MIDI para MIDI (LED azul) e escolhe o canal no menu de arranque. Um cabo de expressão ou adaptador TRS genérico não garante a ligação MIDI correta.',
  appearance: appearance('#e5e0d8', '#2d3338', '#ab733d'),
  presets: { count: 299, offset: 0, bankSize: 128 },
  presetMessages: rawBankPreset(299, true),
  controls: [
    select(0, 'Banco MIDI bruto', 'Presets', choices(['0 · endereços 0–127', '1 · endereços 128–255', '2 · endereços 256–299']), 0, 'CC0 recebe o número do banco diretamente. A navegação de presets envia banco e Program Change juntos.'),
    toggle(10, 'Tape Saturation', 'Saturação', 127, 0, 'Desliga com zero; qualquer valor não zero liga a saturação.', true),
    select(11, 'Voice', 'Saturação', choices(['Classic', 'Cassette'], 1), 1, 'Classic oferece resposta de fita de estúdio; Cassette acrescenta a compressão característica de cassete.', true),
    range(12, 'Saturation', 'Saturação', 127, 64, 'Aumenta a densidade e a compressão de fita.', true),
    range(13, 'Volume', 'Saturação', 127, 64, 'Equilibra o nível depois da saturação.', true),
    range(14, 'Tone', 'Saturação', 127, 64, 'Molda a presença da máquina de saturação.', true),
    range(15, 'Low Trim', 'Saturação', 127, 0, 'Função secundária: reduz graves para abrir espaço no arranjo.'),
    toggle(16, 'Doubletracker', 'Dupla fita', 127, 0, 'Liga a segunda máquina de fita; zero desliga.', true),
    select(17, 'Type', 'Dupla fita', choices(['Sum', 'Invert', 'Bounce'], 1), 1, 'Escolhe soma, inversão de fase ou repetições entre os canais.', true),
    range(18, 'Lag Time', 'Dupla fita', 127, 64, 'Percorre flanging, chorus e ecos alterando o desfasamento entre as fitas.', true),
    range(19, 'Wobble', 'Dupla fita', 127, 0, 'Introduz pequenas flutuações de velocidade.', true),
    range(20, 'Blend', 'Dupla fita', 127, 64, 'Mistura as duas máquinas para encontrar o relevo desejado.', true),
    range(21, 'Doubletracker Boost/Cut', 'Dupla fita', 127, 64, 'Ajuste secundário do nível da segunda máquina.'),
    range(22, 'Auto-Flange Time', 'Dupla fita', 127, 64, 'Define a duração da passagem automática de flange.'),
    toggle(23, 'Wide Stereo', 'Dupla fita', 127, 0, 'Abre a imagem estéreo; usa duas saídas para ouvir o espaço criado.'),
    select(25, 'Clock · multiplicação', 'Sincronização', choices(['×2/3', '×1', '×2', '×3', '×4', '×6', '×8']), 1),
    toggle(33, 'A + B · ligar', 'Performance', 127, 0, 'Liga ou desliga simultaneamente as duas secções.'),
    toggle(60, 'Expressão MIDI ativa', 'Expressão'),
    toggle(63, 'Seguir MIDI Clock', 'Sincronização'),
    action(93, 'Tap remoto', 'Performance', 127, 'Envia dois toques espaçados para definir o tempo.'),
    toggle(97, 'Auto-Flange · manter', 'Performance', 127, 0, 'Envia 127 para ativar e zero para libertar o flange automático.', true),
    range(100, 'Expressão', 'Expressão', 127, 0, 'Zero corresponde ao calcanhar; 127 à ponta. Configura os destinos e ativa CC60.'),
    { ...action(0, 'Modo manual · knobs', 'Presets', 0, 'Seleciona banco 0 e PC127: regressa aos knobs e switches físicos, sem guardar dados.'),
      id: 'manual-mode', invalidatesState: true, messages: (channel) => [[0xb0 + channel - 1, 0, 0], [0xc0 + channel - 1, 127]] },
  ],
  limitations: ['Há 300 endereços, mas banco 0/PC127 é manual e não armazena dados: os 299 slots da interface saltam esse endereço. Guardar presets exige a sequência física de footswitches descrita no manual; não existe CC de guardar neste mapa.'],
};

const mobiusParameters = [
  [24, 'Flanger · Mode', 5, 'Silver / Grey / Black + / Black − / Zero + / Zero −'],
  [25, 'Flanger · Regen', 17], [26, 'Flanger · Manual', 17],
  [28, 'Chorus · Mode', 4, 'dBucket / Multi / Vibrato / Detune / Digital'],
  [29, 'Chorus · Mix', 17], [30, 'Chorus · Tone', 20],
  [31, 'Vintage Trem · Mode', 2, 'Tube / Harmonic / Photoresistor'], [32, 'Vintage Trem · Pan', 1],
  [34, 'Rotary · Horn Level', 17], [35, 'Rotary · Preamp Drive', 17],
  [36, 'Rotary · Slow Rotor Speed', 17], [37, 'Rotary · Acceleration', 17],
  [40, 'Vibe · Waveshape', 17], [41, 'Vibe · Low End', 20],
  [42, 'Vibe · Headroom', 17], [43, 'Vibe · Mode', 1, 'Vibrato / Chorus'],
  [44, 'Phaser · Mode', 6, '2 / 4 / 6 / 8 / 12 / 16 estágios; Barber Pole'],
  [45, 'Phaser · Regen', 17], [46, 'Phaser · Waveshape', 3],
  [47, 'Phaser · Stereo Spread', 4], [48, 'Filter · Mode', 2, 'Low Pass / Wah / High Pass'],
  [49, 'Filter · Waveshape', 7, 'Sine / Triangle / Square / Ramp / Saw / Random / Envelope + / Envelope −'],
  [50, 'Filter · Resonance', 18], [51, 'Filter · Dry Level', 18],
  [52, 'Filter · Frequency Middle', 20], [53, 'Quadrature · Mode', 3, 'AM / FM / Frequency Shifter + / Frequency Shifter −'],
  [54, 'Quadrature · Shift', 17], [55, 'Quadrature · Mix', 20],
  [56, 'Quadrature · LFO', 6], [57, 'Autoswell · Rise Time', 22],
  [58, 'Autoswell · Shape', 3, 'Exponential / Quadratic / Ramp / Logarithmic'],
  [59, 'Destroyer · Bit Depth', 20], [61, 'Destroyer · Sample Rate', 20],
  [62, 'Destroyer · Filter', 8, 'Off; amplificador antigo, gramofone, rádio, dois megafones, telefone antigo, telemóvel, intercomunicador'],
  [63, 'Destroyer · Vinyl', 18], [64, 'Destroyer · Mix', 20],
  [65, 'Formant · Vowel 1', 5, 'AA / EE / EYE / OH / OOH / Random'],
  [66, 'Formant · Vowel 2', 5, 'AA / EE / EYE / OH / OOH / Random'],
  [67, 'Formant · LFO', 6, 'Sine / Square / Ramp / Saw / Random / Envelope / Expression'],
  [68, 'Phaser · Headroom', 17], [69, 'Filter · Stereo Spread', 4],
  ...Array.from({ length: 8 }, (_, index) => [105 + index, `Pattern Trem · Beat ${index + 1}`, index ? 18 : 17,
    'Um a dezasseis pulsos, som contínuo ou silêncio; beats 2–8 acrescentam fim de sequência. Os valores são os índices do mapa MIDI.']),
  [113, 'Pattern Trem · Waveshape', 6, 'Sine / Triangle / Square / Rectangle / Pulse / Ramp / Saw'],
  [114, 'Pattern Trem · Pan', 1], [115, 'Formant · Stereo Spread', 4],
];
const mobiusOptions = {
  24: choices(['Silver', 'Grey', 'Black +', 'Black −', 'Zero +', 'Zero −']),
  28: choices(['dBucket', 'Multi', 'Vibrato', 'Detune', 'Digital']),
  31: choices(['Tube', 'Harmonic', 'Photoresistor']),
  44: choices(['2 estágios', '4 estágios', '6 estágios', '8 estágios', '12 estágios', '16 estágios', 'Barber Pole']),
  48: choices(['Low Pass', 'Wah', 'High Pass']),
  59: choices(['4 bit','4,5 bit','5 bit','5,5 bit','6 bit','6,5 bit','7 bit','7,5 bit','8 bit','9 bit','10 bit','11 bit','12 bit','13 bit','14 bit','15 bit','16 bit','18 bit','20 bit','24 bit','32 bit']),
  61: choices(['750 Hz','1 kHz','1,5 kHz','2 kHz','3 kHz','4 kHz','5 kHz','6 kHz','7 kHz','8 kHz','9 kHz','10 kHz','11 kHz','12 kHz','14 kHz','16 kHz','19 kHz','24 kHz','32 kHz','48 kHz','96 kHz']),
  65: choices(['AA', 'EE', 'EYE', 'OH', 'OOH', 'Random']),
  66: choices(['AA', 'EE', 'EYE', 'OH', 'OOH', 'Random']),
};
const mobius = {
  id: 'strymon-mobius', name: 'Mobius', brand: 'Strymon', category: 'pedals', visualization: 'modulation',
  subtitle: 'Doze máquinas de modulação, um movimento contínuo.',
  manualUrl: 'https://www.strymon.net/manuals/Mobius_UserManual_REVF.pdf',
  mainManualUrl: 'https://www.strymon.net/manuals/Mobius_UserManual_REVF.pdf',
  defaultChannel: 1,
  connection: 'Liga a saída DIN de uma interface MIDI ao MIDI IN de 5 pinos. Mobius não tem USB MIDI. Seleciona MIDICH no menu global; para sincronizar, ativa MIDI Clock por preset. Pre/Post exige cablagem de áudio e o switch traseiro apropriados.',
  appearance: appearance('#3b7399', '#f4f3ed', '#eda346'),
  presets: { count: 200, offset: 0, bankSize: 128 },
  presetMessages: rawBankPreset(200),
  transport: { start: true },
  controls: [
    select(0, 'Banco MIDI', 'Presets', choices(['0 · 00A–63B', '1 · 64A–99B'])),
    range(9, 'Param 1', 'Knobs', 127, 64, 'Controla o destino atribuído a Param 1 no preset atual.', true),
    range(15, 'Level', 'Knobs', 127, 64, 'Equilibra o volume de saída do efeito.', true),
    range(16, 'Param 2', 'Knobs', 127, 64, 'Controla o destino atribuído a Param 2 no preset atual.', true),
    range(17, 'Speed', 'Knobs', 127, 64, 'Altera a velocidade da máquina selecionada.', true),
    range(18, 'Depth', 'Knobs', 127, 64, 'Define a amplitude do movimento.', true),
    select(19, 'Máquina', 'Knobs', choices(['Chorus', 'Flanger', 'Rotary', 'Vibe', 'Phaser', 'Filter', 'Formant', 'Vintage Trem', 'Pattern Trem', 'Autoswell', 'Destroyer', 'Quadrature']), 0, 'Seleciona uma das doze máquinas; os parâmetros específicos pertencem à respetiva secção.', true),
    select(21, 'Tap Division', 'Sincronização', choices(['Semibreve', 'Mínima', 'Semínima', 'Colcheia pontuada', 'Colcheia', 'Tercina', 'Semicolcheia']), 2),
    select(22, 'Pre/Post', 'Encaminhamento', choices(['Pre', 'Post'])),
    select(39, 'Tap · Tap/Speed / Rotary Tap Select', 'Performance', choices(['Tap', 'Speed']), 0, 'CC39 é partilhado com Rotary Tap Select; no Rotary escolhe a função do TAP, não um parâmetro independente.'),
    toggle(60, 'Expressão ativa', 'Expressão', 1),
    toggle(70, 'Seguir MIDI Clock', 'Sincronização', 1),
    ...mobiusParameters.map(([cc, name, max, help]) => {
      const section = name.split(' · ')[0];
      const hint = `${help ? `Opções: ${help}. ` : ''}Ajuste específico desta máquina; o intervalo é o índice MIDI documentado, não uma percentagem.`;
      return mobiusOptions[cc] ? select(cc, name, section, mobiusOptions[cc], 0, hint) : range(cc, name, section, max, 0, hint);
    }),
    toggle(80, 'A · manter pressionado', 'Footswitches', 0, 127, 'Zero pressiona; 127 liberta. Não deixes o switch pressionado após uma atuação.', true),
    toggle(82, 'B · manter pressionado', 'Footswitches', 0, 127, 'Zero pressiona; 127 liberta. Pode atuar sobre bancos/presets conforme a utilização do hardware.', true),
    toggle(81, 'TAP · manter', 'Footswitches', 127, 0, '127 ativa o TAP físico; zero liberta.', true),
    action(93, 'Tap remoto', 'Performance'),
    range(100, 'Expressão', 'Expressão', 127, 0, 'Percorre os destinos configurados em EP SET.'),
    toggle(102, 'Efeito ativo', 'Performance'),
    action(125, 'Reiniciar fase', 'Performance', 127, 'Recomeça o ciclo da modulação para alinhar os ataques.'),
  ],
  limitations: [
    'Os intervalos CC são os da revisão F. Phaser Waveshape tem cinco nomes na descrição, mas apenas 0–3 na tabela; Vintage Trem Pan descreve três posições, mas apenas 0–1. Mantêm-se limites oficiais sem inventar índices adicionais.',
    'Start MIDI reinicia a fase; o manual não documenta receção de Stop/Continue. Nomes, atribuição de knobs, definições globais e guardar presets exigem o hardware.',
  ],
};

const db = (value) => `${value - 18} dB`;
const eq2 = {
  id: 'source-audio-eq2', name: 'EQ2', brand: 'Source Audio', category: 'pedals', visualization: 'eq',
  subtitle: 'Vinte bandas para esculpir dois caminhos de áudio.',
  manualUrl: `${sourceAudio}eq2_midi_mapping.pdf?v=1752577217`,
  mainManualUrl: `${sourceAudio}eq2_user_manual_compressed.pdf?v=1752634717`,
  defaultChannel: 1,
  connection: 'Usa USB MIDI class-compliant com alimentação de 9 V, ou MIDI IN DIN de 5 pinos. Escolhe o canal no menu do EQ2 ou no Neuro. Este painel usa somente o mapa MIDI de fábrica; confirma em Neuro > Device > Edit Device MIDI Map que não foi personalizado. Channel 2 acompanha Channel 1 até ativares Split Mode no hardware/Neuro.',
  appearance: appearance('#bc2f36', '#fff6e6', '#70d5cf', 'compact'),
  presets: { count: 128, offset: 0 },
  controls: [
    range(0, 'Master Volume', 'Níveis', 127, 64, 'Zero silencia; 64 é ganho unitário; 127 dá +12 dB.'),
    range(1, 'Input 1 Trim', 'Níveis', 127, 64, 'Zero silencia; 64 é unitário; 127 dá +6 dB.'),
    range(2, 'Input 2 Trim', 'Níveis', 127, 64, 'Zero silencia; 64 é unitário; 127 dá +6 dB.'),
    ...Array.from({ length: 20 }, (_, index) => {
      const channel = Math.floor(index / 10) + 1;
      const band = index % 10 + 1;
      return { ...range(3 + index, `Banda ${band} · ganho`, `Canal ${channel}`, 36, 18, 'Passos de 1 dB, de −18 a +18 dB; 18 deixa a banda plana. Usa o seletor de banda e o encoder partilhado.', true),
        eqBand: { channel, band }, label: db };
    }),
    ...Array.from({ length: 20 }, (_, index) => range(23 + index, `Banda ${index % 10 + 1} · frequência`,
      `Canal ${Math.floor(index / 10) + 1}`, 127, 64, 'Distribuição logarítmica de 20 Hz a 20 kHz; move a região que esta banda esculpe.')),
    ...Array.from({ length: 20 }, (_, index) => ({
      ...range(43 + index, `Banda ${index % 10 + 1} · Q`, `Canal ${Math.floor(index / 10) + 1}`, 95, 5,
        'Q de 0,5 a 10,0; valor 5 dá Q 1,0. Um Q alto estreita a intervenção.'),
      label: (value) => ({ 0: 'Q 0.5', 5: 'Q 1.0', 95: 'Q 10.0' }[value] || `Q · MIDI ${value}`),
    })),
    { ...range(69, 'Canal 1 · ganho', 'Níveis', 36, 18), label: db },
    { ...range(70, 'Canal 2 · ganho', 'Níveis', 36, 18), label: db },
    range(71, 'Canal 1 · passa-altas', 'Entrada', 28, 0, 'Mapa publicado: 0 = 10 Hz e 28 = 80 Hz. A tabela contém um passo inconsistente; firmware 1.16 amplia a faixa no Neuro, sem mapa CC atualizado.'),
    range(72, 'Canal 2 · passa-altas', 'Entrada', 28, 0, 'Usa os limites publicados, 10–80 Hz. Não se deduz uma escala MIDI para a faixa ampliada em firmware recente.'),
    select(73, 'Routing', 'Encaminhamento', choices(['Auto Detect', 'Mono → Stereo', 'Stereo → Stereo', 'Stereo → Mono', 'Cascade']), 0, 'Cascade permite encadear as duas curvas; confirma as ligações e ativa Split se precisares de curvas independentes.'),
    action(80, 'Preset anterior', 'Presets'), action(82, 'Preset seguinte', 'Presets'),
    action(83, 'Ativar afinador', 'Performance', 127, 'Qualquer valor ativa; a próxima mensagem CC, de qualquer número, desativa o afinador.'),
    action(94, 'Remote Switch', 'Performance', 127, 'Executa a função de switch configurada; este CC atua somente com Switch Action em Latching.'),
    range(100, 'Expressão remota', 'Expressão', 127, 0, 'Requer External Control Source em MIDI e destinos de expressão configurados.'),
    toggle(101, 'Efeito ativo', 'Performance', 127, 0, '0–63 desliga; 64–127 liga.', true),
    { ...action(102, 'Alternar bypass', 'Performance', 127, 'Alterna em cada mensagem, independentemente do valor. Inverte somente o estado local de CC101; sem readback, estados desconhecidos continuam desconhecidos.'), apply: toggleBypass },
    range(103, 'Recall · bypass', 'Presets', 127, 0, 'O valor é o endereço zero-based do preset, carregado em bypass.'),
    range(104, 'Recall · ativo', 'Presets', 127, 0, 'O valor é o endereço zero-based do preset, carregado ativo.'),
  ],
  limitations: [
    'Filtro Peak/Shelf nas bandas extremas, Parallel/Series, fase, Split, limiter, gate, atribuição e ação de switch, e Enable External Control são atribuíveis no Neuro, mas não têm CC de fábrica: não se fabricam endereços para estes parâmetros.',
    'Encoder, SELECT e menus físicos dão acesso às bandas e configurações; não existe CC documentado de guardar presets ou ler o estado. Afinador não fornece notas MIDI.',
  ],
};

const nemesisKnobs = [
  [2, 'Time', 'Tempo', 'Tempo não linear, relativo ao máximo da máquina.', true],
  [3, 'Maximum Delay Time', 'Tempo', 'Máximo permitido: cerca de 10 ms a 2,6 s; 63 aproxima 1,3 s.'],
  [5, 'Feedback', 'Knobs', 'Controla repetições; o teto depende de Feedback Maximum.', true],
  [6, 'Mix', 'Knobs', '0 só seco, 63 mistura igual, 127 só efeito; respeita a opção global de Mix.', true],
  [7, 'Mod', 'Knobs', 'Profundidade da modulação; não é o parâmetro separado de wow/flutter.', true],
  [8, 'Rate', 'Knobs', 'Nas máquinas de fita controla velocidade; nas restantes vai de 0,1 a 10 Hz.', true],
  [9, 'Intensity', 'Knobs', 'Destino múltiplo dependente da máquina e de Intensity Knob Remap.', true],
  [10, 'Output Level', 'Níveis', '0 silencia; 52 é 0 dB; 127 é +8 dB.'],
  [11, 'Diffusion', 'Textura', 'Espalha os ataques; ligar/desligar pode silenciar brevemente a linha de delay.'],
  [12, 'Distortion', 'Textura'], [13, 'High Pass Filter', 'Filtros'], [14, 'Low Pass Filter', 'Filtros'],
  [15, 'Sample Rate Reduction', 'Textura'], [16, 'Sweep Filter Frequency', 'Filtros'],
  [17, 'Sweep Filter Q', 'Filtros'], [18, 'Sweep Filter Depth', 'Filtros'],
  [19, 'Sweep Filter Mix', 'Filtros', 'Mistura do filtro de varrimento, aplicada somente ao Tap 1.'],
  [20, 'Wow and Flutter Depth', 'Fita'], [21, 'Wow and Flutter Rate', 'Fita'],
  [22, 'Wow Modulation Noise', 'Fita', 'Acima de 50 a fita degradada entra em ruído e distorção.'],
  [23, 'Tremolo Depth', 'Modulação', '63 dá tremolo sinusoidal máximo; 127 retifica o ciclo e duplica a velocidade.'],
  [25, 'Tap 1 Level', 'Taps', '0 silencia, 63 = 0 dB, 127 = +6 dB.'],
  [26, 'Tap 1 Pan', 'Taps', '0 esquerda, 63 centro, 127 direita.'],
  [27, 'Tap 2 Level', 'Taps', '0 silencia, 63 = 0 dB, 127 = +6 dB.'],
  [28, 'Tap 2 Pan', 'Taps', '0 esquerda, 63 centro, 127 direita.'],
  [29, 'Tap 2 Delay Time', 'Taps', 'Fração do Tap 1: 63–64 = metade; 95–96 = três quartos; 127 = igual.'],
  [30, 'Input Low Pass Filter', 'Filtros', 'Filtra o sinal seco e o processado.'],
  [51, 'Delay Send', 'Taps', 'Zero corta a entrada do delay sem cortar necessariamente a cauda; 127 envia tudo.'],
];
const nemesisEngineNames = ['Digital', 'Diffuse', 'Analog', 'Tape', 'Noise Tape', 'Degrade', 'Shifter', 'Helix', 'Reverse', 'Sweeper', 'Rhythmic', 'Slapback', 'Resonant Analog', 'Tremolo', 'Sequenced Filters', 'Dub', 'Chorus', 'Flanger', 'Double Helix', 'Complex Rhythmic', 'Lo-Fi Retro', 'Warped Record', 'Compound Shifter', 'Oil Can'];
const ambiguousAdtEngines = new Set([5, 9, 10, 12, 23]);
const nemesis = {
  id: 'source-audio-nemesis-adt', name: 'Nemesis', edition: 'ADT', brand: 'Source Audio', category: 'pedals', visualization: 'delay',
  subtitle: 'Ecos complexos com o caminho seco preservado em analógico.',
  manualUrl: `${sourceAudio}nemesis_midi_implementation.pdf?v=1752577217`,
  mainManualUrl: `${sourceAudio}nemesis_adt_user_manual_compressed.pdf?v=1752634720`,
  defaultChannel: 1,
  connection: 'Liga USB MIDI class-compliant ou MIDI IN DIN de 5 pinos e mantém alimentação de 9 V. O canal de receção é global e configura-se no Neuro. Confirma o mapa de fábrica: o mapeamento personalizado de um knob pode substituir o CC original. Este é o Nemesis ADT atual, não o Nemesis original.',
  appearance: appearance('#323330', '#f1ecd9', '#e1bc5f'),
  presets: { count: 128, offset: 0 },
  controls: [
    select(1, 'Máquina · índices sem conflito', 'Máquinas', choices(nemesisEngineNames).filter(({ value }) => !ambiguousAdtEngines.has(value)), 0,
      'Somente índices coincidentes entre o manual ADT e a tabela MIDI oficial ligada pelo fabricante. Os índices em conflito foram omitidos, não adivinhados.', true),
    ...nemesisKnobs.map(([cc, name, section, hint, physical]) => range(cc, name, section, 127, 64, hint, !!physical)),
    select(24, 'Pitch Shift', 'Afinação', Array.from({ length: 126 }, (_, value) => ({
      value, label: `${value >= 63 ? 'Reverse · ' : ''}${value < 63 ? 31 - value : value - 94} semitons`,
    })), 31, 'Mapa completo: +31 a −31 semitons, seguido de −31 a +31 em reverse. 126 e 127 são reservados.'),
    select(31, 'Feedback Maximum', 'Knobs', choices(['1,00× · sem auto-oscilação', '1,25×', '1,50×', '2,00×']), 0, 'Valores acima de 1× podem entrar em auto-oscilação: começa com Feedback baixo.'),
    toggle(32, 'LFO sincronizado ao delay', 'Modulação', 1),
    toggle(33, 'Inverter fase wet · esquerda', 'Encaminhamento', 1),
    toggle(34, 'Inverter fase wet · direita', 'Encaminhamento', 1),
    select(35, 'I/O Routing', 'Encaminhamento', choices(['Auto Detect', 'Mono → Mono/Stereo · hardware bypass', 'Mono → Wet 1 / Dry 2', 'Mono → Stereo · soft bypass', 'Stereo → Stereo', 'Feedback Loop Insert', 'External Loop Pre-Delay']), 0, 'A tabela declara 0–15, mas só explica 0–6: os restantes valores não são oferecidos.'),
    select(36, 'Multi-Feedback', 'Taps', choices(['Padrão da máquina', 'Só Tap 1 · 1,0', 'Só Tap 2 · 1,0', 'Tap 1 + 2 · 0,5 cada'])),
    toggle(37, 'Somar estéreo para mono', 'Encaminhamento', 1),
    select(39, 'Intensity Knob Remap', 'Atribuições', choices(['Padrão de fábrica', 'Output Volume', 'Diffusion', 'Distortion', 'Low Cut Filter', 'High Cut Filter', 'Sample Rate Reduction', 'Sweep Filter Frequency', 'Sweep Filter Q', 'Sweep Filter Depth', 'Sweep Filter Mix', 'Wow and Flutter Noise', 'Tremolo Depth', 'Pitch Control', 'Delay Effect Send Level'])),
    select(40, 'Mod Knob Remap', 'Atribuições', choices(['Time Modulation', 'Tape Modulation', 'Filter Modulation', 'Tremolo Depth'])),
    select(41, 'Rate Knob Remap', 'Atribuições', choices(['Modulation Rate', 'Tape Speed'])),
    select(42, 'Tempo Division', 'Sincronização', choices(['4 · semibreve', '3 · mínima pontuada', '2 · mínima', '1,618 · proporção áurea', '3/2 · semínima pontuada', '4/3 · swing', '1 · semínima', '3/4 · colcheia pontuada', '2/3 · swing', '0,618 · inversa áurea', '1/2 · colcheia', '1/3 · tercina', '1/4 · semicolcheia', '1/6 · sextina', '1/8 · fusa']), 6, 'Escala o delay face a Tap Tempo ou MIDI Clock.', true),
    range(50, 'Octave Shift · valor bruto', 'Afinação', 125, 63, 'A tabela declara 0–125, mas menciona +oitava em 127. Mantém-se a faixa declarada; uníssono está em 63.'),
    action(80, 'Preset anterior', 'Presets', 127, 'Percorre os 4 ou 8 presets acessíveis no hardware; ADT vem com extensão de 8 ativa.'),
    action(82, 'Preset seguinte', 'Presets'), action(93, 'Tap remoto', 'Performance', 127, 'Cada mensagem é um toque de tempo.', true),
    toggle(97, 'Infinite Hold', 'Performance', 127, 0, '64–127 mantém o áudio; 0–63 liberta, como manter o TAP físico.', true),
    toggle(101, 'Efeito ativo', 'Performance', 127, 0, '0–63 faz bypass; 64–127 liga.', true),
    { ...action(102, 'Alternar bypass', 'Performance', 127, 'Qualquer valor alterna bypass uma vez. Inverte o estado local de CC101; não confirma um estado previamente desconhecido.'), apply: toggleBypass },
    range(103, 'Recall · bypass', 'Presets', 127, 0), range(104, 'Recall · ativo', 'Presets', 127, 0),
  ],
  limitations: [
    'O manual ADT atual descreve 26 máquinas, mas o PDF MIDI oficial ainda lista 24 do Nemesis original. Divergem os índices 5, 9, 10, 12 e 23; 24 e 25 não constam da tabela CC1. Não se presume que a numeração de capítulos seja o novo mapa CC.',
    'Resonant Analog, Oil Can, Drum Echo, Degrade, Sweeper e Rhythmic existem no ADT, mas a seleção remota destes índices requer confirmação atualizada do fabricante. O seletor físico/Neuro continua disponível.',
    'CC4 é reservado e não é enviado. CC35 não atribui nomes a 7–15; CC50 tem limites contraditórios no PDF. Não se enviam valores não confirmados.',
    'CC38 é um alias de bypass de CC101 e foi omitido para evitar dois estados locais divergentes. CC102 alterna o mesmo bypass: o hook inverte CC101 localmente, mas não confirma o hardware nem limpa marcações de estado desconhecido.',
    'MIDI Clock é recebido, mas Start/Stop/Continue não são documentados. Não existe comando CC de guardar, readback ou SysEx implementado aqui.',
  ],
};

const reverbModes = [
  ['Concert Hall', 'Modern Hall'], ['Classic Plate', 'Studio Plate'],
  ['Bright Spring', 'Dark Spring', 'Overdriven Spring', 'Drip Spring', 'Spring + Trem'],
  ['L.A. Studio'], ['Sparkle', 'Glummer'],
  ['Modulated', 'Chorused Reverb', 'Flanged Reverb', 'Tremolo Reverb'],
  ['Triggered Swell', 'Gate Swell with Octave', 'Freezification', 'Seed'],
  ['Single Tap Delay', 'Blend-able Delay', 'Filtered Feedback Delay', 'Skitter'],
  ['Reverse with Decay', 'Reverse and Stop', 'Reversed Delay'], ['Resonant', 'Casper'],
  ['50’s Radio', 'Warble'], ['Glitch', 'Gated Reverb', 'Destroyer Pad'],
];
const empress = {
  id: 'empress-reverb', name: 'Reverb', brand: 'Empress', category: 'pedals', visualization: 'reverb',
  subtitle: 'Espaços delicados, caudas estranhas e paisagens profundas.',
  manualUrl: 'https://empresseffects.com/cdn/shop/files/RVRB_user_manual_v6.41_rev01_web.pdf?v=11708901370976542366',
  mainManualUrl: 'https://empresseffects.com/cdn/shop/files/RVRB_user_manual_v6.41_rev01_web.pdf?v=11708901370976542366',
  defaultChannel: 1,
  connection: 'Configura Control Port para MIDI e o canal em Advanced Configuration antes de enviar mensagens. A entrada de 6,35 mm recebe MIDI na ponta (tip) e transmite no anel (ring). Usa um adaptador MIDI/TRS compatível ou Empress MIDIBox2; não ligues DIN diretamente por um cabo de áudio. O pedal não aceita controlo MIDI enquanto está em Advanced Configuration.',
  appearance: appearance('#ecebea', '#343433', '#429ed3'),
  presets: { count: 35, offset: 1 },
  controls: [
    range(10, 'Expressão', 'Expressão', 127, 0, 'Zero calcanhar, 127 ponta; configura os destinos com Save e os knobs no hardware.'),
    range(11, 'Recall Preset · endereço', 'Presets', 35, 1, 'Valor é o número de preset. Endereço 0 é manual no sistema scrolling; no sistema bank, manual não está disponível.'),
    select(20, 'Modo + submodo', 'Reverb', reverbModes.flatMap((names, mode) => names.map((label, submode) => ({ value: mode * 8 + submode, label }))), 0,
      'O valor combina modo × 8 + submodo, ambos começando em zero. Thing 1 e Thing 2 mudam de função com o algoritmo.', true),
    ...['Decay Time', 'Mix', 'Volume', 'Low Damp', 'Hi Damp', 'Thing 1', 'Thing 2'].map((name, index) =>
      range(21 + index, name, 'Knobs', 127, 64, index >= 5 ? 'Função dependente do modo: pode controlar pre-delay, modulação, feedback, oitavas, swell ou textura.' : 'Zero corresponde ao knob no mínimo; 127 ao máximo.', true)),
    ...[[35, 'Select'], [36, 'Scroll'], [37, 'Bypass'], [38, 'Save']].map(([cc, name]) => ({
      ...select(cc, `${name} · switch físico`, 'Footswitches', [
        { value: 0, label: 'Libertar' }, { value: 64, label: 'Toque rápido' }, { value: 127, label: 'Manter pressionado' },
      ], 0, '64 simula um toque; 127 mantém o switch até receber zero. Save e combinações de switches podem gravar presets.', true),
      ...(cc === 38 ? { confirmation: 'O botão Save pode gravar alterações com outros switches. Continuar?' } : {}),
    })),
    { ...select(39, 'Guardar no endereço', 'Presets', Array.from({ length: 36 }, (_, value) => ({ value, label: `Endereço ${value}` })), 1,
      'Comando real de gravação, não recall: 0–35 escolhe o destino. Banco e scrolling apresentam estes endereços de forma diferente.'),
      confirmation: 'Guardar as definições atuais neste endereço do Empress? O conteúdo anterior será substituído.' },
    { ...toggle(51, 'Seguir MIDI Clock', 'Sincronização', 127, 0, 'Ativo por defeito no hardware. Máquinas com tap recebem semínimas, 24 clocks por batida.'), initial: 127 },
    toggle(60, 'Efeito ativo', 'Performance', 127, 0, 'Zero bypass; 127 liga.'),
  ],
  limitations: [
    '35 presets guardados; PC1–35 recupera-os. CC39 também declara endereço 0, mas não se conta o modo manual como memória gravável adicional.',
    'Mapa de modos da revisão 6.41: apenas submodos existentes são oferecidos. O looper é controlado pelos switches físicos; não se inventam CCs de transporte do looper.',
    'Save está documentado e protegido por confirmação; não há readback implementado. Start/Stop/Continue MIDI não são documentados.',
  ],
};

for (const [pedal, numbers] of [
  [mobius, [80, 82]],
  [eq2, [80, 82, 94, 103, 104]],
  [nemesis, [1, 80, 82, 103, 104]],
  [empress, [11, 35]],
]) {
  for (const control of pedal.controls) {
    if (numbers.includes(control.number)) control.invalidatesState = true;
  }
}

export const additionalPedals = [sl2, deco, mobius, eq2, nemesis, empress];
