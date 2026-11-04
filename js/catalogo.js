import { exigirLogin } from "./auth.js";
import { montarNavbar, mostrarAlerta, escaparHTML, formatarMoeda } from "./utils.js";
import { buscarDisponiveis, htmlImagemCarro } from "./carros.js";

const usuario = exigirLogin(["cliente"]);   
montarNavbar(usuario);

const TAMANHO_LOTE = 6;   

const form = document.querySelector("#form-filtro");
const grade = document.querySelector("#grade-carros");
const sentinela = document.querySelector("#sentinela");
const contador = document.querySelector("#contador");
const mensagemFim = document.querySelector("#mensagem-fim");

let disponiveis = [];   
let filtrados = [];     
let indice = 0;         

function htmlCard(a) {
  const nome = escaparHTML(`${a.marca} ${a.modelo}`);

  const detalhes = [
    ["Categoria", a.categoria],
    ["Taxa base", formatarMoeda(a.valorBase)], 
    ["Ano", a.ano],
    ["Passageiros", a.passageiros],
    ["Câmbio", a.cambio],
    ["Portas", a.portas],
    ["Combustível", a.combustivel],
    ["Ar-condicionado", a.arCondicionado ? "Sim" : "Não"],
    ["Placa", a.placa],
  ].map(([rotulo, valor]) => `<dt>${rotulo}</dt><dd>${escaparHTML(String(valor ?? "—"))}</dd>`).join("");

  const urlReserva = `pedido-form.html?automovelId=${encodeURIComponent(a.id)}`;

  return `
    <article class="card-flip" data-id="${a.id}">
      <div class="card-flip-inner">

        <!-- FRENTE -->
        <section class="face frente">
          <div class="area-imagem">${htmlImagemCarro(a)}</div>
          <div class="corpo-face">
            <h2 class="titulo-carro">${nome}</h2>
            <p class="categoria-carro">${escaparHTML(a.categoria)}</p>
            <p class="preco-carro">R$ <strong>${a.precoDiaria}</strong> <span>/ dia</span></p>
            <a class="btn btn-reservar w-100 mt-auto" href="${urlReserva}">RESERVE AGORA</a>
            <button type="button" class="btn btn-link" data-acao="detalhes">Mostrar detalhes</button>
          </div>
        </section>

        <!-- VERSO (começa "inert": não recebe foco nem clique enquanto está escondido) -->
        <section class="face verso" inert>
          <div class="corpo-face">
            <h2 class="titulo-carro">${nome}</h2>
            <dl class="lista-detalhes">${detalhes}</dl>
            <p class="preco-carro">R$ <strong>${a.precoDiaria}</strong> <span>/ dia</span></p>
            <a class="btn btn-reservar w-100 mt-auto" href="${urlReserva}">RESERVE AGORA</a>
            <button type="button" class="btn btn-link" data-acao="voltar">Voltar</button>
          </div>
        </section>

      </div>
    </article>`;
}

grade.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  const carta = botao.closest(".card-flip");        
  const virou = carta.classList.toggle("virado");   

  carta.querySelector(".frente").inert = virou;
  carta.querySelector(".verso").inert = !virou;

  carta.querySelector(virou ? ".verso button" : ".frente button").focus();
});

const observador = new IntersectionObserver((entradas) => {
  if (entradas[0].isIntersecting) carregarMais();
}, { rootMargin: "300px" });

function reobservar() {
  observador.unobserve(sentinela);
  observador.observe(sentinela);
}

function carregarMais() {
  if (indice >= filtrados.length) return;               

  const lote = filtrados.slice(indice, indice + TAMANHO_LOTE);
  grade.insertAdjacentHTML("beforeend", lote.map(htmlCard).join(""));
  indice += lote.length;
  atualizarStatus();

  if (indice < filtrados.length) reobservar();          
}

function atualizarStatus() {
  contador.textContent = filtrados.length
    ? `Mostrando ${indice} de ${filtrados.length} carros`
    : "";

  const acabou = indice >= filtrados.length;
  mensagemFim.classList.toggle("d-none", !acabou);
  mensagemFim.textContent = filtrados.length === 0
    ? "Nenhum carro disponível com esses filtros."
    : "Você viu todos os carros disponíveis.";
}

function aplicarFiltros() {
  const categoria = form.elements.categoria.value;
  const min = form.elements.precoMin.value === "" ? 0 : Number(form.elements.precoMin.value);
  const max = form.elements.precoMax.value === "" ? Infinity : Number(form.elements.precoMax.value);

  if (min > max) {
    mostrarAlerta("O preço mínimo não pode ser maior que o preço máximo.", "warning");
    return;
  }
  document.querySelector("#alertas").innerHTML = "";

  filtrados = disponiveis.filter((a) =>
    (!categoria || a.categoria === categoria) &&
    Number(a.precoDiaria) >= min &&
    Number(a.precoDiaria) <= max
  );

  grade.innerHTML = "";
  indice = 0;
  carregarMais();
  atualizarStatus();   
}

form.addEventListener("submit", (evento) => {
  evento.preventDefault();
  aplicarFiltros();
});

document.querySelector("#btn-limpar").addEventListener("click", () => {
  form.reset();          
  aplicarFiltros();
});

function preencherCategorias() {
  // Set remove repetidos; sort() ordena alfabeticamente.
  const categorias = [...new Set(disponiveis.map((a) => a.categoria).filter(Boolean))].sort();
  form.elements.categoria.insertAdjacentHTML("beforeend",
    categorias.map((c) => `<option value="${escaparHTML(c)}">${escaparHTML(c)}</option>`).join(""));
}

try {
  disponiveis = await buscarDisponiveis();
  preencherCategorias();

  const categoriaDaUrl = new URLSearchParams(location.search).get("categoria");
  if (categoriaDaUrl) form.elements.categoria.value = categoriaDaUrl;

  aplicarFiltros();
} catch (erro) {
  mostrarAlerta("Não foi possível carregar os carros. A API está rodando?");
  console.error(erro);
}