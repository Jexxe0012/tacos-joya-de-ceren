export function esModoDemostracion() {
  return new URLSearchParams(globalThis.location?.search).get("demo") === "1";
}

export function almacenDatos() {
  return esModoDemostracion() ? globalThis.sessionStorage : globalThis.localStorage;
}

export function enlaceModoDatos(demostracion) {
  const destino = new URL(window.location.href);
  if (demostracion) destino.searchParams.set("demo", "1");
  else destino.searchParams.delete("demo");
  destino.hash = "/login";
  return destino.href;
}
