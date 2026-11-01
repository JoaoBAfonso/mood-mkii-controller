import { additionalPedals } from './instrument-pedals.js?v=3.2.0';
import { synthesizers } from './instrument-synths.js?v=3.2.0';

export const instruments = [...additionalPedals, ...synthesizers];
export const getInstrument = (id) => instruments.find((instrument) => instrument.id === id);
