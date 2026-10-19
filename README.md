# Signum Relay

**La señal sos vos.** Runner 3D infinito para el stand de Signum Vitae. Un robot mensajero corre por una ciudad sin red y lleva mensajes de teléfono en teléfono.

## Jugar

- **← / → o A / D:** cambiar de carril.
- **↑ / W / espacio:** saltar las barreras bajas.
- **↓ / S:** deslizarse bajo las vigas.
- **P / Escape:** pausar y continuar.
- **Tablet:** deslizar el dedo o usar los botones en pantalla.

Juntá baterías y paquetes de datos. Los choques gastan energía. En cada relevo, elegí un teléfono con señal: el enlace verde consume menos batería, el enlace débil acelera la carrera y consume más. Si elegís un teléfono sin señal, el mensaje espera y la batería sigue bajando hasta que cambies de carril.

Cada **tres relevos** se completa una entrega y aparece otro mensaje. La carrera sigue, aumenta la velocidad y termina al agotarse la batería. El ranking de distancia se guarda **en ese navegador**, sin cuentas ni servidor.

## Abrir en la computadora

No hay que instalar dependencias ni compilar. Con Python 3:

```sh
cd signum-relay
python3 -m http.server 4173 --bind 0.0.0.0
```

Abrir `http://localhost:4173`. Para probar desde una tablet en la misma red, usar la dirección de la computadora y el puerto 4173. La compu debe seguir encendida y el firewall debe permitir la conexión local.

Usar un servidor HTTP o GitHub Pages. Abrir `index.html` con doble clic puede bloquear los módulos JavaScript por las restricciones de los navegadores.

## Publicar en GitHub Pages

1. Subir **el contenido de esta carpeta**, incluida `vendor/`, a la raíz de un repositorio.
2. En **Settings → Pages**, elegir **Deploy from a branch**.
3. Elegir la rama principal y la carpeta **/ (root)**, y guardar.
4. Esperar a que GitHub termine la publicación y abrir el enlace que muestre Pages.

Todos los enlaces son relativos: funciona tanto en un dominio propio como bajo `/nombre-del-repositorio/`. No hacen falta tokens, API keys, Actions ni servicios pagos. `.nojekyll` permite servir los archivos directamente.

## Para el stand

- Dejar la pantalla de inicio abierta: muestra una carrera automática para atraer a quienes pasan.
- Usar pantalla completa y sonido a volumen moderado.
- Ofrecer empezar directamente. Los controles también aparecen en pantalla.
- Invitar a la siguiente persona a superar la marca o a continuar luego de un relevo.
- El resultado vuelve al inicio después de 35 segundos sin interacción.
- Abrir el sitio con conexión antes del evento y dejar que termine de cargar. El service worker guarda el juego para volver a abrirlo sin Internet en el mismo navegador. La primera carga requiere conexión. La disponibilidad sin conexión depende de que el navegador conserve esos datos.

## Proyecto y alcance

Es una **simulación lúdica** del almacenamiento y reenvío de mensajes. No usa Bluetooth real ni intercambia mensajes entre visitantes. Los metros, el consumo y las rutas son reglas del juego, no mediciones de Signum Vitae. El prototipo del proyecto es una beta Android y la retransmisión entre varios teléfonos requiere evaluación experimental.

## Estructura

`core.js` contiene las reglas y la generación infinita. `game.js` dibuja el mundo 3D, procesa controles, sonido y ranking. `style.css` e `index.html` contienen la interfaz. `sw.js` guarda los archivos para uso sin conexión. `vendor/` contiene Three.js 0.180.0, distribuido bajo MIT, con su licencia original.

Pruebas de las reglas: `npm test` o `node --test tests/core.test.js`. Navegador moderno con WebGL 2. Gráficos, personajes y sonidos originales generados por código. Sin analítica, anuncios, rastreadores ni fuentes externas.
