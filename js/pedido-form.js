import { api } from "./api.js";
import { exigirLogin } from "./auth.js";
import { buscarDisponiveis, calcularDias, calcularValorAluguel } from "./carros.js";
import { mostrarAlerta, montarNavbar, hojeISO, escaparHTML, formatarMoeda } from "./utils.js";

const usuario = exigirLogin(["cliente"]);
montarNavbar(usuario);

const form = document.querySelector("#form-pedido");
const campos = form.elements;
const grupoBanco = document.querySelector("#grupo-banco");
const resumo = document.querySelector("#resumo-valor");        

const params = new URLSearchParams(location.search);
const idEdicao = params.get("id");
const idPreSelecionado = params.get("automovelId");

campos.dataInicio.min = hojeISO();

let carros = new Map();

async function carregarOpcoes() {
  const [disponiveis, bancos] = await Promise.all([
    buscarDisponiveis(idEdicao),
    api.listar("usuarios", "?tipo=agente&tipoAgente=banco"),
  ]);

  carros = new Map(disponiveis.map((a) => [String(a.id), a]));

  campos.automovelId.insertAdjacentHTML("beforeend",
    disponiveis.map((a) =>
      `<option value="${a.id}">${escaparHTML(`${a.marca} ${a.modelo} ${a.ano} – ${a.placa} (R$ ${a.precoDiaria}/dia)`)}</option>`
    ).join(""));

  campos.bancoId.insertAdjacentHTML("beforeend",
    bancos.map((b) => `<option value="${b.id}">${escaparHTML(b.nome)}</option>`).join(""));

  if (idPreSelecionado && !idEdicao) {
    const aindaDisponivel = carros.has(String(idPreSelecionado));
    if (aindaDisponivel) {
      campos.automovelId.value = idPreSelecionado;
    } else {
      mostrarAlerta("Esse carro não está mais disponível. Escolha outro na lista.", "warning");
    }
  }
}

function atualizarResumo() {
  const carro = carros.get(String(campos.automovelId.value));
  const inicio = campos.dataInicio.value;   // "" enquanto o campo está vazio/incompleto
  const fim = campos.dataFim.value;

  if (!carro || !inicio || !fim) {
    resumo.innerHTML = `<p class="mb-0 text-muted">Selecione o carro e as datas para ver o valor do aluguel.</p>`;
    return null;
  }
  if (fim < inicio) {
    resumo.innerHTML = `<p class="mb-0 text-danger">A data de fim não pode ser anterior à data de início.</p>`;
    return null;
  }

  const c = calcularValorAluguel(carro, calcularDias(inicio, fim));

  resumo.innerHTML = `
    <table class="table table-sm mb-0">
      <tbody>
        <tr>
          <th scope="row" class="fw-normal">Valor base de aluguel</th>
          <td class="text-end">${formatarMoeda(c.valorBase)}</td>
        </tr>
        <tr>
          <th scope="row" class="fw-normal">
            Diária ${formatarMoeda(c.precoDiaria)} × ${c.dias} ${c.dias === 1 ? "dia" : "dias"}
          </th>
          <td class="text-end">${formatarMoeda(c.precoDiaria * c.dias)}</td>
        </tr>
        <tr class="linha-total">
          <th scope="row">Total do aluguel</th>
          <td class="text-end">${formatarMoeda(c.valorTotal)}</td>
        </tr>
      </tbody>
    </table>`;
  return c;
}

[campos.automovelId, campos.dataInicio, campos.dataFim].forEach((campo) =>
  campo.addEventListener("input", atualizarResumo)
);

campos.dataInicio.addEventListener("input", () => {
  campos.dataFim.min = campos.dataInicio.value || hojeISO();
});

campos.contratoCredito.addEventListener("change", () => {
  const marcado = campos.contratoCredito.checked;
  grupoBanco.classList.toggle("d-none", !marcado);
  campos.bancoId.required = marcado;
});

async function preencherEdicao() {
  document.querySelector("#titulo-pagina").textContent = `Editar pedido #${idEdicao}`;
  const pedido = await api.buscar("pedidos", idEdicao);

  if (String(pedido.clienteId) !== String(usuario.id) || pedido.status !== "Pendente") {
    mostrarAlerta("Este pedido não pode mais ser alterado.", "warning");
    form.querySelector("button[type='submit']").disabled = true;
    return;
  }
  campos.automovelId.value = pedido.automovelId;
  campos.dataInicio.value = pedido.dataInicio;
  campos.dataFim.value = pedido.dataFim;
  campos.observacoes.value = pedido.observacoes || "";
  if (pedido.contratoCredito) {
    campos.contratoCredito.checked = true;
    campos.contratoCredito.dispatchEvent(new Event("change"));
    campos.bancoId.value = pedido.bancoId;
  }
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;

  if (campos.dataFim.value < campos.dataInicio.value) {
    mostrarAlerta("A data de fim não pode ser anterior à de início.");
    return;
  }

  const calculo = atualizarResumo();
  if (!calculo) {
    mostrarAlerta("Não foi possível calcular o valor. Confira o carro e as datas.");
    return;
  }

  const dados = {
    clienteId: usuario.id,
    automovelId: campos.automovelId.value,
    dataInicio: campos.dataInicio.value,
    dataFim: campos.dataFim.value,
    contratoCredito: campos.contratoCredito.checked,
    bancoId: campos.contratoCredito.checked ? campos.bancoId.value : null,
    observacoes: campos.observacoes.value.trim(),
    dias: calculo.dias,
    valorBase: calculo.valorBase,
    precoDiaria: calculo.precoDiaria,
    valorTotal: calculo.valorTotal,
  };

  try {
    const livres = await buscarDisponiveis(idEdicao);
    if (!livres.some((a) => String(a.id) === String(dados.automovelId))) {
      mostrarAlerta("Esse carro acabou de ser reservado por outro pedido. Escolha outro.", "warning");
      return;
    }

    if (idEdicao) {
      await api.alterar("pedidos", idEdicao, dados);
    } else {
      await api.criar("pedidos", { ...dados, status: "Pendente", parecer: null, criadoEm: hojeISO() });
    }
    location.href = "pedidos.html";
  } catch (erro) {
    mostrarAlerta("Erro ao salvar o pedido.");
    console.error(erro);
  }
});

await carregarOpcoes();
if (idEdicao) await preencherEdicao();
atualizarResumo();