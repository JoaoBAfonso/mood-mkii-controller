function integer(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name}: valor inteiro entre ${min} e ${max} necessário.`);
  }
  return value;
}

export function ccMessage(channel, cc, value) {
  return [0xb0 + integer(channel, 1, 16, 'Canal') - 1, integer(cc, 0, 127, 'CC'), integer(value, 0, 127, 'Valor')];
}
export function pcMessage(channel, slot) {
  return [0xc0 + integer(channel, 1, 16, 'Canal') - 1, integer(slot, 0, 122, 'Preset')];
}
export function noteMessage(channel, note, velocity, on = true) {
  return [(on ? 0x90 : 0x80) + integer(channel, 1, 16, 'Canal') - 1, integer(note, 0, 127, 'Nota'), integer(velocity, 0, 127, 'Velocidade')];
}
export function sendMessage(output, message, demo = false) {
  if (demo) return 'demo';
  if (!output || output.state !== 'connected') {
    throw new Error('Sem saída MIDI ligada. Seleciona uma saída ou ativa o modo demo.');
  }
  output.send(message);
  return 'sent';
}
