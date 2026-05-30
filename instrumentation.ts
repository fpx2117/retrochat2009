// Ejecuta prisma db push automáticamente al iniciar el servidor
// Garantiza que el schema esté sincronizado en Railway sin depender de npm scripts

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { execSync } = await import('child_process')
    try {
      console.log('🔄 Sincronizando base de datos...')
      execSync('npx prisma db push --skip-generate', {
        stdio: 'inherit',
        timeout: 30000,
      })
      console.log('✅ Base de datos sincronizada')
    } catch (e) {
      console.error('⚠️ Error sincronizando DB:', e)
    }
  }
}
