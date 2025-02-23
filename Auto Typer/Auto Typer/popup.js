// Quando o botão de digitar for clicado
document.getElementById("type-btn").addEventListener("click", async () => {
    let text = document.getElementById("text-input").value;

    if (text.trim() === "") {
        alert("Digite algum texto!");
        return;
    }

    // Salvar o texto e o estado da digitação
    await chrome.storage.local.set({ textToType: text, stopTyping: false });

    // Exibir o botão "Parar" e esconder o botão "Digitar"
    document.getElementById("type-btn").style.display = "none";
    document.getElementById("stop-btn").style.display = "block";

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Atraso de 2 segundos para começar a digitação
    setTimeout(() => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: digitarTexto,
            args: [text]
        });
    }, 2000); // 2000 ms = 2 segundos
});

// Quando o botão de parar for clicado
document.getElementById("stop-btn").addEventListener("click", async () => {
    await chrome.storage.local.set({ stopTyping: true });

    // Exibir o botão "Digitar" e esconder o botão "Parar"
    document.getElementById("stop-btn").style.display = "none";
    document.getElementById("type-btn").style.display = "block";

    atualizarProgresso(0); // Resetar a barra de progresso para 0%
});

// Atualiza a barra de progresso e controla a visibilidade dos botões
function atualizarProgresso(porcentagem) {
    document.getElementById("progress-bar").style.width = `${porcentagem}%`;

    if (porcentagem > 0 && porcentagem < 100) {
        document.getElementById("stop-btn").style.display = "block";
        document.getElementById("type-btn").style.display = "none";
    } else if (porcentagem === 0) {
        document.getElementById("type-btn").style.display = "block";
        document.getElementById("stop-btn").style.display = "none";
    } else if (porcentagem === 100) {
        setTimeout(() => {
            document.getElementById("stop-btn").style.display = "none";
            document.getElementById("type-btn").style.display = "block";
            document.getElementById("text-input").value = ""; // Apagar o texto ao final
            atualizarProgresso(0); // Resetar a barra de progresso para 0%

            // Remover o texto salvo no armazenamento do Chrome
            chrome.storage.local.remove(["textToType", "stopTyping"]);
        }, 1000); // 1 segundo após a conclusão
    }
}

// Função para digitar o texto no site com velocidade máxima
async function digitarTexto(text) {
    let activeElement = document.activeElement;
    if (!activeElement || !(activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable)) {
        alert("Clique em um campo de texto antes de digitar.");
        return;
    }

    activeElement.setAttribute("readonly", "true");

    let i = 0;
    let total = text.length;
    let chunkSize = 3; // Digitar 3 caracteres por vez

    async function typeNextChar() {
        let { stopTyping } = await chrome.storage.local.get("stopTyping");
        if (i < total && !stopTyping) {
            activeElement.value += text.substring(i, i + chunkSize);
            i += chunkSize;

            activeElement.scrollTop = activeElement.scrollHeight;
            activeElement.dispatchEvent(new Event("input", { bubbles: true }));

            chrome.runtime.sendMessage({ type: "updateProgress", value: (i / total) * 100 });

            Promise.resolve().then(typeNextChar); // Chamando imediatamente no próximo ciclo
        } else {
            chrome.runtime.sendMessage({ type: "updateProgress", value: 100 });

            setTimeout(() => chrome.runtime.sendMessage({ type: "updateProgress", value: 0 }), 1000);

            activeElement.removeAttribute("readonly");
        }
    }

    typeNextChar();
}

// Sempre resetar o popup ao abrir
chrome.storage.local.get(["textToType", "stopTyping"], (data) => {
    if (data.textToType && data.stopTyping === false) {
        document.getElementById("text-input").value = data.textToType;
        document.getElementById("type-btn").style.display = "none";
        document.getElementById("stop-btn").style.display = "block";
    } else {
        document.getElementById("text-input").value = ""; // Resetar texto
        document.getElementById("type-btn").style.display = "block";
        document.getElementById("stop-btn").style.display = "none";
    }
});

// Aguardar a atualização do progresso da digitação
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "updateProgress") {
        atualizarProgresso(message.value);
    }
});
