// js/cadastro.js
import { api } from "./api.js";
import { exigirLogin, usuarioLogado, salvarSessao } from "./auth.js";
import { mostrarAlerta, validarCPF, montarNavbar } from "./utils.js";

const MAX_RENDIMENTOS = 3;

const form = document.querySelector("#form-cliente");
const areaRendimentos = document.querySelector("#rendimentos");

const idEdicao = new URLSearchParams(location.search).get("id");

for (let i = 1; i <= MAX_RENDIMENTOS; i++) {
  areaRendimentos.insertAdjacentHTML("beforeend", `
    <div class="row g-2 mb-2">
      <div class="col-md-8">
        <input type="text" class="form-control" name="entidade${i}"
               placeholder="Entidade empregadora ${i}" aria-label="Entidade empregadora ${i}">
      </div>
      <div class="col-md-4">
        <input type="number" min="0" step="0.01" class="form-control" name="valor${i}"
               placeholder="Rendimento mensal (R$)" aria-label="Rendimento ${i}">
      </div>
    </div>`);
}

if (idEdicao) {
  const usuario = exigirLogin(["cliente", "agente"]);
  montarNavbar(usuario);

  if (usuario.tipo === "cliente" && String(usuario.id) !== String(idEdicao)) {
    location.replace("clientes.html");
  }

  document.querySelector("#titulo-pagina").textContent = "Editar cliente";
  document.querySelector("#btn-voltar").href = "clientes.html";
  form.elements.senha.required = false;
  document.querySelector("#rotulo-senha").textContent = "Nova senha (opcional)";

  try {
    const cliente = await api.buscar("usuarios", idEdicao); 
    for (const campo of ["nome", "email", "rg", "cpf", "profissao", "endereco"]) {
      form.elements[campo].value = cliente[campo] ?? "";
    }
    (cliente.rendimentos || []).forEach((r, i) => {
      form.elements[`entidade${i + 1}`].value = r.entidade;
      form.elements[`valor${i + 1}`].value = r.valor;
    });
  } catch (erro) {
    mostrarAlerta("Não foi possível carregar o cliente.");
    console.error(erro);
  }
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();                 
  form.classList.add("was-validated");     
  if (!form.checkValidity()) return;       

  const campos = form.elements;
  if (!validarCPF(campos.cpf.value)) {
    mostrarAlerta("CPF inválido.");
    return;
  }

  const rendimentos = [];
  for (let i = 1; i <= MAX_RENDIMENTOS; i++) {
    const entidade = campos[`entidade${i}`].value.trim();
    if (entidade) {
      rendimentos.push({ entidade, valor: Number(campos[`valor${i}`].value || 0) });
    }
  }

  const dados = {
    tipo: "cliente",
    nome: campos.nome.value.trim(),
    email: campos.email.value.trim().toLowerCase(),
    rg: campos.rg.value.trim(),
    cpf: campos.cpf.value.replace(/\D/g, ""),   
    profissao: campos.profissao.value.trim(),
    endereco: campos.endereco.value.trim(),
    rendimentos,
  };
  if (campos.senha.value) dados.senha = campos.senha.value;

  try {
    const todos = await api.listar("usuarios");
    const duplicado = todos.some(
      (u) =>
        String(u.id) !== String(idEdicao) &&          
        (u.email === dados.email || u.cpf === dados.cpf) 
    );
    if (duplicado) {
      mostrarAlerta("Já existe um cadastro com esse e-mail ou CPF.");
      return;
    }

    if (idEdicao) {
      await api.alterar("usuarios", idEdicao, dados);          
      const logado = usuarioLogado();
      if (String(logado.id) === String(idEdicao)) salvarSessao({ ...logado, ...dados, senha: undefined });
      mostrarAlerta("Cadastro atualizado!", "success");
    } else {
      await api.criar("usuarios", dados);                      
      mostrarAlerta("Cadastro realizado! Redirecionando para o login...", "success");
      setTimeout(() => (location.href = "index.html"), 1500);
    }
  } catch (erro) {
    mostrarAlerta("Erro ao salvar. O JSON Server está rodando na porta 3000?");
    console.error(erro);
  }
});