// js/api.js
// ------------------------------------------------------------
// Camada de acesso a dados. Encapsula a Fetch API [MDN: Fetch API]
// para que as páginas nunca precisem montar URL, headers ou JSON.
// ------------------------------------------------------------

// Endereço base do JSON Server (precisa bater com --port do comando).
export const API_URL = "http://localhost:3000";

/**
 * Função genérica de requisição.
 * - async/await: espera a resposta sem travar a página [MDN: Fetch API].
 * - fetch() só "falha" (rejeita) em erro de rede; um 404 ou 500 NÃO rejeita.
 *   Por isso checamos resposta.ok manualmente e lançamos nosso próprio erro.
 */
async function requisicao(caminho, opcoes = {}) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    // Avisa o servidor que o corpo enviado é JSON.
    headers: { "Content-Type": "application/json" },
    // Espalha method/body recebidos (GET é o padrão se não vier method).
    ...opcoes,
  });

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao acessar ${caminho}`);
  }
  // DELETE pode voltar sem corpo; evitamos erro ao ler JSON vazio.
  if (resposta.status === 204) return null;

  // .json() converte o texto da resposta em objeto/array JavaScript.
  return resposta.json();
}

// Objeto "api": um método por operação do CRUD (REST).
// recurso = "usuarios" | "automoveis" | "pedidos"
export const api = {
  // READ (lista). "filtro" é a query string do JSON Server, ex.: "?tipo=cliente"
  listar: (recurso, filtro = "") => requisicao(`/${recurso}${filtro}`),

  // READ (um registro)
  buscar: (recurso, id) => requisicao(`/${recurso}/${id}`),

  // CREATE -> POST. JSON.stringify transforma o objeto em texto JSON.
  criar: (recurso, dados) =>
    requisicao(`/${recurso}`, { method: "POST", body: JSON.stringify(dados) }),

  // UPDATE parcial -> PATCH: só troca os campos enviados (o mais usado aqui).
  alterar: (recurso, id, dados) =>
    requisicao(`/${recurso}/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),

  // UPDATE total -> PUT: substitui o registro inteiro (apague os campos que
  // você não enviar). Fica disponível para o CRUD "completo" do enunciado.
  substituir: (recurso, id, dados) =>
    requisicao(`/${recurso}/${id}`, { method: "PUT", body: JSON.stringify(dados) }),

  // DELETE
  remover: (recurso, id) => requisicao(`/${recurso}/${id}`, { method: "DELETE" }),
};