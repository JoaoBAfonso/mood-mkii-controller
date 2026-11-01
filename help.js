const moodModes = {
  '21:0': 'Um conjunto denso de ecos pode ficar nítido ou dissolver-se numa cauda difusa. TIME altera tamanho e decaimento em conjunto; MODIFY vai de multi-tap a reverb. Experimenta modular MODIFY para alternar entre os dois.',
  '21:2': 'Delay limpo que também funciona como looper. TIME muda o intervalo sem dobrar a altura dos ecos existentes; MODIFY regula feedback. No máximo, as repetições mantêm-se e acumulam-se. Encaminha o micro-loop para o Wet para o copiar para o delay.',
  '21:3': 'Amostra continuamente o que tocas e reproduz janelas com outra velocidade e direção. TIME curto aproxima-se de um pitch shifter; TIME longo cria frases harmonizadas que chegam depois. MODIFY percorre intervalos em semitons.',
  '23:0': 'Divide o loop em fragmentos e repete o fragmento atual enquanto deteta som na entrada. LENGTH escolhe o tamanho da fatia; MODIFY regula a sensibilidade. Toques suaves com sensibilidade alta criam pausas e alongamentos comandados pela dinâmica.',
  '23:2': 'Reproduz o micro-loop como uma fita. LENGTH encurta o loop; MODIFY permite velocidades em passos de oitavas, para a frente ou em reverso, de metade até quatro vezes. Muda CLOCK durante overdubs para construir camadas que soam a velocidades diferentes.',
  '23:3': 'Espalha o micro-loop no tempo, de frases reconhecíveis a texturas sustentadas. LENGTH define os fragmentos e MODIFY controla a transformação e direção. Experimenta movimentos lentos para encontrar transições contínuas.',
};
const badModes = {
  '21:0': 'Reverb espectral que analisa e ressintetiza o instrumento, criando uma ambiência sintética. TIME regula o decaimento; MODIFY acentua o caráter artificial. CLOCK mais baixo escurece a textura; mais alto traz artefactos brilhantes. Freeze transforma a cauda num pad.',
  '21:2': 'Em vez de ecos progressivamente mais fracos, escolhes repetições com o mesmo volume. TIME define o intervalo e MODIFY o número de repetições; no máximo acumulam-se como num looper. Freeze preserva a frase para tocares por cima.',
  '21:3': 'Camadas de quartas, quintas e oitavas, ascendentes e descendentes. TIME separa as notas no tempo; MODIFY escolhe a harmonia e combinações mais densas. Um pouco de TIME cria o atraso característico de harmonizadores antigos; Freeze mantém o acorde em repetição.',
  '23:0': 'Transforma os sons distintos do micro-loop numa sequência de até oito passos. LENGTH muda o tamanho/velocidade dos passos e MODIFY o limiar que baralha o padrão quando tocas. Para padrões mais previsíveis, captura notas curtas ou grava primeiro noutro modo.',
  '23:2': 'Cinco estações reinterpretam a mesma gravação. MODIFY percorre e mistura as estações com interferência; LENGTH muda um parâmetro específico de cada uma. Usa o seletor de estações para ouvir cada interpretação isoladamente.',
  '23:3': 'Os trechos mais fortes do loop recebem uma transformação que entra e sai conforme o volume. LENGTH escolhe o caráter da máscara; MODIFY ajusta o limiar. Aumentar MODIFY disfarça uma porção maior do loop.',
};
const stationHelp = [
  [0, 'Tape: LENGTH muda velocidade e direção da reprodução completa do loop.'],
  [32, 'Ambient: LENGTH abranda a reprodução mantendo a altura, criando texturas longas.'],
  [63, 'Orchestral: LENGTH escolhe o número de vozes que entram e saem do arranjo.'],
  [97, 'Shoegaze: LENGTH percorre camadas de momentos congelados do loop.'],
  [127, 'Dance: LENGTH muda a velocidade da rotação entre reprodução normal, metade e dobro da velocidade.'],
];
const lostEffects = {
  'Slow-verb': 'Reverb com entrada gradual para camadas shoegaze. TIME regula swell e dimensão; MODIFY o decaimento; ALT a difusão. Hold congela a cauda num pad. ALT baixo aproxima a textura de ecos desfocados.',
  'Useful Ambience': 'Reverb para ampliar e suavizar o outro efeito. TIME controla dimensão, MODIFY decaimento e ALT difusão. Hold mantém a cauda indefinidamente. Usa-o no fim da cadeia para unir granular, synth ou modulação.',
  'Orchestral Swell': 'Swell harmonizado para acompanhar o instrumento. TIME define a entrada, MODIFY escolhe pitch e ALT feedback. Explora ataques lentos para separar o acompanhamento das notas tocadas.',
  'Pitch Repeater': 'Sequências de ecos harmonizados. TIME separa as notas, MODIFY escolhe intervalos e ALT o número de repetições. Começa com ALT no mínimo para ouvir os intervalos isoladamente.',
  'Pinging Phaser': 'Phaser de até 64 polos, de varrimentos suaves a notas ressonantes. TIME define velocidade, MODIFY polos e ALT ressonância. Hold pausa o movimento: mexe em MODIFY para explorar sons de filtro percussivos.',
  'Spectral Modulator': 'Uma réplica sintetizada do sinal atravessa modulação espectral. TIME define velocidade, MODIFY profundidade e ALT ressonância/clipping por bandas. Hold pausa o movimento para explorar a distorção digital. Valores baixos dão brilho a uma cauda de reverb.',
  'Tape Echo': 'Delay de fita com até quatro segundos e envelhecimento ajustável. TIME define intervalo, MODIFY repetições e ALT instabilidade. Hold captura o eco numa repetição infinita. EQ mais escuro produz ecos quentes; mais claro faz as repetições perder corpo.',
  'Grain Tumbler': 'Amostra e reorganiza o áudio em grãos. TIME escolhe tamanho/frequência dos grãos, MODIFY feedback e ALT ataques percussivos ou suaves. Hold preserva o padrão atual. Muda TIME depois de capturar para alterar o ritmo.',
  'Impulse Synthesizer': 'Síntese polifónica em sub-oitava para acordes e acompanhamentos lentos. TIME regula portamento, MODIFY textura e ALT abertura/fecho do filtro. Hold mantém um pad. Experimenta encaminhar para Useful Ambience.',
  'Sympathetic Resonator': 'Ressonador polifónico que acompanha a altura do instrumento. TIME regula a rapidez de seguimento, MODIFY feedback/sustain e ALT oitava. Hold fixa a altura atual para explorar ressonância sem seguir novas notas.',
  'Ensemble Expander': 'Chorus com várias vozes e movimento amplo. TIME controla velocidade, MODIFY profundidade e ALT o número de vozes. Hold troca movimento cíclico por variação aleatória suave. Poucas vozes aproximam-se de chorus clássico.',
  'Gen Lite': 'Fita degradada em versão compacta: modulação, ruído e pequenas falhas. TIME define velocidade, MODIFY profundidade/ruído e ALT crinkles e snags. Hold pára a fita à velocidade definida por TIME. GLUE acrescenta compressão.',
};
const genHelp = {
  14: 'WOW é a oscilação lenta e irregular da fita. Começa baixo para instabilidade subtil; aumenta para maquinaria a esforçar-se. DRY em Unity mistura o sinal limpo para criar chorus.',
  15: 'Volume do sinal processado. Ao centro tens unidade; no máximo, o dobro do nível. Ramp speed tem controlo independente na interface.',
  16: 'Escolhe perfis de equalização de gravadores reais: cassete, VHS e câmaras. Usa a biblioteca de modelos para saltar diretamente a um perfil e compara-os com a mesma frase.',
  17: 'FLUTTER é o tremor rápido da fita, na altura e no volume. Ajusta até quase deixar de o notar para uma textura vintage subtil. Com WOW, dá uma sensação de fita mais convincente.',
  18: 'SATURATE recria saturação magnética da fita. Interage com MODEL e Input gain: ajusta estes três controlos em conjunto para ir de compressão suave a distorção.',
  19: 'FAILURE introduz drops, snags, crinkles e pops. Os switches DROP BYP, SNAG BYP e HUM BYP isolam tipos de falha; ALT ajusta o nível dos ruídos.',
  21: 'STOP trava a fita, FILTER liberta o sinal do modelo de EQ e FAIL maximiza falhas. Aciona AUX para aplicar a função; AUX onset escolhe a velocidade da transição.',
  22: 'Quantidade de sinal limpo: None deixa só a fita; Small mantém um pouco de ataque; Unity mistura o limpo ao nível de entrada. Unity com WOW produz chorus.',
  23: 'Quantidade de hiss e ruído mecânico da máquina de fita. Ajusta cada fonte separadamente em ALT.',
  24: 'Tempo de chegada das funções AUX, de imediato a uma transição muito lenta. Útil para travagens de fita progressivas.',
  26: 'True bypass mantém passagem analógica; DSP bypass facilita transições sem cliques. Escolhe diretamente o tipo pretendido.',
  27: 'Nível de hiss introduzido pelo seletor NOISE.',
  28: 'Ruído mecânico: ao centro, silêncio; para um lado, ruído de VCR; para o outro, hum.',
  29: 'Volume dos crinkles e pops introduzidos por FAILURE.',
  32: 'Adapta a saturação ao sinal de entrada: Line, Instrument ou High gain. High gain facilita distorção e pode introduzir aliasing com sinais fortes.',
};
const classicHelp = {
  16: 'Filtro passa-baixo ressonante. Roda para baixo para remover agudos.',
  18: 'GEN altera a frequência de amostragem. Roda para baixo para degradar o som e introduzir aliasing digital.',
  19: 'Filtro passa-alto ressonante. Roda para cima para remover graves.',
};
const shared = {
  'Ramp speed': 'Velocidade do movimento automático dos parâmetros selecionados no banco de ramping.',
  'BOUNCE': 'Faz o movimento voltar ao ponto de partida, repetindo o percurso.',
  'SWEEP': 'Escolhe a região do percurso: Bottom ou Top.',
  'POLARITY': 'Escolhe se o movimento começa no sentido Forward ou Reverse.',
  'Expression over MIDI': 'Move os parâmetros atribuídos à expressão. Usa com os switches de atribuição do banco esquerdo.',
  'MIDI clock': 'Segue o tempo de uma DAW ou controlador externo, ou mantém o timing independente.',
  'MISO': 'Adapta uma entrada mono a processamento e saída estéreo.',
  'SPREAD': 'Abre a imagem estéreo; o destino pode ser escolhido no banco Hidden / ALT.',
  'TRAILS': 'Deixa as caudas dos efeitos desaparecerem naturalmente depois de desativares o canal.',
  'DRY KILL': 'Remove o sinal limpo. Útil em cadeias paralelas ou num envio auxiliar.',
  'Dry kill': 'Remove o sinal limpo. Útil em cadeias paralelas ou num envio auxiliar.',
  'LATCH': 'Mantém a função Hold ativa depois de largares o footswitch; volta a acionar para sair.',
  'L SWAP': 'Substitui as famílias do canal L pelas do canal R, para combinares quaisquer dois efeitos.',
  'R SWAP': 'Substitui as famílias do canal R pelas do canal L, para combinares quaisquer dois efeitos.',
  'BANK': 'Alterna os dois presets físicos entre slots 1/2 e 3/4.',
  'UNSYNC': 'Liberta TIME da sincronização para afinação contínua e efeitos não alinhados ao tempo.',
  'Attack': 'Tempo de entrada do som depois de uma nota.',
  'Decay': 'Tempo até o envelope atingir o nível de Sustain.',
  'Sustain': 'Nível mantido enquanto a nota está premida.',
  'Release': 'Tempo de desaparecimento depois de largares a nota.',
  'Portamento': 'Tempo de deslize entre alturas consecutivas.',
};
export function modeDetail(pedal, state, cc, value = state[cc]) {
  if (pedal.effects) {
    const family = pedal.effects({ ...state, [cc]: value }, cc);
    const modify = state[cc === 21 ? 17 : 19];
    return modify === 64 ? `${lostEffects[family[1]]} ${lostEffects[family[2]]}` : lostEffects[family[modify < 64 ? 1 : 2]];
  }
  if (pedal.id === 'mood-mkii') return moodModes[`${cc}:${value}`];
  if (pedal.id === 'bad-mood') return badModes[`${cc}:${value}`];
  if (pedal.id === 'generation-loss-mkii' && value === 3 && state[72] && state[76] && state[77]) {
    return 'FREEZE captura e sustém o som anterior para o processares com WOW, FLUTTER e filtros Classic. Aciona AUX para congelar e novamente para libertar. Esta combinação usa Classic, AUX em FAIL e DROP BYP/SNAG BYP ativos.';
  }
  return pedal.modes.find((mode) => mode.cc === cc && mode.value === value)?.description;
}
export function controlHelp(pedal, control, state) {
  const cc = control.cc;
  if (pedal.id === 'generation-loss-mkii' && (classicHelp[cc] || genHelp[cc])) {
    return state[72] && classicHelp[cc] ? classicHelp[cc] : genHelp[cc];
  }
  if (control.group === 'pedal' && [14, 16, 17, 19].includes(cc)) {
    if (pedal.id === 'bad-mood' && cc === 16 && state[23] === 2) {
      return stationHelp.find(([value]) => value === state[19])?.[1] || 'LENGTH muda o parâmetro da estação RADIO. Escolhe uma estação para explorar o seu comportamento; MODIFY percorre e mistura as cinco interpretações.';
    }
    return modeDetail(pedal, state, cc === 14 || cc === 17 ? 21 : 23);
  }
  if (control.group === 'pedal' && [21, 23].includes(cc)) return modeDetail(pedal, state, cc);
  if (control.group === 'pedal' && cc === 18) {
    return pedal.id === 'lost-found' ? 'Equilibra os canais L e R. Ao centro ouves os dois; nos extremos privilegias um deles. Em série, SPILL permite aplicar o segundo efeito também ao sinal limpo.'
      : 'CLOCK muda altura, velocidade e caráter dos dois canais em conjunto. Experimenta mover durante overdubs para construir harmonias em diferentes velocidades.';
  }
  if (cc === 15 && control.group === 'pedal') return 'Equilíbrio entre o sinal limpo e o processado. Aumenta para mergulhar na textura; reduz para manter o ataque do instrumento.';
  if (cc === 22 && control.group === 'pedal') return pedal.id === 'lost-found'
    ? 'L → R processa os efeitos em série; L + R em paralelo; R → L inverte a ordem. Experimenta alterar a ordem de synth, reverb e delay.'
    : 'Escolhe o que alimenta o Wet: instrumento, micro-loop + instrumento ou só micro-loop. Só loop deixa o instrumento limpo enquanto transformas a gravação.';
  if (control.group === 'dip-left' && cc >= 61 && cc <= 65) return `Inclui ${control.name} no movimento automático ou na expressão. Ajusta o ponto de partida no knob e a velocidade em Ramp speed.`;
  if (shared[control.name]) return shared[control.name];
  if (control.group === 'hidden' && cc === 32) return 'Escolhe em que canal aplicar a abertura estéreo: um só ou os dois. Um loop mono pode, por exemplo, alimentar uma ambiência estéreo.';
  if (control.group === 'hidden' && cc === 31) return 'Sincroniza a duração do micro-loop com o Wet, deixa os canais independentes ou relaciona o timing do Wet com o micro-loop. Experimenta mudar enquanto o loop toca.';
  if (pedal.id === 'mood-mkii' && control.group === 'hidden') {
    const hints = {
      24: 'Largura estéreo do Wet. Ajusta para encaixar a ambiência no campo estéreo.',
      25: 'Forma do movimento de ramping: triangular, quadrada, seno, patamares aleatórios ou aleatório suave. Define o caráter da variação dos parâmetros atribuídos.',
      26: 'Reduz o nível das camadas antigas durante overdubs. Valores baixos criam loops em evolução; no máximo, as camadas mantêm-se.',
      27: 'Filtro de agudos do Wet. Escurece a ambiência para a recuar na mistura.',
      28: 'Equilíbrio de volume entre Wet e Micro-loop.',
      29: 'Mistura direta do micro-loop, para o manter presente enquanto passa por efeitos Wet.',
      33: 'Half aproxima a duração disponível da geração original; Full usa a duração completa do buffer MKII.',
    };
    if (hints[cc]) return hints[cc];
  }
  if (pedal.id === 'lost-found') {
    if (cc === 24 || cc === 26) return modeDetail(pedal, state, cc === 24 ? 21 : 23);
    if (cc === 25) return 'Em série, aplica o segundo efeito também ao sinal limpo. Usa SPILL com BLEND para equilibrar passagem direta e efeito em cascata.';
    if (cc === 27 || cc === 29) return 'EQ bipolar do canal: para baixo remove agudos; para cima remove graves. Ao centro mantém o espectro.';
    if (cc === 28) return 'Compressão e saturação no fim da cadeia. Começa baixo para unir os efeitos; aumenta para dar densidade e carácter.';
    if (cc === 105 || cc === 106) return modeDetail(pedal, state, cc === 105 ? 21 : 23);
  }
  if (pedal.id === 'bad-mood') {
    if (cc === 24) return 'Modulação dinâmica de amplitude e frequência. INPUT MOD escolhe instrumento ou um canal a modular o outro. Começa baixo e aumenta enquanto tocas.';
    if (cc === 25) return 'Volume relativo dos canais Wet e Micro-loop; ao centro ficam equilibrados.';
    if (cc === 28) return 'Saturação e destruição no fim da cadeia. Aumenta para dar mais carácter a toda a textura.';
    if (cc === 33) return 'Escolhe a fonte de CROSS: Wet a modular Loop, instrumento a modular ambos ou Loop a modular Wet.';
    if (cc === 26) return 'Controla o desaparecimento das camadas antigas durante overdubs: loops que evoluem ou sons que permanecem.';
    if (cc === 27) return 'EQ bipolar: escurece retirando agudos ou afina retirando graves. EQ destino permite aplicá-lo a um canal ou aos dois.';
    if (cc === 29) return 'Mistura direta do micro-loop: mantém parte da gravação presente ao passar pelo Wet.';
  }
  if (cc === pedal.hiddenCc) return 'Ativa o menu alternativo no pedal físico. Para editar os parâmetros na interface, basta escolher o separador Hidden / ALT.';
  if (cc === 105) return 'Congela o som do canal Wet numa repetição infinita. Volta a desativar para libertar a cauda.';
  if (cc === 106) return 'Acrescenta o instrumento limpo ao micro-loop atual. CLOCK pode ser movido durante a gravação para criar camadas a velocidades diferentes.';
  if (control.kind === 'save') return 'Guarda a configuração atual do pedal no slot escolhido, substituindo o som que lá estiver.';
  if (cc === 0) return 'Desvia a altura até quatro semitons para cada lado. O centro mantém a afinação.';
  if (cc === 1) return 'Modulação de performance do modo Synth.';
  if (cc === 57 && control.group === 'synth') return 'Transpõe o som capturado por oitavas para definir a tessitura do teclado.';
  if (cc === 58) return 'Open mantém saída contínua; Note On/Off abre e fecha com a nota; ADSR aplica o envelope de Attack, Decay, Sustain e Release.';
  if (cc === 52) return 'Pausa ou retoma o movimento de ramping sem alterar os pontos de partida.';
  if (control.confirmation) return control.confirmation;
  return control.hint?.replace(/CC\d+/g, '').replace(/\s+/g, ' ').trim() || '';
}
export function controlName(pedal, control, state) {
  if (pedal.id === 'generation-loss-mkii' && state[72]) {
    const classic = { 16: 'LOW PASS', 18: 'GENERATION', 19: 'HIGH PASS' };
    if (classic[control.cc]) return classic[control.cc];
  }
  if (control.cc === pedal.hiddenCc) return 'Menu alternativo no pedal';
  return control.name.replace(/\s*·?\s*CC\d+(?: legado)?/g, '').replace(/\s*·\s*±4 semitons/, ' · ±4 semitons');
}
export function controlChoices(pedal, control, state) {
  if (pedal.effects && [21, 23].includes(control.cc)) {
    return control.choices.map((choice) => ({ ...choice, label: pedal.effects({ ...state, [control.cc]: choice.value }, control.cc)[0] }));
  }
  if (pedal.id === 'generation-loss-mkii' && control.cc === 21 && state[72] && state[76] && state[77]) {
    return control.choices.map((choice) => choice.value === 3 ? { ...choice, label: 'FREEZE' } : choice);
  }
  return control.choices;
}
