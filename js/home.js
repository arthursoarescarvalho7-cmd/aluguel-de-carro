import { exigirLogin } from "./auth.js";
import { montarNavbar, escaparHTML } from "./utils.js";
import { buscarDisponiveis, embaralhar, htmlImagemCarro } from "./carros.js";

const usuario = exigirLogin();          
montarNavbar(usuario);
const ehCliente = usuario.tipo === "cliente";

const MAX_DESTAQUES = 8;                

// Elementos da página.
const trilho = document.querySelector("#carrossel");
const pontos = document.querySelector("#pontos");
const contador = document.querySelector("#contador");
const btnAnterior = document.querySelector("#btn-anterior");
const btnProximo = document.querySelector("#btn-proximo");

if (!ehCliente) {
  const btnHero = document.querySelector("#btn-hero");
  btnHero.textContent = "Ver pedidos";
  btnHero.href = "agente.html";
  document.querySelector("#texto-passos").textContent =
    "Analise pedidos, registre pareceres e execute contratos.";
  document.querySelector("#link-ver-todos").classList.add("d-none"); 
}

let destaques = [];   // carros sorteados
let pagina = 0;       // página atual (0, 1, 2...)

function porPagina() {
  const largura = window.innerWidth;
  return largura >= 992 ? 3 : largura >= 768 ? 2 : 1;
}
const totalPaginas = () => Math.max(1, Math.ceil(destaques.length / porPagina()));

function htmlCartao(a) {
  const ar = a.arCondicionado ? "Ar-condicionado" : "Sem ar-condicionado";
  const botao = ehCliente
    ? `<a class="btn btn-outline-dark w-100" href="catalogo.html?categoria=${encodeURIComponent(a.categoria)} id="card"">Ver detalhes</a>`
    : "";
  return `
    <article class="cartao-carro">
      <div class="area-imagem">${htmlImagemCarro(a)}</div>
      <div class="corpo-cartao">
        <p class="categoria">${escaparHTML(a.categoria)}</p>
        <h3 class="h6 fw-bold">${escaparHTML(`${a.marca} ${a.modelo}`)}</h3>
        <p class="texto-suave small">${a.passageiros} pessoas · ${escaparHTML(a.cambio)} · ${ar}</p>
        <p class="preco">R$ <strong>${a.precoDiaria}</strong> <span class="texto-suave small">/ dia · a partir de</span></p>
        ${botao}
      </div>
    </article>`;
}

function desenhar() {
  if (destaques.length === 0) {
    trilho.innerHTML = `<p class="texto-suave">Nenhum carro disponível no momento.</p>`;
    pontos.innerHTML = contador.textContent = "";
    btnAnterior.disabled = btnProximo.disabled = true;
    return;
  }

  const n = porPagina();
  pagina = Math.min(pagina, totalPaginas() - 1);     
  const inicio = pagina * n;
  const fatia = destaques.slice(inicio, inicio + n); 

  trilho.style.setProperty("--por-pagina", n);
  trilho.innerHTML = fatia.map(htmlCartao).join("");

  pontos.innerHTML = Array.from({ length: totalPaginas() }, (_, i) =>
    `<button type="button" class="ponto${i === pagina ? " ativo" : ""}" data-pagina="${i}"
             aria-label="Ir para a página ${i + 1}"></button>`
  ).join("");

  contador.textContent = `${inicio + 1}-${inicio + fatia.length} de ${destaques.length} carros`;
}

function mover(delta) {
  const total = totalPaginas();
  pagina = (pagina + delta + total) % total;  
  desenhar();
}

btnAnterior.addEventListener("click", () => mover(-1));
btnProximo.addEventListener("click", () => mover(1));
pontos.addEventListener("click", (evento) => {   
  const ponto = evento.target.closest("[data-pagina]");
  if (!ponto) return;
  pagina = Number(ponto.dataset.pagina);
  desenhar();
});

let temporizador;
window.addEventListener("resize", () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(desenhar, 150);
});

try {
  const disponiveis = await buscarDisponiveis();                       
  destaques = embaralhar(disponiveis).slice(0, MAX_DESTAQUES);          
  desenhar();
} catch (erro) {
  trilho.innerHTML = `<p class="text-danger">Não foi possível carregar os carros. A API está rodando?</p>`;
  console.error(erro);
}