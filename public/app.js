function onlyDigits(value) {
  return (value || "").replace(/\D/g, "");
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return digits.slice(0, 5) + "-" + digits.slice(5);
}

function getCookie(name) {
  const match = document.cookie.match(
    new RegExp("(^|;\\s*)" + name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name, value, days) {
  const maxAge = days ? "; Max-Age=" + String(days * 24 * 60 * 60) : "";
  document.cookie =
    name +
    "=" +
    encodeURIComponent(value) +
    maxAge +
    "; Path=/; SameSite=Lax";
}

function deleteCookie(name) {
  document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax";
}

function renderResult(container, data) {
  if (!data) {
    container.className = "result empty";
    container.innerHTML = "<p>Nenhuma informacao ainda. Digite um CEP para buscar.</p>";
    return;
  }

  container.className = "result";
  const entries = [
    ["CEP", data.cep || ""],
    ["Logradouro", data.logradouro || ""],
    ["Bairro", data.bairro || ""],
    ["Cidade", data.localidade || ""],
    ["UF", data.uf || ""],
    ["Complemento", data.complemento || ""],
  ];

  container.innerHTML = entries
    .map(([k, v]) => {
      const safeValue = String(v || "").trim() || "(nao informado)";
      return (
        '<div class="kv">' +
        '<span class="k">' +
        k +
        "</span>" +
        '<span class="v">' +
        safeValue.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") +
        "</span>" +
        "</div>"
      );
    })
    .join("");
}

async function fetchCep(cepDigits) {
  const res = await fetch("/api/cep?cep=" + encodeURIComponent(cepDigits), {
    headers: { Accept: "application/json" },
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = payload && payload.error ? payload.error : "Falha ao buscar CEP";
    throw new Error(msg);
  }
  return payload;
}

function setStatus(el, message, type) {
  el.textContent = message || "";
  el.className = "status" + (type === "error" ? " error" : "");
}

const elCep = document.getElementById("cep");
const elBuscar = document.getElementById("buscar");
const elLimpar = document.getElementById("limpar");
const elStatus = document.getElementById("status");
const elResultado = document.getElementById("resultado");

let lastSearched = null;

async function doSearch() {
  const digits = onlyDigits(elCep.value);
  if (digits.length !== 8) {
    setStatus(elStatus, "Digite 8 numeros (00000-000).", "error");
    return;
  }
  if (digits === lastSearched) return;

  lastSearched = digits;
  elBuscar.disabled = true;
  setStatus(elStatus, "Buscando...", "");
  try {
    const data = await fetchCep(digits);
    renderResult(elResultado, data);
    setCookie("cep", formatCep(digits), 30);
    setCookie("cep_data", JSON.stringify(data), 30);
    setStatus(elStatus, "Encontrado e salvo em cookies.", "");
  } catch (err) {
    renderResult(elResultado, null);
    setStatus(elStatus, err && err.message ? err.message : "Erro", "error");
  } finally {
    elBuscar.disabled = false;
  }
}

elCep.addEventListener("input", () => {
  const formatted = formatCep(elCep.value);
  if (elCep.value !== formatted) {
    const pos = elCep.selectionStart;
    elCep.value = formatted;
    try {
      elCep.setSelectionRange(pos, pos);
    } catch (_) {
      // ignore
    }
  }

  const digits = onlyDigits(formatted);
  if (digits.length === 8) {
    // Debounce leve para nao disparar varias vezes enquanto digita
    window.clearTimeout(elCep._t);
    elCep._t = window.setTimeout(() => doSearch(), 180);
  }
});

elCep.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});

elBuscar.addEventListener("click", () => doSearch());

elLimpar.addEventListener("click", () => {
  deleteCookie("cep");
  deleteCookie("cep_data");
  lastSearched = null;
  elCep.value = "";
  renderResult(elResultado, null);
  setStatus(elStatus, "Cookies limpos.", "");
  elCep.focus();
});

// Restore from cookies on load
(() => {
  const savedCep = getCookie("cep");
  const savedDataRaw = getCookie("cep_data");
  if (savedCep) elCep.value = formatCep(savedCep);

  if (savedDataRaw) {
    try {
      const parsed = JSON.parse(savedDataRaw);
      renderResult(elResultado, parsed);
      setStatus(elStatus, "Informacoes carregadas dos cookies.", "");
      lastSearched = onlyDigits(elCep.value);
      return;
    } catch (_) {
      // ignore; fallthrough
    }
  }

  renderResult(elResultado, null);
})();
