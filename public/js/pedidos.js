import { api } from "./api.js";
import { exigirLogin } from "./auth.js";
import { escaparHTML, mostrarAlerta, montarNavbar, formatarData, badgeStatus, htmlValorPedido } from "./utils.js";

const usuario = exigirLogin(["cliente"]);
montarNavbar(usuario);

const corpo = document.querySelector("#corpo-tabela");

async function carregar() {
  try {
    const [pedidos, automoveis] = await Promise.all([
      api.listar("pedidos", `?clienteId=${usuario.id}`),
      api.listar("automoveis"),
    ]);

    const mapaAuto = new Map(automoveis.map((a) => [String(a.id), a]));

    if (pedidos.length === 0) {
      corpo.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Você ainda não tem pedidos.</td></tr>`;
      return;
    }

    corpo.innerHTML = pedidos.map((p) => {
      const auto = mapaAuto.get(String(p.automovelId));
      const podeEditar = p.status === "Pendente";                          
      const podeCancelar = ["Pendente", "Em análise", "Aprovado"].includes(p.status); 
      return `
        <tr>
          <td>${p.id}</td>
          <td>${auto ? escaparHTML(`${auto.marca} ${auto.modelo} (${auto.placa})`) : "—"}</td>
          <td>${formatarData(p.dataInicio)} a ${formatarData(p.dataFim)}</td>
          <td>${htmlValorPedido(p)}</td>
          <td>${p.contratoCredito ? "Sim" : "Não"}</td>
          <td>${badgeStatus(p.status)}</td>
          <td>${escaparHTML(p.parecer ?? "—")}</td>
          <td class="text-end">
            ${podeEditar ? `<a class="btn btn-sm btn-outline-primary" href="pedido-form.html?id=${p.id}">Editar</a>` : ""}
            ${podeCancelar ? `<button class="btn btn-sm btn-outline-danger" type="button" data-acao="cancelar" data-id="${p.id}">Cancelar</button>` : ""}
          </td>
        </tr>`;
    }).join("");
  } catch (erro) {
    mostrarAlerta("Não foi possível carregar os pedidos.");
    console.error(erro);
  }
}

corpo.addEventListener("click", async (evento) => {
  const botao = evento.target.closest("button[data-acao='cancelar']");
  if (!botao) return;
  if (!confirm("Cancelar este pedido?")) return;

  try {
    await api.alterar("pedidos", botao.dataset.id, { status: "Cancelado" });
    mostrarAlerta("Pedido cancelado.", "success");
    carregar();
  } catch (erro) {
    mostrarAlerta("Erro ao cancelar.");
    console.error(erro);
  }
});

carregar();