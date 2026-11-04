import { api } from "./api.js";
import { exigirLogin } from "./auth.js";
import {
  escaparHTML, mostrarAlerta, montarNavbar, formatarData, formatarMoeda, rendaTotal, badgeStatus, htmlValorPedido,
} from "./utils.js";

const agente = exigirLogin(["agente"]);
montarNavbar(agente);

const corpo = document.querySelector("#corpo-tabela");

const ACOES_POR_STATUS = {
  "Pendente":   [{ acao: "analisar",  texto: "Iniciar análise", classe: "outline-info" }],
  "Em análise": [{ acao: "aprovar",   texto: "Aprovar",         classe: "outline-success" },
                 { acao: "rejeitar",  texto: "Rejeitar",        classe: "outline-danger" }],
  "Aprovado":   [{ acao: "contratar", texto: "Executar contrato", classe: "success" }],
};

async function carregar() {
  try {
    const [pedidos, clientes, automoveis] = await Promise.all([
      api.listar("pedidos"),
      api.listar("usuarios", "?tipo=cliente"),
      api.listar("automoveis"),
    ]);
    const mapaCli = new Map(clientes.map((c) => [String(c.id), c]));
    const mapaAuto = new Map(automoveis.map((a) => [String(a.id), a]));

    if (pedidos.length === 0) {
      corpo.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Nenhum pedido.</td></tr>`;
      return;
    }

    corpo.innerHTML = pedidos.map((p) => {
      const cli = mapaCli.get(String(p.clienteId));
      const auto = mapaAuto.get(String(p.automovelId));
      const botoes = (ACOES_POR_STATUS[p.status] || []).map((a) =>
        `<button type="button" class="btn btn-sm btn-${a.classe}" data-acao="${a.acao}" data-id="${p.id}">${a.texto}</button>`
      ).join(" ");
      return `
        <tr>
          <td>${p.id}</td>
          <td>${cli ? escaparHTML(cli.nome) : "—"}</td>
          <td>${cli ? formatarMoeda(rendaTotal(cli)) : "—"}</td>
          <td>${auto ? escaparHTML(`${auto.marca} ${auto.modelo}`) : "—"}</td>
          <td>${formatarData(p.dataInicio)} a ${formatarData(p.dataFim)}</td>
          <td>${htmlValorPedido(p)}</td>
          <td>${p.contratoCredito ? "Sim" : "Não"}</td>
          <td>${badgeStatus(p.status)}</td>
          <td class="text-end">${botoes}</td>
        </tr>`;
    }).join("");
  } catch (erro) {
    mostrarAlerta("Não foi possível carregar os pedidos.");
    console.error(erro);
  }
}

async function tratarAcao(acao, id) {
  const pedido = await api.buscar("pedidos", id);

  if (acao === "analisar") {
    await api.alterar("pedidos", id, { status: "Em análise", agenteId: agente.id });

  } else if (acao === "aprovar" || acao === "rejeitar") {
    const parecer = prompt(`Parecer financeiro para o pedido #${id}:`);
    if (parecer === null) return;
    await api.alterar("pedidos", id, {
      status: acao === "aprovar" ? "Aprovado" : "Rejeitado",
      parecer: parecer.trim() || "Sem observações.",
      agenteId: agente.id,
    });

  } else if (acao === "contratar") {
    const propriedade = pedido.contratoCredito
      ? { proprietario: "banco",   proprietarioId: pedido.bancoId }
      : { proprietario: "empresa", proprietarioId: agente.id };
    await api.alterar("automoveis", pedido.automovelId, propriedade);
    await api.alterar("pedidos", id, { status: "Contratado", agenteId: agente.id });
  }
}

corpo.addEventListener("click", async (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;
  try {
    await tratarAcao(botao.dataset.acao, botao.dataset.id);
    mostrarAlerta("Pedido atualizado.", "success");
    carregar();
  } catch (erro) {
    mostrarAlerta("Erro ao atualizar o pedido.");
    console.error(erro);
  }
});

carregar();