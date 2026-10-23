// Aplica el tema elegido antes del primer render (evita el parpadeo claro → oscuro).
// Archivo aparte (no inline) para que lo permita la Content-Security-Policy.
try {
  var t = localStorage.getItem('@printops/theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {
  /* storage bloqueado: queda el tema del sistema */
}
