import { api } from "./api.js";
import { exigirLogin, logout } from "./auth.js";
import { escaparHTML, mostrarAlerta, montarNavbar, formatarMoeda, rendaTotal } from "./utils.js";

const usuario = exigirLogin(["cliente", "agente"]);
montarNavbar(usuario);

const corpo = document.querySelector("#corpo-tabela");

if (usuario.tipo === "cliente") {
  document.querySelector("#titulo-pagina").textContent = "Meus dados";
}
const filtro = usuario.tipo === "agente" ? "?tipo=cliente" : `?tipo=cliente&id=${usuario.id}`;

async function carregar() {
  try {
    const clientes = await api.listar("usuarios", filtro);

    if (clientes.length === 0) {
      corpo.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum cliente cadastrado.</td></tr>`;
      return;
    }

    corpo.innerHTML = clientes.map((c) => `
      <tr>
        <td>${escaparHTML(c.nome)}</td>
        <td>${escaparHTML(c.cpf)}</td>
        <td>${escaparHTML(c.email)}</td>
        <td>${escaparHTML(c.profissao)}</td>
        <td>${formatarMoeda(rendaTotal(c))}</td>
        <td class="text-end">
          <!-- link para o formulário no modo edição (?id=...) -->
          <a class="btn btn-sm btn-outline-primary" href="cadastro.html?id=${c.id}">Editar</a>
          <!-- data-* guarda o id; o clique é tratado por delegação abaixo -->
          <button class="btn btn-sm btn-outline-danger" type="button"
                  data-acao="excluir" data-id="${c.id}">Excluir</button>
        </td>
      </tr>`).join("");
  } catch (erro) {
    mostrarAlerta("Não foi possível carregar os clientes. A API está rodando?");
    console.error(erro);
  }
}

corpo.addEventListener("click", async (evento) => {
  const botao = evento.target.closest("button[data-acao='excluir']");
  if (!botao) return;

  const id = botao.dataset.id;
  if (!confirm("Excluir este cliente? Essa ação não pode ser desfeita.")) return;

  try {
    const pedidos = await api.listar("pedidos", `?clienteId=${id}`);
    if (pedidos.length > 0) {
      mostrarAlerta("Este cliente possui pedidos. Cancele/remova os pedidos antes de excluí-lo.", "warning");
      return;
    }

    await api.remover("usuarios", id);                 
    if (String(id) === String(usuario.id)) return logout(); 
    mostrarAlerta("Cliente excluído.", "success");
    carregar();
  } catch (erro) {
    mostrarAlerta("Erro ao excluir.");
    console.error(erro);
  }
});

carregar();