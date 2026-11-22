import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  toIntervalPayload,
  validateIntervals,
} from '../src/utils/configuracao.ts';
import { readLoginRedirect } from '../src/utils/login-redirect.ts';

const values = (coleta, descoberta) => ({
  intervaloColetaSegundos: coleta,
  intervaloDescobertaSegundos: descoberta,
});

test('aceita intervalos inteiros dentro dos limites do backend', () => {
  assert.deepEqual(validateIntervals(values('10', '10')), {});
  assert.deepEqual(validateIntervals(values('3600', '86400')), {});
  assert.deepEqual(validateIntervals(values(' 60 ', '300')), {});
});

test('recusa campo vazio, número quebrado e valor fora dos limites', () => {
  assert.deepEqual(validateIntervals(values('', '30.5')), {
    intervaloColetaSegundos: 'Informe o intervalo de coleta.',
    intervaloDescobertaSegundos:
      'O intervalo de descoberta deve ser um número inteiro de segundos.',
  });
  assert.deepEqual(validateIntervals(values('9', '86401')), {
    intervaloColetaSegundos:
      'O intervalo de coleta deve ficar entre 10 e 3600 segundos.',
    intervaloDescobertaSegundos:
      'O intervalo de descoberta deve ficar entre 10 e 86400 segundos.',
  });
  assert.equal(
    validateIntervals(values('3601', '60')).intervaloColetaSegundos,
    'O intervalo de coleta deve ficar entre 10 e 3600 segundos.',
  );
});

test('converte o formulário no corpo do PUT /configuracao', () => {
  assert.deepEqual(toIntervalPayload(values(' 60 ', '300')), {
    intervaloColetaSegundos: 60,
    intervaloDescobertaSegundos: 300,
  });
  assert.deepEqual(
    toIntervalPayload({ ...values('60', '300'), metaMensalKgCo2e: '500,5' }),
    {
      intervaloColetaSegundos: 60,
      intervaloDescobertaSegundos: 300,
      metaMensalKgCo2e: 500.5,
    },
  );
  assert.deepEqual(
    toIntervalPayload({ ...values('60', '300'), metaMensalKgCo2e: '' }, 500.5),
    {
      intervaloColetaSegundos: 60,
      intervaloDescobertaSegundos: 300,
      metaMensalKgCo2e: null,
    },
  );
  assert.deepEqual(
    toIntervalPayload({ ...values('60', '300'), metaMensalKgCo2e: '' }, null),
    {
      intervaloColetaSegundos: 60,
      intervaloDescobertaSegundos: 300,
    },
  );
});

test('valida meta mensal opcional na configuração administrativa', () => {
  assert.deepEqual(
    validateIntervals({ ...values('30', '60'), metaMensalKgCo2e: '' }),
    {},
  );
  assert.deepEqual(
    validateIntervals({ ...values('30', '60'), metaMensalKgCo2e: '250.5' }),
    {},
  );
  assert.equal(
    validateIntervals({ ...values('30', '60'), metaMensalKgCo2e: '-5' })
      .metaMensalKgCo2e,
    'A meta mensal deve ser maior que zero, ou deixe em branco para remover.',
  );
  assert.equal(
    validateIntervals({ ...values('30', '60'), metaMensalKgCo2e: '0' })
      .metaMensalKgCo2e,
    'A meta mensal deve ser maior que zero, ou deixe em branco para remover.',
  );
  assert.equal(
    validateIntervals({ ...values('30', '60'), metaMensalKgCo2e: 'abc' })
      .metaMensalKgCo2e,
    'A meta mensal deve ser um número válido em kgCO₂e.',
  );
});

test('lê o destino e a mensagem do redirecionamento para o login', () => {
  assert.deepEqual(readLoginRedirect({ from: '/admin', message: 'Entre.' }), {
    from: '/admin',
    message: 'Entre.',
  });
  assert.deepEqual(readLoginRedirect(null), { from: '/', message: '' });
  assert.equal(readLoginRedirect({ from: '//site-externo.com' }).from, '/');
  assert.equal(readLoginRedirect({ from: 'https://site.com' }).from, '/');
  assert.equal(readLoginRedirect({ message: 42 }).message, '');
});
