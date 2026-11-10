/**
 * Crea un nuevo repositorio en GitHub mediante la API oficial y sube la rama `main`.
 *
 * Uso:
 *   node scripts/push-github.js <GITHUB_TOKEN> [NOMBRE_REPO]
 */

const { execSync } = require('child_process');

const token = process.argv[2] || process.env.GITHUB_TOKEN;
const repoName = process.argv[3] || 'voxelcraft-1-24-release';

if (!token) {
  console.error('❌ Uso: node scripts/push-github.js <GITHUB_TOKEN> [NOMBRE_REPO]');
  process.exit(1);
}

(async () => {
  try {
    console.log('🔍 Obteniendo usuario de GitHub...');
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'VoxelCraft-Deploy'
      }
    });
    if (!userRes.ok) {
      throw new Error(`Token de GitHub inválido (${userRes.status}): ${await userRes.text()}`);
    }
    const user = await userRes.json();
    console.log(`👤 Autenticado en GitHub como: ${user.login}`);

    console.log(`🚀 Creando repositorio '${repoName}' en GitHub...`);
    const createRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'VoxelCraft-Deploy'
      },
      body: JSON.stringify({
        name: repoName,
        description: 'VoxelCraft 1.24.X Release — Biomas 1.24, Trial Chambers, Pale Garden, Maza, Servicio Node.js y Supabase Multijugador',
        private: false,
        auto_init: false
      })
    });

    if (!createRes.ok && createRes.status !== 422) {
      throw new Error(`Error creando repositorio (${createRes.status}): ${await createRes.text()}`);
    }

    const remoteWithAuth = `https://${user.login}:${token.trim()}@github.com/${user.login}/${repoName}.git`;
    const publicRepoUrl = `https://github.com/${user.login}/${repoName}`;

    try {
      execSync('git remote remove origin', { stdio: 'ignore' });
    } catch (e) {}

    execSync(`git remote add origin "${remoteWithAuth}"`, { stdio: 'inherit' });
    execSync('git push -u origin main --force', { stdio: 'inherit' });
    // Limpiar el token de la URL remota después de subir por seguridad
    execSync(`git remote set-url origin "${publicRepoUrl}.git"`, { stdio: 'inherit' });

    console.log(`\n✅ ¡Proyecto subido exitosamente a GitHub!: ${publicRepoUrl}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
