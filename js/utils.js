import { logout } from "./auth.js";

export const STATUS_ATIVOS = ["Pendente", "Em análise", "Aprovado", "Contratado"];

const COR_STATUS = {
  "Pendente": "warning",
  "Em análise": "info",
  "Aprovado": "primary",
  "Rejeitado": "danger",
  "Contratado": "success",
  "Cancelado": "secondary",
};

export function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

export function mostrarAlerta(mensagem, tipo = "danger", destino = "#alertas") {
  const area = document.querySelector(destino);
  area.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${escaparHTML(mensagem)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>`;
}

export function validarCPF(valor) {
  const cpf = valor.replace(/\D/g, "");                 
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; 

  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(cpf[i]) * (base + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(iso) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function hojeISO() {
  return new Date().toLocaleDateString("sv-SE"); 
}

export function rendaTotal(cliente) {
  return (cliente.rendimentos || []).reduce((soma, r) => soma + Number(r.valor || 0), 0);
}

export function badgeStatus(status) {
  return `<span class="badge text-bg-${COR_STATUS[status] || "light"}">${escaparHTML(status)}</span>`;
}

export function htmlValorPedido(pedido) {
  if (pedido.valorTotal === undefined || pedido.valorTotal === null) return "—";
  return `
    <strong>${formatarMoeda(pedido.valorTotal)}</strong>
    <small class="text-muted d-block">
      ${formatarMoeda(pedido.valorBase)} + ${pedido.dias} × ${formatarMoeda(pedido.precoDiaria)}
    </small>`;
}

export function montarNavbar(usuario) {
  const itens = usuario.tipo === "agente"
    ? [["home.html", "Início"], ["agente.html", "Pedidos"], ["clientes.html", "Clientes"]]
    : [["home.html", "Início"], ["catalogo.html", "Carros"], ["pedidos.html", "Meus pedidos"], ["clientes.html", "Meus dados"]];

  const paginaAtual = location.pathname.split("/").pop() || "index.html";

  const links = itens.map(([href, texto]) => {
    const ativo = href === paginaAtual;
    return `<li class="nav-item">
              <a class="nav-link${ativo ? " active" : ""}" href="${href}"${ativo ? ' aria-current="page"' : ""}>${texto}</a>
            </li>`;
  }).join("");

  document.querySelector("#navbar").innerHTML = `
    <nav class="navbar navbar-expand-md bg-body border-bottom sticky-top">
      <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2 fw-bold" href="home.html">
          <!-- quadrado cinza = logo do wireframe; style inline [Manual §2.6.3] -->
          <img src="img/logo.svg" alt="Logo SearchCar" width="28" height="28" class="d-inline-block align-text-top">
          SearchCar
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
                data-bs-target="#menu" aria-controls="menu" aria-label="Abrir menu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="menu">
          <ul class="navbar-nav ms-auto me-md-3">${links}</ul>
          <span class="navbar-text me-md-3">${escaparHTML(usuario.nome)}</span>
          <button id="btn-sair" class="btn btn-outline-dark btn-sm" type="button">Sair</button>
        </div>
      </div>
    </nav>`;

  document.querySelector("#btn-sair").addEventListener("click", logout);
}