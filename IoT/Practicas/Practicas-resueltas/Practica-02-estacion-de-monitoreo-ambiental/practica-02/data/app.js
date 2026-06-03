const indicadorLed = document.getElementById("indicador-led");
const botonLed = document.getElementById("boton-led");
const textoEstadoLed = document.getElementById("texto-estado-led");

const rellenoTermometro = document.getElementById("relleno-termometro");
const textoTemperatura = document.getElementById("texto-temperatura");

const rellenoHigrometro = document.getElementById("relleno-higrometro");
const textoHumedad = document.getElementById("texto-humedad");

const textoReloj = document.getElementById("texto-reloj");

const TIEMPO_ACTUALIZACION_MS = 1000;

let estadoActualLed = 0;
let procesandoPeticionLed = false;

async function inicializarAplicacion() {
  botonLed.addEventListener("click", solicitarCambioLed);
  await sincronizarDatos();
  setInterval(sincronizarDatos, TIEMPO_ACTUALIZACION_MS);
}

async function sincronizarDatos() {
  await Promise.all([
    obtenerEstadoLed(),
    obtenerTemperatura(),
    obtenerHumedad(),
  ]);

  actualizarReloj();
}

async function obtenerEstadoLed() {
  if (procesandoPeticionLed) return;

  try {
    const respuesta = await axios.get("/led");
    estadoActualLed = parseInt(respuesta.data, 10);
    actualizarInterfazLed();
  } catch (error) {
    console.error("Fallo al obtener estado del LED:", error);
    textoEstadoLed.textContent = "Estado: Error de red";
    botonLed.disabled = true;
  }
}

async function solicitarCambioLed() {
  if (procesandoPeticionLed) return;

  procesandoPeticionLed = true;
  botonLed.disabled = true;

  const nuevoEstado = estadoActualLed === 1 ? 0 : 1;

  try {
    await axios.post(`/led?on=${nuevoEstado}`);
    estadoActualLed = nuevoEstado;
    actualizarInterfazLed();
  } catch (error) {
    console.error("Fallo al actualizar el estado del LED:", error);
    textoEstadoLed.textContent = "Estado: Error al enviar comando";
  } finally {
    procesandoPeticionLed = false;
    botonLed.disabled = false;
  }
}

function actualizarInterfazLed() {
  botonLed.disabled = false;

  if (estadoActualLed === 1) {
    indicadorLed.className = "led encendido";
    textoEstadoLed.textContent = "Estado: Encendido";
    botonLed.textContent = "Apagar";
  } else {
    indicadorLed.className = "led apagado";
    textoEstadoLed.textContent = "Estado: Apagado";
    botonLed.textContent = "Encender";
  }
}

async function obtenerTemperatura() {
  try {
    const respuesta = await axios.get("/temperature");
    const temperatura = parseFloat(respuesta.data);

    if (!isNaN(temperatura)) {
      textoTemperatura.textContent = `${temperatura.toFixed(2)} °C`;

      const temperaturaMinimaVisual = 0;
      const temperaturaMaximaVisual = 50;
      let porcentaje =
        ((temperatura - temperaturaMinimaVisual) /
          (temperaturaMaximaVisual - temperaturaMinimaVisual)) *
        100;
      porcentaje = Math.max(0, Math.min(100, porcentaje));

      rellenoTermometro.style.height = `${porcentaje}%`;
    }
  } catch (error) {
    console.error("Fallo al obtener temperatura:", error);
    textoTemperatura.textContent = "Error";
  }
}

async function obtenerHumedad() {
  try {
    const respuesta = await axios.get("/humidity");
    const humedad = parseFloat(respuesta.data);

    if (!isNaN(humedad)) {
      textoHumedad.textContent = `${humedad.toFixed(2)} %`;

      const porcentaje = Math.max(0, Math.min(100, humedad));
      rellenoHigrometro.style.height = `${porcentaje}%`;
    }
  } catch (error) {
    console.error("Fallo al obtener humedad:", error);
    textoHumedad.textContent = "Error";
  }
}

function actualizarReloj() {
  const ahora = new Date();
  // Formateamos para que siempre tengan 2 dígitos (ej: 09:05:02)
  const horas = String(ahora.getHours()).padStart(2, "0");
  const minutos = String(ahora.getMinutes()).padStart(2, "0");
  const segundos = String(ahora.getSeconds()).padStart(2, "0");

  textoReloj.textContent = `${horas}:${minutos}:${segundos}`;
}

document.addEventListener("DOMContentLoaded", inicializarAplicacion);
