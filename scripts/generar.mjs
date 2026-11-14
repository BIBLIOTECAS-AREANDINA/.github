// Genera profile/README.md a partir de datos/centro.json (y datos/cifras.json si existe).
// Una sola fuente de verdad: editar el JSON y ejecutar `npm run generar`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const d = JSON.parse(readFileSync('datos/centro.json', 'utf8'));
const cifras = existsSync('datos/cifras.json') ? JSON.parse(readFileSync('datos/cifras.json', 'utf8')) : {};
const RAW = `https://raw.githubusercontent.com/${d.org}/.github/main/profile/assets`;
const CAP = `${RAW}/capturas`;
const repoUrl = (r) => `https://github.com/${d.org}/${r}`;
const pagesUrl = (r) => `${d.paginasBase}/${r}/`;
const sub = (t) => t.replace('{iniciativas}', cifras.iniciativas ?? '—').replace('{proyectos}', cifras.proyectos ?? '—');
const esc = (t) => encodeURIComponent(t).replace(/-/g, '--');
const badge = (label, msg, color, url) => `  <a href="${url}"><img alt="${label} ${msg}" src="https://img.shields.io/badge/${esc(label)}-${esc(msg)}-${color}?style=for-the-badge"></a>`;

// Fila de la tabla de proyectos: imagen del sitio (si tiene Pages), descripción y enlaces
const fila = (p) => {
  const enlaces = [
    p.pages ? `<a href="${pagesUrl(p.repo)}">Sitio</a>` : '',
    `<a href="${repoUrl(p.repo)}">Repositorio</a>`,
    p.bidig ? `<a href="${d.enlaces.bidig.replace(/\/$/, '')}${p.bidig}">En la biblioteca digital</a>` : '',
    p.externo ? `<a href="${p.externo}">Digitk</a>` : '',
  ].filter(Boolean).join(' · ');
  const img = p.pages
    ? `<a href="${pagesUrl(p.repo)}"><img src="${CAP.replace('/capturas', '/proyectos')}/${p.repo}.png" alt="${p.titulo}" width="260"></a>`
    : '<sub>Sin sitio web<br>(Apps Script)</sub>';
  return `  <tr>\n    <td width="270" align="center">${img}</td>\n    <td><b>${p.titulo}</b> · <code>${p.repo}</code><br>${sub(p.estado)}<br>${enlaces}</td>\n  </tr>`;
};

const redes = [...d.redes.map((r) => `<a href="${r.url}">${r.nombre}</a>`), `<a href="mailto:${d.correo}">Correo</a>`].join(' ·\n  ');
const galeria = d.bidigPaginas.filter((p) => p.id !== 'bidig-home');
const celdas = galeria.map((p) => `    <td align="center"><a href="${d.enlaces.bidig.replace(/\/$/, '')}${p.ruta}"><img src="${CAP}/${p.id}.png" alt="${p.titulo}"><br><sub><b>${p.titulo}</b></sub></a></td>`);
const filas = [];
for (let i = 0; i < celdas.length; i += 2) filas.push(`  <tr>\n${celdas.slice(i, i + 2).join('\n')}\n  </tr>`);
const porRepo = Object.fromEntries(d.proyectos.map((p) => [p.repo, p]));

const md = `<p align="center"><img src="${CAP}/banner.png" alt="${d.nombre}: biblioteca digital, innovación y repositorio" width="100%"></p>

<p align="center"><em>${d.resumen}</em></p>

<p align="center">
${badge('Biblioteca digital', 'bidig', d.colores.verde, d.enlaces.bidig)}
${badge('Tablero', 'BiblioNova', d.colores.vino, d.enlaces.biblionova)}
${badge('Repositorio', 'Digitk', d.colores.fucsia, d.enlaces.digitk)}
</p>

<p align="center">
  ${redes}
</p>

## La biblioteca digital

${d.descripcionBiblioteca}

<p align="center"><img src="${CAP}/bidig-home.png" alt="Home de la biblioteca digital" width="760"></p>

<table>
${filas.join('\n')}
</table>

## BiblioNova: el tablero

${d.descripcionTablero}

<p align="center"><a href="${d.enlaces.biblionova}"><img src="${CAP}/biblionova-tablero.png" alt="Tablero BiblioNova" width="760"></a></p>

<table>
  <tr>
    <td align="center"><img src="${CAP}/biblionova-equipo.png" alt="Equipo de trabajo"><br><sub>Equipo de trabajo</sub></td>
    <td align="center"><img src="${CAP}/biblionova-academia.png" alt="Pilar Academia"><br><sub>Pilar Academia</sub></td>
  </tr>
</table>

## Equipo

${d.equipo.map((e) => `- [${e.nombre}](${d.enlaces.colaboradores}) · ${e.rol}`).join('\n')}

## De la biblioteca digital a los proyectos

La [biblioteca digital](${d.enlaces.bidig}) organiza sus servicios en accesos rápidos. Esta tabla indica con qué proyecto de este espacio se relaciona cada uno; es una orientación, no una prueba de integración.

| Acceso en la biblioteca digital | Proyecto relacionado |
|---|---|
${d.mapa.map((m) => `| ${m.acceso} | ${m.repos.map((r) => `[${r}](${repoUrl(r)})`).join(', ')} |`).join('\n')}

## Sitios en vivo (GitHub Pages)

Las direcciones antiguas \`rekol08.github.io/...\` ya no funcionan; usar estas. Un sitio que responde no equivale a una prueba funcional completa.

| Sitio | Dirección |
|---|---|
${d.proyectos.filter((p) => p.pages).map((p) => `| ${p.titulo} | [${pagesUrl(p.repo).replace('https://', '').replace(/\/$/, '')}](${pagesUrl(p.repo)}) |`).join('\n')}

${d.sinPagesNota}

## Punto de entrada

${d.puntoEntrada.map((e) => `- [${e.texto}](${e.url})`).join('\n')}

## Proyectos públicos

<table>
${d.proyectos.map(fila).join('\n')}
</table>

## Cómo colaborar

${d.colaborar.map((c, i) => `${i + 1}. ${c}`).join('\n')}

${d.notaColaborar}

## Cómo se actualiza esta página

Todo sale de un solo archivo, [\`datos/centro.json\`](https://github.com/${d.org}/.github/blob/main/datos/centro.json): nombre, descripción, redes, correo, equipo, proyectos y alianzas. Al editarlo y ejecutar \`npm run generar\` se rehace este README; \`npm run sincronizar\` aplica la misma información a la descripción de la organización y a los repositorios.

Las cifras (iniciativas, proyectos, usuarios) se leen del tablero BiblioNova y se guardan en \`datos/cifras.json\`. El flujo [Actualizar capturas del perfil](https://github.com/${d.org}/.github/actions/workflows/capturas.yml) corre cada lunes para el tablero y el banner. Las capturas de la biblioteca digital y de Equipo (\`bidig-*.png\`, \`biblionova-equipo.png\`) no se pueden tomar desde GitHub porque el firewall institucional bloquea sus servidores; se actualizan desde un equipo de la universidad con \`npm install && npx playwright install chromium && npm run actualizar\`.

## Alianzas y reconocimientos

<p align="center">
${d.alianzas.map((a) => `  <img src="${RAW}/${a.imagen}" height="70" alt="${a.nombre}">`).join('\n')}
</p>
`;
writeFileSync('profile/README.md', md);
console.log(`README generado (${md.split('\n').length} líneas)`);
