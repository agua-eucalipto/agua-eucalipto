/** SHA-256 en hexadecimal, con `crypto.subtle`. No sale del navegador. */
export async function huellaSha256(bytes: Uint8Array): Promise<string> {
  const copia = new Uint8Array(bytes.byteLength);
  copia.set(bytes);
  const hash = await crypto.subtle.digest("SHA-256", copia);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
