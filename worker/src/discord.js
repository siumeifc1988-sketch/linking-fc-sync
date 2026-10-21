export function hexToBytes(hex) {
  const clean = String(hex || "").trim();
  if (!clean || clean.length % 2 !== 0) return new Uint8Array();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (!Number.isFinite(byte)) return new Uint8Array();
    out[i] = byte;
  }
  return out;
}

export async function verifyDiscordRequest(request, rawBody, publicKey) {
  try {
    const signature = request.headers.get("X-Signature-Ed25519") || request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("X-Signature-Timestamp") || request.headers.get("x-signature-timestamp");
    if (!signature || !timestamp || !publicKey) return false;
    const key = await crypto.subtle.importKey("raw", hexToBytes(publicKey), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + rawBody),
    );
  } catch {
    return false;
  }
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}

export function getDiscordIdentity(body) {
  const user = (body.member && body.member.user) || body.user;
  if (!user) return { id: null, name: "未知" };
  const name = (body.member && body.member.nick) || user.global_name || user.username || "未知";
  return { id: user.id || null, name: String(name).trim() || "未知" };
}

export function optionValue(data, name) {
  const found = (data?.options || []).find((item) => item.name === name);
  return found ? found.value : undefined;
}

export function focusedOption(data) {
  return (data?.options || []).find((item) => item.focused) || null;
}

export async function editOriginal(interaction, payload, fetchImpl = fetch) {
  const url = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;
  const body = { allowed_mentions: { parse: ["users", "roles", "everyone"] } };
  if (payload.content != null) body.content = String(payload.content).slice(0, 2000);
  if (payload.embeds) body.embeds = payload.embeds;
  await fetchImpl(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function publicError(error) {
  const message = error instanceof Error ? error.message : String(error || "失敗");
  if (/AIza|PRIVATE KEY|api_key|BEGIN /i.test(message)) return "內部錯誤";
  return message.slice(0, 300);
}
