import { api } from "./api.js";

const CHAVE = "usuarioLogado";

export async function login(email, senha) {
  const encontrados = await api.listar(
    "usuarios",
    `?email=${encodeURIComponent(email)}&senha=${encodeURIComponent(senha)}`
  );
  if (encontrados.length === 0) return null;

  const { senha: _descartada, ...semSenha } = encontrados[0];
  salvarSessao(semSenha);
  return semSenha;
}

export function salvarSessao(usuario) {
  sessionStorage.setItem(CHAVE, JSON.stringify(usuario));
}

export function usuarioLogado() {
  const texto = sessionStorage.getItem(CHAVE);
  return texto ? JSON.parse(texto) : null;
}

export function exigirLogin(tiposPermitidos = ["cliente", "agente"]) {
  const usuario = usuarioLogado();

  if (!usuario) {
    location.replace("index.html");
    throw new Error("Faça login.");
  }
  if (!tiposPermitidos.includes(usuario.tipo)) {
    location.replace("home.html");
    throw new Error("Sem permissão para esta página.");
  }
  return usuario;
}

export function logout() {
  sessionStorage.removeItem(CHAVE);
  location.replace("index.html");
}