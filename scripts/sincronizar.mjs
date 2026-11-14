// Aplica datos/centro.json a la organización y a los repositorios con la CLI de GitHub (gh).
// Por defecto solo muestra lo que cambiaría. Para aplicar: npm run sincronizar -- --aplicar
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const aplicar = process.argv.includes('--aplicar');
const d = JSON.parse(readFileSync('datos/centro.json', 'utf8'));
const GH = process.env.GH_BIN || 'gh';
const gh = (args) => {
  const r = spawnSync(GH, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${GH} ${args.join(' ')}\n${r.stderr}`);
  return r.stdout;
};
const acciones = [];

// Organización (la imagen y las redes solo se cambian desde la web de GitHub)
acciones.push({
  titulo: `Organización ${d.org}: nombre, descripción, sitio, correo y ubicación`,
  args: ['api', '-X', 'PATCH', `orgs/${d.org}`, '-f', `name=${d.nombre}`, '-f', `description=${d.descripcionCorta}`, '-f', `blog=${d.enlaces.bidig}`, '-f', `email=${d.correo}`, '-f', `location=${d.ubicacion}`],
});

// Repositorios: descripción, sitio y temas
for (const p of d.proyectos) {
  const args = ['repo', 'edit', `${d.org}/${p.repo}`];
  if (p.descripcion) args.push('--description', p.descripcion);
  if (p.pages) args.push('--homepage', `${d.paginasBase}/${p.repo}/`);
  for (const t of p.topics ?? []) args.push('--add-topic', t);
  acciones.push({ titulo: `Repo ${p.repo}`, args });
}

for (const a of acciones) {
  if (!aplicar) { console.log(`[simulación] ${a.titulo}`); continue; }
  try { gh(a.args); console.log(`ok  ${a.titulo}`); } catch (e) { console.error(`ERROR ${a.titulo}\n${e.message}`); process.exitCode = 1; }
}
if (!aplicar) console.log('\nNada se aplicó. Usa --aplicar para ejecutar los cambios.');
