import { api } from "./api.js";
import { STATUS_ATIVOS, escaparHTML } from "./utils.js";

export async function buscarDisponiveis(ignorarPedidoId = null) {
  const [automoveis, pedidos] = await Promise.all([
    api.listar("automoveis"),
    api.listar("pedidos"),
  ]);

  const ocupados = new Set(
    pedidos
      .filter((p) => STATUS_ATIVOS.includes(p.status) && String(p.id) !== String(ignorarPedidoId))
      .map((p) => String(p.automovelId))
  );

  return automoveis.filter((a) => !ocupados.has(String(a.id)));
}

export function embaralhar(lista) {
  const copia = [...lista];                       
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); 
    [copia[i], copia[j]] = [copia[j], copia[i]];   
  }
  return copia;
}

export function htmlImagemCarro(carro) {
  const nome = escaparHTML(`${carro.marca} ${carro.modelo}`);
  if (carro.imagem) {
    return `<img class="img-carro" src="${escaparHTML(carro.imagem)}" alt="${nome}" loading="lazy">`;
  }
  return `<div class="img-carro img-reservada" role="img" aria-label="Imagem do ${nome}">
            Imagem do carro · ${escaparHTML(carro.categoria || "")}
          </div>`;
}

export function calcularDias(dataInicio, dataFim) {
  const [anoI, mesI, diaI] = dataInicio.split("-").map(Number);
  const [anoF, mesF, diaF] = dataFim.split("-").map(Number);

  const milissegundos = Date.UTC(anoF, mesF - 1, diaF) - Date.UTC(anoI, mesI - 1, diaI);
  const diferenca = Math.round(milissegundos / 86400000);   // ms -> dias

  return Math.max(1, diferenca);
}

export function calcularValorAluguel(carro, dias) {
  const valorBase = Number(carro.valorBase || 0);        
  const precoDiaria = Number(carro.precoDiaria || 0);    

  const valorTotal = Math.round((valorBase + precoDiaria * dias) * 100) / 100;

  return { valorBase, precoDiaria, dias, valorTotal };
}