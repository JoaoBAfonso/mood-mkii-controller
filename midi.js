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
export function programMessage(channel, program) {
  return [0xc0 + integer(channel, 1, 16, 'Canal') - 1, integer(program, 0, 127, 'Programa')];
}
export function nrpnMessages(channel, parameter, value, dataBits = 14) {
  integer(parameter, 0, 16383, 'NRPN');
  if (![7, 14].includes(dataBits)) throw new RangeError('NRPN: resolução de 7 ou 14 bits necessária.');
  integer(value, 0, dataBits === 7 ? 127 : 16383, 'Valor NRPN');
  return [
    ccMessage(channel, 99, parameter >> 7), ccMessage(channel, 98, parameter & 127),
    ccMessage(channel, 6, dataBits === 7 ? value : value >> 7),
    ...(dataBits === 14 ? [ccMessage(channel, 38, value & 127)] : []),
  ];
}
export function pitchBendMessage(channel, value) {
  integer(value, 0, 16383, 'Pitch bend');
  return [0xe0 + integer(channel, 1, 16, 'Canal') - 1, value & 127, value >> 7];
}
export function controlMessages(channel, control, value) {
  integer(value, control.min ?? 0, control.max ?? 127, control.name);
  if (control.kind === 'select' && !control.choices.some((choice) => choice.value === value)) {
    throw new RangeError('Escolhe um valor documentado para este controlo.');
  }
  if (control.kind === 'toggle' && ![control.offValue ?? 0, control.onValue ?? 127].includes(value)) {
    throw new RangeError('Estado de switch inválido.');
  }
  if (control.messages) return control.messages(channel, value);
  if (control.protocol === 'nrpn') return nrpnMessages(channel, control.number, value, control.dataBits ?? 14);
  if (control.protocol === 'cc14') {
    integer(value, 0, 16383, control.name);
    return [ccMessage(channel, control.number, value >> 7), ccMessage(channel, control.fineNumber, value & 127)];
  }
  if (control.protocol !== 'cc') throw new Error('Protocolo MIDI não suportado.');
  return [ccMessage(channel, control.number, value)];
}
export function presetMessages(channel, slot, configuration) {
  integer(slot, 0, configuration.count, 'Slot');
  if (slot === 0) {
    if (configuration.live === undefined) throw new RangeError('Este equipamento não tem programa Live.');
    return [programMessage(channel, configuration.live)];
  }
  const program = slot - 1 + configuration.offset;
  const bankSize = configuration.bankSize ?? 128;
  integer(bankSize, 1, 128, 'Tamanho de banco');
  const bank = Math.floor(program / bankSize);
  const messages = [];
  if (configuration.bankMsb !== undefined) messages.push(ccMessage(channel, configuration.bankMsb, bank >> 7));
  if (configuration.bankLsb !== undefined) messages.push(ccMessage(channel, configuration.bankLsb, bank & 127));
  if (bank && configuration.bankMsb === undefined && configuration.bankLsb === undefined) {
    throw new RangeError('Este slot exige um banco MIDI documentado.');
  }
  messages.push(programMessage(channel, program % bankSize));
  return messages;
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
