import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Resource } from '@/lib/resources';
import { seleccionarRegaloSemana } from '@/lib/regalo-semana';

const recurso = (slug: string, title: string): Resource => ({
  id: slug,
  slug,
  title,
  description: `${title} descripción`,
  requires_email: true,
  download_count: 0,
});

const alta = recurso('hoja-de-tu-semana', 'Recupera horas de tu semana con IA');

describe('selección del regalo semanal', () => {
  test('prioriza el recurso publicado más reciente recibido de la base de datos', () => {
    const db = [recurso('db-reciente', 'DB reciente'), recurso('db-anterior', 'DB anterior')];
    const contenido = [recurso('contenido', 'Contenido')];
    assert.equal(seleccionarRegaloSemana(db, contenido, alta), db[0]);
  });

  test('usa recursos derivados del contenido cuando no hay recursos en la base', () => {
    const contenido = [recurso('contenido-reciente', 'Contenido reciente')];
    assert.equal(seleccionarRegaloSemana([], contenido, alta), contenido[0]);
  });

  test('usa el regalo de alta si no hay recursos publicados ni derivados', () => {
    assert.equal(seleccionarRegaloSemana([], [], alta), alta);
  });
});
