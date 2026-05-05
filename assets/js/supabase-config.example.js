/*
 * Configuracion publica de Supabase para la landing.
 *
 * GitHub Pages necesita que este archivo exista en produccion.
 * Usa solo:
 * - Project URL publica
 * - anon key publica
 *
 * Nunca expongas una clave de administrador en frontend.
 * La seguridad real depende de RLS y de no habilitar SELECT publico.
 */
window.NEXAR_SUPABASE_CONFIG = {
  url: "https://TU-PROYECTO.supabase.co",
  anonKey: "TU_SUPABASE_ANON_KEY_AQUI"
};
