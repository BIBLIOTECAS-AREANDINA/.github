// Genera los pantallazos y el banner del perfil a partir de los sitios en vivo.
// Uso: npm ci && npx playwright install chromium && npm run capturar
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const OUT = 'profile/assets/capturas';
const datos = JSON.parse(readFileSync('datos/centro.json', 'utf8'));
const BIDIG = datos.enlaces.bidig.replace(/\/$/, '');
const NOVA = datos.enlaces.biblionova;
const { verde, fucsia, vino } = datos.colores;
mkdirSync(OUT, { recursive: true });

const paginasBidig = datos.bidigPaginas.map((p) => [p.id, p.ruta]);
const secciones = [['biblionova-experiencia', '#pilar1'], ['biblionova-gestion', '#pilar2'], ['biblionova-academia', '#pilar3'], ['biblionova-equipo', '#equipo']];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'es-CO' });
const resultado = { generado: new Date().toISOString(), fallos: [] };

async function cerrarAvisos(page) {
  for (const sel of ['.dialog-close-button', '.elementor-popup-modal .dialog-close-button', '[aria-label="Cerrar"]', '[aria-label="Close"]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) { await el.click().catch(() => {}); }
  }
}

// bidig bloquea las IP de GitHub Actions: allí se omite (CAPTURAR_BIDIG=0) y se captura desde un equipo institucional.
const conBidig = process.env.CAPTURAR_BIDIG !== "0";
for (const [nombre, ruta] of conBidig ? paginasBidig : []) {
  const page = await ctx.newPage();
  try {
    await page.goto(BIDIG + ruta, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    await cerrarAvisos(page);
    await page.waitForTimeout(500);
    const texto = await page.locator('body').innerText().catch(() => '');
    if (/Web Page Blocked|Access Denied/i.test(texto)) throw new Error('página bloqueada; se conserva la captura anterior');
    await page.screenshot({ path: `${OUT}/${nombre}.png` });
  } catch (e) { resultado.fallos.push(`${nombre}: ${e.message.split('\n')[0]}`); }
  await page.close();
}

// Tablero BiblioNova + cifras para el banner
let cifras = [];
const nova = await ctx.newPage();
try {
  await nova.goto(NOVA, { waitUntil: 'networkidle', timeout: 60000 });
  await nova.waitForTimeout(3500); // contadores animados
  cifras = await nova.$$eval('#bnSummary b', (n) => n.map((x) => x.textContent.trim()));
  await nova.screenshot({ path: `${OUT}/biblionova-tablero.png` });
  // Oculta la barra fija y la de progreso para que no tapen las secciones
  await nova.addStyleTag({ content: '#progressBar, nav { display: none !important; }' });
  for (const [nombre, sel] of secciones) {
    // Las fotos del equipo viven en bidig, que bloquea a GitHub Actions
    if (!conBidig && nombre === 'biblionova-equipo') continue;
    try {
      const el = nova.locator(sel).first();
      await el.scrollIntoViewIfNeeded();
      await nova.waitForFunction((s) => [...document.querySelectorAll(s + ' img')].every((i) => i.complete && i.naturalWidth > 0), sel, { timeout: 15000 });
      await nova.waitForTimeout(800);
      const box = await el.boundingBox();
      // Las secciones de pilar son muy largas: solo se guarda la parte superior
      const alto = Math.min(box.height, 1100);
      await nova.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: true, clip: { x: box.x, y: box.y + (await nova.evaluate(() => window.scrollY)), width: box.width, height: alto } });
    } catch (e) { resultado.fallos.push(`${nombre}: ${e.message.split('\n')[0]}`); }
  }
} catch (e) { resultado.fallos.push(`tablero: ${e.message.split('\n')[0]}`); }
await nova.close();

// Banner (cifras tomadas del tablero; si falla, se omiten)
const [pilares, iniciativas, proyectos, usuarios] = cifras;
const stat = (v, t) => (v ? `<div class="s"><b>${v}</b><span>${t}</span></div>` : '');
const html = `<html><body style="margin:0"><div style="width:1280px;height:320px;box-sizing:border-box;padding:48px 64px;font-family:Poppins,'Segoe UI',Arial,sans-serif;color:#fff;background:linear-gradient(120deg,#${verde} 0%,#7FB536 38%,#${fucsia} 78%,#${vino} 100%);position:relative;overflow:hidden">
<div style="position:absolute;right:-80px;top:-80px;width:340px;height:340px;border-radius:50%;background:rgba(255,255,255,.12)"></div>
<div style="position:absolute;right:140px;bottom:-120px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.10)"></div>
<div style="font-size:15px;letter-spacing:3px;text-transform:uppercase;opacity:.9">${datos.institucion}</div>
<div style="font-size:54px;font-weight:700;margin:6px 0 4px">${datos.nombre}</div>
<div style="font-size:20px;opacity:.95;max-width:760px">${datos.lemaBanner}</div>
<div style="display:flex;gap:36px;margin-top:34px">
${stat(iniciativas, 'iniciativas')}${stat(proyectos, 'proyectos en desarrollo')}${stat(pilares, 'pilares')}${stat(usuarios, 'usuarios en experiencias de aprendizaje')}
</div></div>
<style>.s{display:flex;flex-direction:column}.s b{font-size:34px;line-height:1}.s span{font-size:13px;opacity:.9;margin-top:4px}</style></body></html>`;
const b = await ctx.newPage();
await b.setViewportSize({ width: 1280, height: 320 });
await b.setContent(html);
await b.screenshot({ path: `${OUT}/banner.png` });
await b.close();

// Avatar cuadrado para la organización (subirlo en Ajustes > Perfil)
const logo = readFileSync("profile/assets/logo-areandina.png").toString("base64");
const av = await ctx.newPage();
await av.setViewportSize({ width: 500, height: 500 });
await av.setContent(`<body style="margin:0"><div style="width:500px;height:500px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#5D9A1F,#7FB536 45%,#D4196B)"><img src="data:image/png;base64,${logo}" style="width:380px"></div></body>`);
await av.screenshot({ path: "profile/assets/avatar-organizacion.png" });
await av.close();

resultado.cifras = cifras;
// Cifras para el resto de la documentación (npm run generar las usa)
if (cifras.length === 4) {
  writeFileSync('datos/cifras.json', JSON.stringify({ pilares, iniciativas, proyectos, usuarios, actualizado: resultado.generado }, null, 2) + '\n');
}
writeFileSync(`${OUT}/ultima-actualizacion.json`, JSON.stringify(resultado, null, 2));
await browser.close();
console.log(JSON.stringify(resultado, null, 2));
if (resultado.fallos.length > 3) process.exit(1);
