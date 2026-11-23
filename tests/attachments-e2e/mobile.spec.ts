import AxeBuilder from '@axe-core/playwright';
import { test,expect } from '@playwright/test';
import { owner,create,confirmed } from '../offline-e2e/helpers';
import { begin,syntheticImage,remoteImages } from './helpers';

test('the optional image picker supports mobile dark mode, enlarged text, keyboard cancellation and a photo-free expense',async ({ page,request }) => {
  await page.setViewportSize({ width: 390,height: 844 }); await owner(page,request); const base = await create(page); await page.getByRole('combobox',{ name: 'Tema',exact: true }).selectOption('dark'); await begin(page,'Selección cancelada');
  await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; }); await page.getByRole('button',{ name: 'Elegir imagen',exact: true }).click();
  const dialog = page.getByRole('dialog',{ name: 'Imagen del gasto',exact: true }); await expect(dialog).toBeVisible(); await expect(page.getByRole('button',{ name: 'Tomar foto',exact: true })).toBeVisible(); expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual([]);
  await page.getByLabel('Elegir de galería',{ exact: true }).focus(); await expect(page.getByLabel('Elegir de galería',{ exact: true })).toBeFocused(); await page.getByLabel('Elegir de galería',{ exact: true }).setInputFiles(await syntheticImage(page)); await expect(page.getByRole('img',{ name: 'Vista previa de la miniatura',exact: true })).toBeVisible(); await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(page.getByRole('button',{ name: 'Elegir imagen',exact: true })).toBeFocused(); await expect(page.getByRole('button',{ name: 'Quitar imagen',exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); await page.getByRole('button',{ name: 'Guardar gasto',exact: true }).click(); await expect(page).toHaveURL(base); await confirmed(page); await expect(page.getByTestId('trip-total')).toHaveText('COP $20.000'); expect((await remoteImages(request,base))).toHaveLength(0);
});
