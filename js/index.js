import { login } from "./auth.js";
import { mostrarAlerta } from "./utils.js";

const form = document.querySelector("#form-login");

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;

  try {
    const usuario = await login(
      form.elements.email.value.trim().toLowerCase(),
      form.elements.senha.value
    );

    if (!usuario) {
      mostrarAlerta("E-mail ou senha incorretos.");
      return;
    }
    location.href = "home.html";
  } catch (erro) {
    mostrarAlerta("Não foi possível conectar à API. O JSON Server está rodando?");
    console.error(erro);
  }
});