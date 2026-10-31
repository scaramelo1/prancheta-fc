import { getLocales } from 'expo-localization';

import { textosPara } from './textos';

// Lido ao abrir o app; quem troca o idioma do celular vê a mudança ao reabrir.
const [local] = getLocales();

export const t = textosPara(local.languageCode);
